"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { registerDevice, setDeviceAuthContext } from "@/lib/device-client";

/** Registers this browser with the abuse-protection graph on every page
 * load and sign-in change (links the account to the device), and shows the
 * restriction notice if the device/network/account is currently banned. */
export default function DeviceGuard() {
  const { user, loading, getToken, signOut } = useAuth();
  const [blockedMsg, setBlockedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    setDeviceAuthContext(getToken, user?.uid || null);
    let cancelled = false;
    (async () => {
      const out = await registerDevice(getToken, user?.uid || null);
      if (cancelled || !out.blocked) return;
      setBlockedMsg(out.blocked.message);
      await signOut().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, loading, getToken, signOut]);

  if (!blockedMsg) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="glass rounded-card p-6 max-w-sm w-full text-center">
        <p className="text-sm font-semibold mb-2">Access restricted</p>
        <p className="text-sm text-text-secondary mb-4">{blockedMsg}</p>
        <button onClick={() => (window.location.href = "/")} className="px-4 py-2 rounded-card bg-primary text-white text-sm font-semibold">
          Return to homepage
        </button>
      </div>
    </div>
  );
}
