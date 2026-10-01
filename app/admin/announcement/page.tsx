"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Megaphone } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import PasswordInput from "@/components/PasswordInput";
import { fetchJson } from "@/lib/fetch-json";

interface Announcement {
  active: boolean;
  message: string;
  level: "info" | "warning";
  startsAt: string | null;
  endsAt: string | null;
}

/** <input type="datetime-local"> works in local time with no timezone
 * suffix; Firestore/the API store ISO UTC. These convert between the
 * two without pulling in a date library for two one-line conversions. */
function isoToLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputValueToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminAnnouncementPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();

  const [denyReason, setDenyReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordEntered, setPasswordEntered] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<"info" | "warning">("info");
  const [active, setActive] = useState(false);
  const [startsAt, setStartsAt] = useState(""); // datetime-local string, local time
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/admin/announcement");
  }, [loading, user, router]);

  useEffect(() => {
    if (!denyReason) return;
    const t = setTimeout(() => router.replace("/account"), 6000);
    return () => clearTimeout(t);
  }, [denyReason, router]);

  const fetchCurrent = useCallback(
    async (pw: string) => {
      if (!user) return;
      try {
        const token = await getToken();
        const { ok, status, data, error } = await fetchJson<{ announcement: Announcement; code?: string }>(
          "/api/admin/announcement",
          { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": pw } }
        );
        if (status === 403) {
          if ((data as any)?.code === "NOT_ADMIN") {
            setDenyReason(
              `Signed in as ${user.email || "unknown email"} — this address isn't in ADMIN_EMAILS. Add it (comma-separated) in your Vercel env vars and redeploy.`
            );
            return;
          }
          setPasswordError(error || "Incorrect admin password.");
          return;
        }
        if (status === 429) {
          setPasswordError(error || "Too many attempts. Try again later.");
          return;
        }
        if (status === 401) {
          setDenyReason("Your session couldn't be verified — try signing out and back in. If this persists, the server's Firebase Admin credentials may be misconfigured.");
          return;
        }
        if (!ok || !data) throw new Error(error || "Couldn't load announcement.");
        setIsAdmin(true);
        setMessage(data.announcement.message);
        setLevel(data.announcement.level);
        setActive(data.announcement.active);
        setStartsAt(isoToLocalInputValue(data.announcement.startsAt));
        setEndsAt(isoToLocalInputValue(data.announcement.endsAt));
      } catch (err) {
        setPasswordError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setCheckingPassword(false);
      }
    },
    [user, getToken]
  );

  const submitPassword = useCallback(() => {
    if (!adminPassword.trim() || checkingPassword) return;
    setCheckingPassword(true);
    setPasswordError("");
    setPasswordEntered(adminPassword);
    fetchCurrent(adminPassword);
  }, [adminPassword, checkingPassword, fetchCurrent]);

  const save = useCallback(
    async (nextActive: boolean) => {
      setSaving(true);
      setSaveError("");
      setSaved(false);
      try {
        const token = await getToken();
        const { ok, error } = await fetchJson("/api/admin/announcement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-admin-password": passwordEntered,
          },
          body: JSON.stringify({
            message,
            level,
            active: nextActive,
            startsAt: localInputValueToIso(startsAt),
            endsAt: localInputValueToIso(endsAt),
          }),
        });
        if (!ok) throw new Error(error || "Failed to save.");
        setActive(nextActive);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSaving(false);
      }
    },
    [getToken, passwordEntered, message, level, startsAt, endsAt]
  );

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-text-secondary" />
      </main>
    );
  }

  if (denyReason) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-card p-6 max-w-sm text-center">
          <p className="text-sm font-semibold mb-2 text-rose">Admin access denied</p>
          <p className="text-xs text-text-secondary mb-4">{denyReason}</p>
          <p className="text-xs text-text-secondary/60">Redirecting to your account in a few seconds…</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="glass rounded-card p-6 w-full max-w-sm">
            <span className="text-sm font-semibold mb-3 block">Admin password required</span>
            <PasswordInput
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              placeholder="Password"
              autoFocus
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary/50"
              disabled={checkingPassword}
            />
            {passwordError && <p className="text-xs text-rose mb-3">{passwordError}</p>}
            <button
              onClick={submitPassword}
              disabled={checkingPassword || !adminPassword.trim()}
              className="w-full py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkingPassword ? <Loader2 size={14} className="animate-spin" /> : "Continue"}
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20 px-4 max-w-2xl mx-auto">
        <Link href="/account" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
          <ArrowLeft size={16} /> Back to account
        </Link>

        <h1 className="font-display font-bold text-2xl mb-1 flex items-center gap-2">
          <Megaphone size={20} className="text-primary" /> Site Announcement
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Shows as a dismissible banner at the top of every page for every visitor.
        </p>

        <div className="glass rounded-card p-5 sm:p-6">
          <label className="text-xs text-text-secondary block mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={280}
            rows={3}
            placeholder="e.g. Scheduled maintenance tonight 11pm–1am UTC — audits may be briefly unavailable."
            className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-1 focus:outline-none focus:border-primary/50 resize-none"
          />
          <p className="text-xs text-text-secondary/60 mb-4">{message.length}/280</p>

          <label className="text-xs text-text-secondary block mb-1">Style</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as "info" | "warning")}
            className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary/50"
          >
            <option value="info">Info (brand color)</option>
            <option value="warning">Warning (amber)</option>
          </select>

          <label className="text-xs text-text-secondary block mb-1">Schedule (optional)</label>
          <p className="text-xs text-text-secondary/70 mb-2">
            Leave either blank for no limit. Times are your local timezone — converted to UTC on save.
            The banner only shows while <span className="font-medium">Active</span> is on <em>and</em> the current
            time falls inside this window.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
            <div>
              <span className="text-[11px] text-text-secondary/70 block mb-1">Starts showing</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <span className="text-[11px] text-text-secondary/70 block mb-1">Stops showing</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
          {(() => {
            const s = localInputValueToIso(startsAt);
            const e = localInputValueToIso(endsAt);
            if (s && e && new Date(e) <= new Date(s)) {
              return <p className="text-xs text-rose mb-4">Stop time must be after the start time.</p>;
            }
            const now = new Date();
            const notYetStarted = s && now < new Date(s);
            const alreadyEnded = e && now >= new Date(e);
            if (active && (notYetStarted || alreadyEnded)) {
              return (
                <p className="text-xs text-amber mb-4">
                  {notYetStarted
                    ? `Active, but scheduled to start ${new Date(s!).toLocaleString()} — not visible to visitors yet.`
                    : `Active, but the schedule already ended ${new Date(e!).toLocaleString()} — no longer visible to visitors.`}
                </p>
              );
            }
            return <div className="mb-4" />;
          })()}

          {saveError && <p className="text-xs text-rose mb-3">{saveError}</p>}
          {saved && <p className="text-xs text-emerald mb-3">Saved.</p>}

          <div className="flex gap-2">
            <button
              onClick={() => save(true)}
              disabled={saving || !message.trim()}
              className="flex-1 py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : active ? "Update & keep live" : "Publish"}
            </button>
            {active && (
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="px-4 py-2 rounded-card glass text-sm font-semibold disabled:opacity-50"
              >
                Take down
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
