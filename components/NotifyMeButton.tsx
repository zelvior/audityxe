"use client";

import { useState } from "react";
import { Bell, BellRing, Check, AlertCircle } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer;
}

/**
 * "Notify me when it's ready" for a background audit job (see
 * lib/audit-jobs.ts, lib/push.ts, app/api/audit/start/route.ts). This is
 * the part of the background-audit flow that survives the browser being
 * fully closed, not just the tab being backgrounded — polling alone
 * can't do that, since there's no JS left running once every tab is
 * closed. Deliberately optional and separate from starting the job
 * itself: a person who just wants to leave the tab open and glance back
 * later doesn't need to grant a notification permission at all.
 */
export default function NotifyMeButton({ jobId, token }: { jobId: string; token: string }) {
  const [state, setState] = useState<"idle" | "requesting" | "subscribed" | "denied" | "unsupported" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleClick() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setState("unsupported");
      return;
    }

    setState("requesting");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const raw = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
        throw new Error("Browser returned an incomplete push subscription.");
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          token,
          subscription: { endpoint: raw.endpoint, keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth } },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't register for notifications.");

      setState("subscribed");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Couldn't set up notifications.");
      setState("error");
    }
  }

  if (state === "subscribed") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald">
        <Check size={13} /> We'll notify you when it's ready — you can close this tab.
      </span>
    );
  }
  if (state === "unsupported") {
    return <span className="text-xs text-text-secondary">Push notifications aren't supported in this browser.</span>;
  }
  if (state === "denied") {
    return <span className="text-xs text-text-secondary">Notification permission was denied — you can still leave this tab open, it'll finish either way.</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "requesting"}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-btn border border-border hover:border-primary hover:text-primary transition disabled:opacity-50"
      >
        {state === "requesting" ? <BellRing size={13} className="animate-pulse" /> : <Bell size={13} />}
        Notify me when it's ready
      </button>
      {state === "error" && (
        <p className="flex items-center gap-1.5 text-[11px] text-rose mt-1.5">
          <AlertCircle size={11} className="shrink-0" /> {errorMsg}
        </p>
      )}
    </div>
  );
}
