import supabase from "./supabase";

export function urlBase64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== "string") {
    throw new Error("VAPID_KEY_MISSING");
  }
  const cleanStr = base64String.trim();
  if (!cleanStr) {
    throw new Error("VAPID_KEY_MISSING");
  }
  const padding = "=".repeat((4 - (cleanStr.length % 4)) % 4);
  const base64 = (cleanStr + padding).replace(/-/g, "+").replace(/_/g, "/");
  try {
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (err) {
    throw new Error("VAPID_KEY_INVALID");
  }
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

export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

export async function enablePush(userId) {
  if (!userId) throw new Error("User ID is required to enable push notifications");

  // 1. Check browser support
  if (!isPushSupported()) {
    throw new Error("UNSUPPORTED");
  }

  // 2. Call Notification.requestPermission() FIRST directly from click handler
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("PERMISSION_" + permission.toUpperCase());
  }

  // 3. Register SW and await ready wrapped in a 10-second timeout
  let registration;
  try {
    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.error("SW registration failed:", err);
    throw new Error("SW_NOT_ACTIVE");
  }

  const readyPromise = navigator.serviceWorker.ready;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("SW_NOT_ACTIVE")), 10000)
  );

  try {
    registration = await Promise.race([readyPromise, timeoutPromise]);
  } catch (err) {
    console.error("SW ready timeout or error:", err);
    throw err instanceof Error && err.message === "SW_NOT_ACTIVE"
      ? err
      : new Error("SW_NOT_ACTIVE");
  }

  // 4. Read VAPID public key from env var
  const rawVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!rawVapidKey || !rawVapidKey.trim()) {
    throw new Error("VAPID_KEY_MISSING");
  }

  let applicationServerKey;
  try {
    applicationServerKey = urlBase64ToUint8Array(rawVapidKey);
  } catch (err) {
    throw new Error("VAPID_KEY_INVALID");
  }

  if (applicationServerKey.length !== 65) {
    throw new Error("VAPID_KEY_INVALID");
  }

  // 5 & 6. Call reg.pushManager.subscribe
  let subscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
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
          applicationServerKey,
        });
      } catch (retryErr) {
        console.error("Retry subscribe error:", retryErr.name, retryErr.message);
        throw new Error(`PUSH_${retryErr.name}: ${retryErr.message}`);
      }
    } else {
      console.error("pushManager.subscribe error:", e.name, e.message);
      throw new Error(`PUSH_${e.name}: ${e.message}`);
    }
  }

  if (!subscription) {
    throw new Error("PUSH_UnknownError: Failed to obtain subscription.");
  }

  // 8. Upsert subscription into push_subscriptions
  const jsonSub = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh = jsonSub.keys?.p256dh || "";
  const auth = jsonSub.keys?.auth || "";

  const { error: subError } = await supabase
    .from("push_subscriptions")
    .upsert(
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

  // Upsert master switch preference
  await supabase
    .from("notification_preferences")
    .upsert(
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
    } catch (err) {
      console.warn("disablePush error:", err);
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
    const registration = await registerServiceWorker();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    const rawVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!subscription && rawVapidKey && rawVapidKey.trim()) {
      let convertedKey;
      try {
        convertedKey = urlBase64ToUint8Array(rawVapidKey);
      } catch (e) {
        return;
      }
      if (convertedKey.length !== 65) return;

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

export async function debugPush() {
  if (typeof window === "undefined") return;
  console.group("Push Diagnostic Tool (debugPush)");
  console.log("isSecureContext:", window.isSecureContext);
  console.log(
    "Notification.permission:",
    typeof Notification !== "undefined" ? Notification.permission : "N/A"
  );
  console.log("PushManager presence:", "PushManager" in window);

  try {
    const swRes = await fetch("/sw.js");
    console.log("/sw.js fetch status:", swRes.status, swRes.statusText);
    console.log("/sw.js Content-Type:", swRes.headers.get("content-type"));
  } catch (err) {
    console.error("/sw.js fetch error:", err);
  }

  const rawKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!rawKey) {
    console.log("VAPID key:", "MISSING in import.meta.env.VITE_VAPID_PUBLIC_KEY");
  } else {
    try {
      const bytes = urlBase64ToUint8Array(rawKey);
      console.log("VAPID key byte length:", bytes.length);
    } catch (err) {
      console.error("VAPID key conversion error:", err.message);
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      console.log(
        "SW registration state:",
        reg ? (reg.active ? "active" : reg.installing ? "installing" : "waiting") : "None"
      );
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        console.log("Existing PushSubscription:", sub ? sub.toJSON() : null);
      }
    } catch (err) {
      console.error("Error inspecting SW registration:", err);
    }
  } else {
    console.log("SW supported:", false);
  }
  console.groupEnd();
}

if (
  typeof window !== "undefined" &&
  (import.meta.env.DEV || import.meta.env.MODE === "development")
) {
  window.debugPush = debugPush;
}
