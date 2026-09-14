"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetch-json";

/**
 * Mounted once at the root. Pings /api/account whenever a user session
 * appears — that route runs through requireAuth, which now enforces
 * moderation status server-side. A banned/suspended account gets a 403
 * with a specific `code`, which is all this component needs to show a
 * clear alert and force a clean sign-out — the actual enforcement lives
 * in lib/auth-server.ts, not here, so this is purely a UX layer.
 */
export default function ModerationGuard() {
  const { user, getToken, signOut } = useAuth();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const token = await getToken();
      const { status, data } = await fetchJson<{ error?: string; code?: string }>("/api/account", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (cancelled) return;
      if (status === 403 && (data?.code === "ACCOUNT_BANNED" || data?.code === "ACCOUNT_SUSPENDED")) {
        setAlertMessage(data.error || "Your account access has been restricted.");
        await signOut().catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, getToken, signOut]);

  if (!alertMessage) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="glass rounded-card p-6 max-w-sm w-full text-center">
        <p className="text-sm font-semibold mb-2">Account restricted</p>
        <p className="text-sm text-text-secondary mb-4">{alertMessage}</p>
        <button
          onClick={() => (window.location.href = "/")}
          className="px-4 py-2 rounded-card bg-primary text-white text-sm font-semibold"
        >
          Return to homepage
        </button>
      </div>
    </div>
  );
}
