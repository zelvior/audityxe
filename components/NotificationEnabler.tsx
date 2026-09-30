"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { PushStatus, currentPushStatus, enablePush, syncPushSubscription } from "@/lib/push-client";

/** Required notification permission step. `onSatisfied` fires once
 * notifications are on — or can't be required (unsupported browser /
 * server without VAPID keys), so nobody is ever permanently stuck. */
export default function NotificationEnabler({ onSatisfied }: { onSatisfied: (satisfied: boolean) => void }) {
  const { getToken, user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("needs-permission");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function apply(next: PushStatus) {
    setStatus(next);
    onSatisfied(next === "ready" || next === "unsupported" || next === "unavailable");
  }

  useEffect(() => {
    const initial = currentPushStatus();
    if (initial === "ready" && user) {
      syncPushSubscription(getToken).then(apply).catch(() => apply("ready"));
    } else {
      apply(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleEnable() {
    setBusy(true);
    setError("");
    try {
      apply(await enablePush(getToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set up notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "ready") {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald">
        <Check size={16} /> Notifications are on — you'll be alerted every time an audit completes.
      </p>
    );
  }
  if (status === "unsupported" || status === "unavailable") {
    return (
      <p className="text-sm text-text-secondary">
        This browser or deployment can't receive push notifications, so this step isn't required here. You can continue.
      </p>
    );
  }
  if (status === "denied") {
    return (
      <div className="space-y-3">
        <p className="flex items-start gap-2 text-sm text-rose">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          Notifications are blocked for this site. Allow them in your browser's site settings (the lock icon next to the address bar), then re-check.
        </p>
        <button
          type="button"
          onClick={() => apply(currentPushStatus())}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn border border-border text-sm font-semibold hover:border-primary hover:text-primary transition"
        >
          I've allowed it — re-check
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleEnable}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn bg-secondary text-sm font-semibold hover:brightness-110 transition disabled:opacity-50"
      >
        {busy ? <BellRing size={16} className="animate-pulse" /> : <Bell size={16} />}
        Enable notifications
      </button>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose">
          <AlertCircle size={12} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
