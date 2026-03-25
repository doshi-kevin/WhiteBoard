// Client-side Web Push utilities (browser only — never import in server code)

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

function keyToBase64(key: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

async function syncSubscription(sub: PushSubscription): Promise<void> {
  const p256dh = sub.getKey("p256dh");
  const auth = sub.getKey("auth");
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: p256dh ? keyToBase64(p256dh) : "",
      auth: auth ? keyToBase64(auth) : "",
    }),
  });
}

export async function getSubscriptionState(): Promise<"unsupported" | "denied" | "default" | "subscribed"> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) return "subscribed";
    }
  } catch {
    // ignore
  }
  return "default";
}

export async function subscribe(): Promise<boolean> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
    }
    await syncSubscription(sub);
    return true;
  } catch (err) {
    console.error("Push subscribe failed:", err);
    return false;
  }
}

export async function unsubscribe(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  } catch (err) {
    console.error("Push unsubscribe failed:", err);
  }
}
