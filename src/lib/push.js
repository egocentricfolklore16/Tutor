import supabase from "./supabase";

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIosNeedingInstall() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = ("standalone" in navigator && navigator.standalone) || window.matchMedia("(display-mode: standalone)").matches;
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

  if (isIosNeedingInstall()) {
    throw new Error("iOS requires adding Hyper Tutor to your Home Screen before enabling notifications.");
  }

  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported by this browser.");
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error("Service Worker registration failed.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied by user.");
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn("VITE_VAPID_PUBLIC_KEY is not defined in environment variables.");
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription && vapidPublicKey) {
    const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
  }

  if (!subscription) {
    throw new Error("Could not obtain PushSubscription.");
  }

  const jsonSub = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh = jsonSub.keys?.p256dh || "";
  const auth = jsonSub.keys?.auth || "";

  // Upsert subscription into push_subscriptions
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
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe().catch((err) => console.warn("Failed to unsubscribe locally:", err));

      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
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
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

    if (!subscription && vapidPublicKey) {
      // Re-subscribe if subscription dropped/expired
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
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
      // Confirm subscription exists in DB
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
