"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LayoutDashboard, Users, Wallet, FileText, Database, ShieldAlert, Megaphone, Activity } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PasswordInput from "@/components/PasswordInput";
import { useAuth } from "@/context/AuthContext";

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}
export type AdminApi = <T = any>(url: string, init?: { method?: string; body?: unknown }) => Promise<ApiResult<T>>;

const Ctx = createContext<AdminApi | null>(null);
export const useAdminApi = () => {
  const api = useContext(Ctx);
  if (!api) throw new Error("useAdminApi must be used inside <AdminShell>");
  return api;
};

// Kept at module level so moving between admin pages (client-side navigation)
// doesn't ask for the password again, yet it never touches storage and
// vanishes on a full reload / tab close.
let rememberedPassword = "";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/retention", label: "Data retention", icon: Database },
  { href: "/admin/abuse", label: "Abuse", icon: ShieldAlert },
  { href: "/admin/announcement", label: "Banner", icon: Megaphone },
  { href: "/admin/activity", label: "Activity", icon: Activity },
] as const;

export default function AdminShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<"checking" | "password" | "denied" | "ready">("checking");
  const [denyMsg, setDenyMsg] = useState("");
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(rememberedPassword);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`);
  }, [loading, user, router, pathname]);

  const api: AdminApi = useCallback(
    async (url, init) => {
      const token = await getToken();
      try {
        const res = await fetch(url, {
          method: init?.method || "GET",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordRef.current },
          body: init?.body === undefined ? undefined : JSON.stringify(init.body),
        });
        const data = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, data, error: res.ok ? null : data?.error || `Request failed (${res.status})` };
      } catch {
        return { ok: false, status: 0, data: null, error: "Network error — check your connection." };
      }
    },
    [getToken]
  );

  const tryEnter = useCallback(
    async (password: string) => {
      passwordRef.current = password;
      const r = await api("/api/admin/session");
      if (r.ok) {
        rememberedPassword = password;
        setPhase("ready");
        return true;
      }
      if (r.data?.code === "NOT_ADMIN") {
        setDenyMsg(`Signed in as ${user?.email || "unknown"} — this address isn't in ADMIN_EMAILS.`);
        setPhase("denied");
      } else if (r.status === 403 || r.status === 429) {
        setPwError(password ? r.error || "Incorrect admin password." : "");
        setPhase("password");
      } else {
        setDenyMsg(r.error || "Couldn't verify your admin access.");
        setPhase("denied");
      }
      return false;
    },
    [api, user?.email]
  );

  useEffect(() => {
    if (loading || !user || phase !== "checking") return;
    tryEnter(passwordRef.current);
  }, [loading, user, phase, tryEnter]);

  if (loading || !user || phase === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-text-secondary" />
      </main>
    );
  }

  if (phase === "denied") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-card p-6 max-w-sm text-center">
          <p className="text-sm font-semibold mb-2 text-rose">Admin access denied</p>
          <p className="text-xs text-text-secondary">{denyMsg}</p>
        </div>
      </main>
    );
  }

  if (phase === "password") {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-4">
          <form
            className="glass rounded-card p-6 w-full max-w-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!pwInput.trim() || busy) return;
              setBusy(true);
              setPwError("");
              await tryEnter(pwInput);
              setBusy(false);
            }}
          >
            <label htmlFor="admin-pw" className="text-sm font-semibold mb-3 block">
              Admin password required
            </label>
            <PasswordInput
              id="admin-pw"
              value={pwInput}
              onChange={(e) => setPwInput(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary/50"
              disabled={busy}
            />
            {pwError && <p role="alert" className="text-xs text-rose mb-3">{pwError}</p>}
            <button type="submit" disabled={busy || !pwInput.trim()} className="w-full py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : "Continue"}
            </button>
          </form>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <Ctx.Provider value={api}>
      <Header />
      <main className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <nav aria-label="Admin sections" className="flex gap-1.5 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold border transition ${active ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-text-secondary hover:text-text-primary hover:border-[rgb(var(--color-text-primary)/0.25)]"}`}
                >
                  <Icon size={13} /> {label}
                </Link>
              );
            })}
          </nav>
          <h1 className="font-display font-bold text-2xl mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-text-secondary mb-6">{subtitle}</p>}
          {children}
        </div>
      </main>
      <Footer />
    </Ctx.Provider>
  );
}
