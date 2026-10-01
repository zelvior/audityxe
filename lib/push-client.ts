"use client";

export type PushStatus = "unsupported" | "needs-permission" | "denied" | "ready" | "unavailable";

function vapidKey(): string | undefined {
  return process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!vapidKey()
  );
}

export function currentPushStatus(): PushStatus {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "granted") return "ready";
  return "needs-permission";
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

/** Ensures a browser push subscription exists and is registered against
 * the signed-in account on the server. Idempotent — safe on every load. */
export async function syncPushSubscription(getToken: () => Promise<string | null>): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission !== "granted") return currentPushStatus();

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey() as string),
    }));

  const raw = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) throw new Error("Browser returned an incomplete push subscription.");

  const token = await getToken();
  if (!token) return "ready"; // signed out — PushGate re-syncs after sign-in

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: { endpoint: raw.endpoint, keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth } } }),
  });
  if (res.status === 503) return "unavailable"; // server has no VAPID keys — don't lock anyone out
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Couldn't register for notifications.");
  }
  return "ready";
}

/** Prompts for permission (must be called from a user gesture), then subscribes. */
export async function enablePush(getToken: () => Promise<string | null>): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "needs-permission";
  return syncPushSubscription(getToken);
}
