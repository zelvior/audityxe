"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User as UserIcon,
  KeyRound,
  ShieldAlert,
  Download,
  Trash2,
  Check,
  AlertCircle,
  Github,
  Mail as MailIcon,
  Sparkles,
  Gauge,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import PasswordInput from "@/components/PasswordInput";

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C41.5 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-card p-5 sm:p-6 mb-5">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="font-display font-semibold text-sm sm:text-base">{title}</h2>
      </div>
      {description && <p className="text-xs text-text-secondary mb-4">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, loading, getToken, updateDisplayName, changePassword, deleteAccount, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/settings");
  }, [loading, user, router]);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    if (user) setDisplayName(user.displayName || "");
  }, [user]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true);
    setNameError("");
    setNameSaved(false);
    try {
      await updateDisplayName(displayName);
      // Keep the server-side copy in sync too (used for admin visibility only).
      const token = await getToken();
      if (token) {
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ displayName }),
        }).catch(() => {});
      }
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to update name.");
    } finally {
      setNameSaving(false);
    }
  }

  // BYOK (Pro-only AI key for promo copy)
  const [plan, setPlan] = useState<string | null>(null);
  const [byokConfigured, setByokConfigured] = useState(false);
  const [byokMasked, setByokMasked] = useState<string | null>(null);
  const [byokKeyInput, setByokKeyInput] = useState("");
  const [byokBaseUrlInput, setByokBaseUrlInput] = useState("");
  const [byokModelInput, setByokModelInput] = useState("");
  const [byokLoading, setByokLoading] = useState(true);
  const [byokSaving, setByokSaving] = useState(false);
  const [byokSaved, setByokSaved] = useState(false);
  const [byokError, setByokError] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        setPlan(data.plan ?? null);
        setByokConfigured(!!data.byok?.configured);
        setByokMasked(data.byok?.maskedKey ?? null);
        setByokBaseUrlInput(data.byok?.baseUrl ?? "");
        setByokModelInput(data.byok?.model ?? "");
        setPsiByokConfigured(!!data.psiByok?.configured);
        setPsiByokMasked(data.psiByok?.maskedKey ?? null);
      } catch {
        // non-fatal — BYOK section just shows its empty state
      } finally {
        setByokLoading(false);
      }
    })();
  }, [user, getToken]);

  async function handleSaveByok(e: React.FormEvent) {
    e.preventDefault();
    if (!byokKeyInput.trim()) return;
    setByokSaving(true);
    setByokError("");
    setByokSaved(false);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          aiApiKey: byokKeyInput.trim(),
          aiBaseUrl: byokBaseUrlInput.trim() || undefined,
          aiModel: byokModelInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save your AI key.");
      setByokConfigured(true);
      setByokMasked(data.byok?.maskedKey ?? null);
      setByokKeyInput("");
      setByokSaved(true);
      setTimeout(() => setByokSaved(false), 2000);
    } catch (err) {
      setByokError(err instanceof Error ? err.message : "Failed to save your AI key.");
    } finally {
      setByokSaving(false);
    }
  }

  async function handleRemoveByok() {
    setByokSaving(true);
    setByokError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ aiApiKey: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove your AI key.");
      setByokConfigured(false);
      setByokMasked(null);
    } catch (err) {
      setByokError(err instanceof Error ? err.message : "Failed to remove your AI key.");
    } finally {
      setByokSaving(false);
    }
  }

  // PSI BYOK (Pro-only PageSpeed Insights API key for higher quota)
  const [psiByokConfigured, setPsiByokConfigured] = useState(false);
  const [psiByokMasked, setPsiByokMasked] = useState<string | null>(null);
  const [psiByokKeyInput, setPsiByokKeyInput] = useState("");
  const [psiByokSaving, setPsiByokSaving] = useState(false);
  const [psiByokSaved, setPsiByokSaved] = useState(false);
  const [psiByokError, setPsiByokError] = useState("");

  async function handleSavePsiByok(e: React.FormEvent) {
    e.preventDefault();
    if (!psiByokKeyInput.trim()) return;
    setPsiByokSaving(true);
    setPsiByokError("");
    setPsiByokSaved(false);
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ psiApiKey: psiByokKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save your PageSpeed key.");
      setPsiByokConfigured(true);
      setPsiByokMasked(data.psiByok?.maskedKey ?? null);
      setPsiByokKeyInput("");
      setPsiByokSaved(true);
      setTimeout(() => setPsiByokSaved(false), 2000);
    } catch (err) {
      setPsiByokError(err instanceof Error ? err.message : "Failed to save your PageSpeed key.");
    } finally {
      setPsiByokSaving(false);
    }
  }

  async function handleRemovePsiByok() {
    setPsiByokSaving(true);
    setPsiByokError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ psiApiKey: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove your PageSpeed key.");
      setPsiByokConfigured(false);
      setPsiByokMasked(null);
    } catch (err) {
      setPsiByokError(err instanceof Error ? err.message : "Failed to remove your PageSpeed key.");
    } finally {
      setPsiByokSaving(false);
    }
  }

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const hasPasswordProvider = user?.providerData.some((p) => p.providerId === "password") ?? false;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordSaved(false);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  // Data export
  const [exporting, setExporting] = useState(false);

  async function handleExportData() {
    if (!user) return;
    setExporting(true);
    try {
      const token = await getToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const accountRes = await fetch("/api/account", { headers });
      const account = await accountRes.json().catch(() => ({}));

      const exportable = {
        profile: { email: user.email, displayName: user.displayName, emailVerified: user.emailVerified, uid: user.uid },
        account,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-audit-account-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  // Delete account
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(hasPasswordProvider ? deletePassword : undefined);
      router.push("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-text-secondary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6"
          >
            <ArrowLeft size={14} /> Back to account
          </Link>

          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-6">Settings</h1>

          {/* Profile */}
          <SectionCard icon={<UserIcon size={15} className="text-primary" />} title="Profile">
            <form onSubmit={handleSaveName} className="space-y-3">
              <div>
                <label htmlFor="displayName" className="block text-xs font-mono text-text-secondary mb-1.5">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <MailIcon size={12} /> {user.email}
                {user.emailVerified && <Check size={12} className="text-emerald" />}
              </div>
              {nameError && <p className="text-xs text-rose">{nameError}</p>}
              <button
                type="submit"
                disabled={nameSaving}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-secondary hover:brightness-110 transition disabled:opacity-50"
              >
                {nameSaving ? <Loader2 size={13} className="animate-spin" /> : nameSaved ? <Check size={13} /> : null}
                {nameSaved ? "Saved" : "Save name"}
              </button>
            </form>
          </SectionCard>

          {/* BYOK — Pro-only AI key for promo copy */}
          <SectionCard
            icon={<Sparkles size={15} className="text-primary" />}
            title="AI Key for Promo Copy"
            description="Promo copy and banner generation are a Pro-plan feature that runs on your own AI key — Audityxe never spends its own AI budget on it, so this only works once a key is set."
          >
            {!byokLoading && plan !== "pro" ? (
              <div className="flex items-center justify-between gap-3 bg-surface2 border border-border rounded-input px-3.5 py-3">
                <p className="text-xs text-text-secondary">Available on the Pro plan.</p>
                <Link href="/pricing" className="text-xs font-semibold text-primary hover:underline shrink-0">
                  Upgrade
                </Link>
              </div>
            ) : byokLoading ? (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 size={13} className="animate-spin" /> Loading…
              </div>
            ) : (
              <>
                {byokConfigured && (
                  <div className="flex items-center justify-between gap-3 bg-surface2 border border-border rounded-input px-3.5 py-3 mb-4">
                    <p className="text-xs text-text-secondary font-mono">Key on file: {byokMasked}</p>
                    <button
                      onClick={handleRemoveByok}
                      disabled={byokSaving}
                      className="text-xs font-semibold text-rose hover:underline shrink-0 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <form onSubmit={handleSaveByok} className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="byokKey" className="block text-xs font-mono text-text-secondary mb-1.5">
                      {byokConfigured ? "Replace API key" : "API key"}
                    </label>
                    <PasswordInput
                      id="byokKey"
                      value={byokKeyInput}
                      onChange={(e) => setByokKeyInput(e.target.value)}
                      placeholder="sk-…"
                      autoComplete="off"
                      className="w-full bg-surface2 border border-border rounded-input px-3.5 py-2.5 text-sm font-mono outline-none focus-visible:border-primary"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="byokBaseUrl" className="block text-xs font-mono text-text-secondary mb-1.5">
                        Base URL (optional)
                      </label>
                      <input
                        id="byokBaseUrl"
                        type="text"
                        value={byokBaseUrlInput}
                        onChange={(e) => setByokBaseUrlInput(e.target.value)}
                        placeholder="https://api.tokenrouter.com/v1"
                        className="w-full bg-surface2 border border-border rounded-input px-3.5 py-2.5 text-xs font-mono outline-none focus-visible:border-primary"
                      />
                    </div>
                    <div>
                      <label htmlFor="byokModel" className="block text-xs font-mono text-text-secondary mb-1.5">
                        Model (optional)
                      </label>
                      <input
                        id="byokModel"
                        type="text"
                        value={byokModelInput}
                        onChange={(e) => setByokModelInput(e.target.value)}
                        placeholder="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
                        className="w-full bg-surface2 border border-border rounded-input px-3.5 py-2.5 text-xs font-mono outline-none focus-visible:border-primary"
                      />
                    </div>
                  </div>

                  {byokError && (
                    <div className="flex items-start gap-2 text-xs text-rose">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" /> {byokError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={byokSaving || !byokKeyInput.trim()}
                    className="self-start flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-btn bg-secondary hover:brightness-110 transition disabled:opacity-50"
                  >
                    {byokSaving ? <Loader2 size={13} className="animate-spin" /> : byokSaved ? <Check size={13} /> : null}
                    {byokSaved ? "Saved" : "Save key"}
                  </button>
                </form>
                <p className="text-[11px] text-text-secondary mt-3">
                  Any OpenAI-compatible provider works — leave Base URL/Model blank to use
                  TokenRouter's defaults. Your key is encrypted before storage and only used
                  server-side for your own promo-copy requests.
                </p>
              </>
            )}
          </SectionCard>

          {/* PSI BYOK — Pro-only PageSpeed Insights key for higher quota */}
          <SectionCard
            icon={<Gauge size={15} className="text-primary" />}
            title="PageSpeed Insights API Key"
            description="Add your own free Google Cloud PageSpeed Insights API key to raise your weekly PSI audit cap — Audityxe's shared key stays capped low to protect Google's free quota for everyone."
          >
            {!byokLoading && plan !== "pro" ? (
              <div className="flex items-center justify-between gap-3 bg-surface2 border border-border rounded-input px-3.5 py-3">
                <p className="text-xs text-text-secondary">Available on the Pro plan.</p>
                <Link href="/pricing" className="text-xs font-semibold text-primary hover:underline shrink-0">
                  Upgrade
                </Link>
              </div>
            ) : byokLoading ? (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 size={13} className="animate-spin" /> Loading…
              </div>
            ) : (
              <>
                {psiByokConfigured && (
                  <div className="flex items-center justify-between gap-3 bg-surface2 border border-border rounded-input px-3.5 py-3 mb-4">
                    <p className="text-xs text-text-secondary font-mono">Key on file: {psiByokMasked}</p>
                    <button
                      onClick={handleRemovePsiByok}
                      disabled={psiByokSaving}
                      className="text-xs font-semibold text-rose hover:underline shrink-0 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <form onSubmit={handleSavePsiByok} className="flex flex-col gap-3">
                  <div>
                    <label htmlFor="psiByokKey" className="block text-xs font-mono text-text-secondary mb-1.5">
                      {psiByokConfigured ? "Replace API key" : "API key"}
                    </label>
                    <PasswordInput
                      id="psiByokKey"
                      value={psiByokKeyInput}
                      onChange={(e) => setPsiByokKeyInput(e.target.value)}
                      placeholder="AIza…"
                      autoComplete="off"
                      className="w-full bg-surface2 border border-border rounded-input px-3.5 py-2.5 text-sm font-mono outline-none focus-visible:border-primary"
                    />
                  </div>

                  {psiByokError && (
                    <div className="flex items-start gap-2 text-xs text-rose">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" /> {psiByokError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={psiByokSaving || !psiByokKeyInput.trim()}
                    className="self-start flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-btn bg-secondary hover:brightness-110 transition disabled:opacity-50"
                  >
                    {psiByokSaving ? <Loader2 size={13} className="animate-spin" /> : psiByokSaved ? <Check size={13} /> : null}
                    {psiByokSaved ? "Saved" : "Save key"}
                  </button>
                </form>
                <p className="text-[11px] text-text-secondary mt-3">
                  Get a free key with no billing required from Google Cloud Console (enable the
                  "PageSpeed Insights API"). Your key is encrypted before storage and only used
                  server-side for your own PSI requests.
                </p>
              </>
            )}
          </SectionCard>

          <SectionCard
            icon={<KeyRound size={15} className="text-primary" />}
            title="Security"
            description="Linked sign-in methods and password."
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {user.providerData.map((p) => (
                <span
                  key={p.providerId}
                  className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full glass"
                >
                  {p.providerId === "google.com" && <GoogleIcon />}
                  {p.providerId === "github.com" && <Github size={12} />}
                  {p.providerId === "password" && <KeyRound size={11} />}
                  {p.providerId === "google.com" ? "Google" : p.providerId === "github.com" ? "GitHub" : "Email/Password"}
                </span>
              ))}
            </div>

            {hasPasswordProvider ? (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <PasswordInput
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
                />
                <PasswordInput
                  placeholder="New password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
                />
                {passwordError && <p className="text-xs text-rose">{passwordError}</p>}
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg glass hover:border-black/15 transition disabled:opacity-50"
                >
                  {passwordSaving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : passwordSaved ? (
                    <Check size={13} className="text-emerald" />
                  ) : null}
                  {passwordSaved ? "Password changed" : "Change password"}
                </button>
              </form>
            ) : (
              <p className="text-xs text-text-secondary">
                You signed in via a federated provider — manage your password with that provider
                directly.
              </p>
            )}
          </SectionCard>

          {/* Plan */}
          <SectionCard icon={<ShieldAlert size={15} className="text-primary" />} title="Plan & billing">
            <p className="text-xs text-text-secondary mb-3">
              Manage usage, view your history, or upgrade from the account and pricing pages.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/account" className="text-xs font-mono text-primary hover:underline">
                View usage & history →
              </Link>
              <Link href="/pricing" className="text-xs font-mono text-primary hover:underline">
                See plans →
              </Link>
            </div>
          </SectionCard>

          {/* Data & Privacy */}
          <SectionCard
            icon={<Download size={15} className="text-primary" />}
            title="Data & privacy"
            description="Export everything Audityxe has on your account, or permanently delete it."
          >
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg glass hover:border-black/15 transition disabled:opacity-50 mb-3"
            >
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Export my data (JSON)
            </button>

            <div className="border-t border-border/60 pt-4 mt-2">
              <p className="text-xs font-semibold text-rose mb-2">Danger zone</p>
              {!deleteConfirmOpen ? (
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg glass text-rose hover:bg-rose/10 transition"
                >
                  <Trash2 size={13} />
                  Delete my account
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-text-secondary flex items-start gap-1.5">
                    <AlertCircle size={13} className="text-rose mt-0.5 shrink-0" />
                    This permanently deletes your account, usage history, and every saved report.
                    This can't be undone.
                  </p>
                  {hasPasswordProvider && (
                    <PasswordInput
                      placeholder="Confirm your password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-rose"
                    />
                  )}
                  {deleteError && <p className="text-xs text-rose">{deleteError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || (hasPasswordProvider && !deletePassword)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-rose text-white hover:brightness-110 transition disabled:opacity-50"
                    >
                      {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Yes, permanently delete
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmOpen(false);
                        setDeleteError("");
                        setDeletePassword("");
                      }}
                      className="text-xs font-medium px-4 py-2 rounded-lg glass hover:border-black/15 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <button
            onClick={async () => {
              try {
                await signOut();
              } catch {
                // Best-effort — still navigate away even if sign-out itself fails.
              }
              router.push("/");
            }}
            className="w-full text-center py-3 rounded-card glass text-sm font-medium text-text-secondary hover:text-primary transition"
          >
            Sign out
          </button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
