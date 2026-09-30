"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { currentPushStatus, syncPushSubscription } from "@/lib/push-client";

const EXEMPT_PREFIXES = [
  "/onboarding", "/login", "/register", "/verify-email", "/forgot-password", "/maintenance", "/offline",
  "/privacy", "/terms", "/cookies", "/contact", "/refund-policy", "/disclaimer", "/acceptable-use",
  "/dpa", "/license", "/third-party-services",
];

/** Notifications are required: a signed-in, verified account without
 * notification permission is sent to the onboarding notification step.
 * When permission is granted, the subscription is (re)registered on the
 * server on every session so audit-complete pushes always have a target. */
export default function PushGate() {
  const { user, loading, needsEmailVerification, getToken } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user || needsEmailVerification) return;
    const status = currentPushStatus();

    if (status === "ready") {
      if (syncedFor.current !== user.uid) {
        syncedFor.current = user.uid;
        syncPushSubscription(getToken).catch(() => {
          syncedFor.current = null;
        });
      }
      return;
    }
    if (status !== "needs-permission" && status !== "denied") return;

    const path = pathname || "/";
    if (EXEMPT_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return;
    router.replace(`/onboarding/notifications?next=${encodeURIComponent(path)}`);
  }, [user, loading, needsEmailVerification, pathname, router, getToken]);

  return null;
}
