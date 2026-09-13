import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin, isAdminIdentity } from "@/lib/admin";
import { banUser, suspendUser, unbanUser, adminSetUserPlan, adminResetUsage } from "@/lib/user-moderation";
import { adminAuth } from "@/lib/firebase/admin";
import { logAdminAction } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS = ["ban", "suspend", "unban", "set-plan", "reset-usage", "revoke-sessions"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

export async function POST(req: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);

    const target = decodeURIComponent(params.uid || "").trim().slice(0, 200);
    if (!target) return NextResponse.json({ error: "Missing target user." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const action: Action | undefined = ALLOWED_ACTIONS.includes(body?.action) ? body.action : undefined;
    if (!action) return NextResponse.json({ error: "Invalid action." }, { status: 400 });

    // Never let an admin lock themselves out, and never let one admin
    // action another admin's account through this endpoint — prevents
    // both accidental self-lockout and one compromised admin session
    // from disabling the others.
    const targetUser = target.includes("@") ? await adminAuth().getUserByEmail(target).catch(() => null) : null;
    const targetEmail = targetUser?.email?.toLowerCase() || (target.includes("@") ? target.toLowerCase() : null);
    if (targetEmail && identity.email && targetEmail === identity.email.toLowerCase()) {
      return NextResponse.json({ error: "You can't take moderation actions on your own account." }, { status: 400 });
    }
    if (targetEmail && isAdminIdentity({ uid: "", email: targetEmail, emailVerified: true })) {
      return NextResponse.json({ error: "Admin accounts can't be moderated through this panel." }, { status: 400 });
    }

    let logDetails: string | null = null;
    if (action === "ban") {
      const reason = typeof body?.reason === "string" ? body.reason : "";
      await banUser(target, reason, identity.email || "unknown");
      logDetails = reason || null;
    } else if (action === "suspend") {
      const until = typeof body?.until === "string" ? body.until : "";
      const reason = typeof body?.reason === "string" ? body.reason : "";
      if (!until) return NextResponse.json({ error: "A suspension end date is required." }, { status: 400 });
      await suspendUser(target, until, reason, identity.email || "unknown");
      logDetails = `until ${until}${reason ? ` — ${reason}` : ""}`;
    } else if (action === "unban") {
      await unbanUser(target, identity.email || "unknown");
    } else if (action === "set-plan") {
      const plan = body?.plan;
      const expiresAt = typeof body?.expiresAt === "string" ? body.expiresAt : null;
      const resolvedUid = targetUser?.uid || target;
      await adminSetUserPlan(resolvedUid, plan, expiresAt);
      logDetails = `${plan}${expiresAt ? ` until ${expiresAt}` : " (no expiry)"}`;
    } else if (action === "reset-usage") {
      const resolvedUid = targetUser?.uid || target;
      await adminResetUsage(resolvedUid);
    } else {
      // revoke-sessions — invalidates every existing refresh token for
      // this account, so any device currently signed in is forced to
      // re-authenticate on its next token refresh. Useful on its own
      // (suspected compromised account) and as a companion to ban, since
      // a token minted just before a ban can otherwise still work until
      // it naturally expires.
      const resolvedUid = targetUser?.uid || target;
      await adminAuth().revokeRefreshTokens(resolvedUid);
    }

    await logAdminAction(identity.email || "unknown", `user_${action.replace(/-/g, "_")}`, targetEmail || target, logDetails);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
