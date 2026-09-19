import supabase from "./supabase";

export function urlBase64ToUint8Array(base64String) {
  const str = (base64String || "").trim();
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function formatPushError(error) {
  if (!error) return null;
  const msg = typeof error === "string" ? error : error.message || "";

  if (msg.includes("UNSUPPORTED")) {
    return "This browser doesn't support push notifications.";
  }
  if (msg.includes("PERMISSION_DENIED")) {
    return "Notifications are blocked. Click the padlock in the address bar and set Notifications to Allow.";
  }
  if (msg.includes("PERMISSION_DEFAULT")) {
    return "Notification permission prompt was closed. Click enable to try again.";
  }
  if (msg.includes("SW_NOT_ACTIVE")) {
    return "The notification service didn't start. Refresh the page and try again.";
  }
  if (msg.includes("VAPID_KEY_MISSING") || msg.includes("VAPID_KEY_INVALID")) {
    return "Notifications are misconfigured. Please contact support.";
  }
  if (msg.includes("PUSH_AbortError") || msg.includes("AbortError")) {
    return "Your browser couldn't reach its push service. Check your network, VPN or ad-blocker; in Brave, enable Google services for push messaging.";
  }

  if (import.meta.env.DEV) {
    return msg;
  }
  return "An error occurred while setting up notifications. Please try again.";
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosNeedingInstall() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone =
    ("standalone" in navigator && navigator.standalone) ||
    window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !isStandalone;
}

export function getPermissionState() {
  if (!isPushSupported()) {
    return isIosNeedingInstall() ? "ios-install-needed" : "unsupported";
  }
  return Notification.permission;
}

export async function enablePush(userId) {
  if (!userId) throw new Error("User ID is required to enable push notifications");

  // Step 1: Support Check
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("UNSUPPORTED");
  }

  // Step 2: Request Permission directly in click handler (no prior awaits)
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(`PERMISSION_${permission.toUpperCase()}`);
  }

  // Step 3: Register SW & await ready with 10s timeout
  let registration;
  try {
    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("SW_NOT_ACTIVE")), 10000)
    );
    await Promise.race([readyPromise, timeoutPromise]);
  } catch (swErr) {
    if (swErr.message === "SW_NOT_ACTIVE") throw swErr;
    throw new Error("SW_NOT_ACTIVE");
  }

  // Step 4: VAPID Key validation
  const rawKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPublicKey = rawKey ? rawKey.trim() : "";
  if (!vapidPublicKey) {
    throw new Error("VAPID_KEY_MISSING");
  }

  let convertedKey;
  try {
    convertedKey = urlBase64ToUint8Array(vapidPublicKey);
  } catch (e) {
    throw new Error("VAPID_KEY_INVALID");
  }

  if (convertedKey.length !== 65) {
    throw new Error("VAPID_KEY_INVALID");
  }

  // Step 5 & 6: Subscribe with InvalidStateError retry
  let subscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
  } catch (e) {
    if (e.name === "InvalidStateError") {
      try {
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await existing.unsubscribe();
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      } catch (retryErr) {
        console.error(retryErr.name, retryErr.message);
        throw new Error(`PUSH_${retryErr.name}: ${retryErr.message}`);
      }
    } else {
      console.error(e.name, e.message);
      throw new Error(`PUSH_${e.name}: ${e.message}`);
    }
  }

  // Step 8: Upsert subscription into DB
  const jsonSub = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh = jsonSub.keys?.p256dh || "";
  const auth = jsonSub.keys?.auth || "";

  const { error: subError } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      last_seen_at: new Date().toISOString(),
      failure_count: 0,
    },
    { onConflict: "endpoint" }
  );

  if (subError) {
    console.error("Failed to save push subscription to DB:", subError);
    throw subError;
  }

  await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      push_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return subscription;
}

export async function disablePush(userId) {
  if (!userId) return;

  if (isPushSupported()) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe().catch((err) => console.warn("Failed to unsubscribe locally:", err));
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
    } catch (e) {
      console.warn("disablePush error:", e);
    }
  }

  await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      push_enabled: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function syncSubscription(userId) {
  if (!userId || !isPushSupported() || Notification.permission !== "granted") return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    const rawKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const vapidPublicKey = rawKey ? rawKey.trim() : "";

    if (!subscription && vapidPublicKey) {
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      if (convertedKey.length === 65) {
        const newSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        const jsonSub = newSub.toJSON();
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: newSub.endpoint,
            p256dh: jsonSub.keys?.p256dh || "",
            auth: jsonSub.keys?.auth || "",
            user_agent: navigator.userAgent,
            last_seen_at: new Date().toISOString(),
            failure_count: 0,
          },
          { onConflict: "endpoint" }
        );
      }
    } else if (subscription) {
      const jsonSub = subscription.toJSON();
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: jsonSub.keys?.p256dh || "",
          auth: jsonSub.keys?.auth || "",
          user_agent: navigator.userAgent,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
    }
  } catch (err) {
    console.warn("syncSubscription error:", err);
  }
}

// Dev-only diagnostic tool
if (import.meta.env.DEV && typeof window !== "undefined") {
  window.debugPush = async () => {
    const isSecureContext = window.isSecureContext;
    const notificationPermission = typeof Notification !== "undefined" ? Notification.permission : "N/A";
    const pushManagerPresence = typeof window !== "undefined" && "PushManager" in window;
    let swFetchStatus = "N/A";
    let swContentType = "N/A";
    try {
      const res = await fetch("/sw.js");
      swFetchStatus = res.status;
      swContentType = res.headers.get("content-type");
    } catch (e) {
      swFetchStatus = `Fetch failed: ${e.message}`;
    }

    const rawKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const trimmedKey = rawKey ? rawKey.trim() : "";
    let keyByteLength = 0;
    try {
      if (trimmedKey) {
        keyByteLength = urlBase64ToUint8Array(trimmedKey).length;
      }
    } catch (e) {
      keyByteLength = `Error: ${e.message}`;
    }

    let swState = "N/A";
    let existingSub = null;
    if ("serviceWorker" in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        swState = {
          activeState: reg?.active?.state || null,
          installing: Boolean(reg?.installing),
          waiting: Boolean(reg?.waiting),
        };
        existingSub = reg ? await reg.pushManager.getSubscription() : null;
      } catch (e) {
        swState = `Error: ${e.message}`;
      }
    }

    const report = {
      isSecureContext,
      notificationPermission,
      pushManagerPresence,
      swFetchStatus,
      swContentType,
      vapidKeyByteLength: keyByteLength,
      swState,
      existingSubscription: existingSub ? existingSub.endpoint : null,
    };

    console.log("=== debugPush Report ===", report);
    return report;
  };
}
