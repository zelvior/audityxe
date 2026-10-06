import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase/admin";
import { paginate, toIso, type Page, type WhereClause } from "./admin-paginate";
import type { PlanId } from "./plans";

type AnyDb = any;

/** Days of access one successful payment buys. */
export const PERIOD_DAYS = 30;

export type PaymentState = "paid" | "refunded" | "failed" | "expired" | "partially_paid";
/** NOWPayments statuses that end in no money for us and are worth surfacing to an admin. */
export const FAILURE_STATUSES = new Set(["failed", "expired", "partially_paid", "refunded"]);

export const stateOfStatus = (status: string): PaymentState =>
  status === "refunded" ? "refunded" : status === "expired" ? "expired" : status === "partially_paid" ? "partially_paid" : "failed";

export interface PaymentRecord {
  id: string;
  uid: string | null;
  plan: string;
  state: PaymentState | "unknown";
  status: string;
  credited: boolean;
  amountUsd: number;
  orderId: string;
  subscriptionId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  creditedAt: string | null;
  refund: { at: string | null; by: string | null; amountUsd: number; reason: string | null; revokedAccess: boolean } | null;
  manualCredit: { at: string | null; by: string | null } | null;
  note: string | null;
  dismissed: boolean;
}

export function toPayment(id: string, d: Record<string, unknown>): PaymentRecord {
  const credited = d.credited === true;
  const stored = typeof d.state === "string" ? (d.state as PaymentState) : null;
  const refund = d.refund && typeof d.refund === "object" ? (d.refund as Record<string, unknown>) : null;
  const mc = d.manualCredit && typeof d.manualCredit === "object" ? (d.manualCredit as Record<string, unknown>) : null;
  return {
    id,
    uid: typeof d.uid === "string" ? d.uid : null,
    plan: String(d.plan || ""),
    state: refund ? "refunded" : stored || (credited ? "paid" : "unknown"),
    status: String(d.status || (credited ? "finished" : "")),
    credited,
    amountUsd: Number(d.amountUsd) || 0,
    orderId: String(d.orderId || ""),
    subscriptionId: typeof d.subscriptionId === "string" ? d.subscriptionId : null,
    createdAt: toIso(d.createdAt) || toIso(d.creditedAt),
    updatedAt: toIso(d.updatedAt) || toIso(d.creditedAt),
    creditedAt: toIso(d.creditedAt),
    refund: refund
      ? { at: toIso(refund.at), by: (refund.by as string) || null, amountUsd: Number(refund.amountUsd) || 0, reason: (refund.reason as string) || null, revokedAccess: refund.revokedAccess === true }
      : null,
    manualCredit: mc ? { at: toIso(mc.at), by: (mc.by as string) || null } : null,
    note: typeof d.note === "string" ? d.note : null,
    dismissed: d.dismissed === true,
  };
}

/** Stack a purchase onto remaining time instead of overwriting it. Tolerates
 * Firestore Timestamps, ISO strings, junk, and null. */
export function computeNewExpiry(currentExpiry: unknown, days: number, now: Date = new Date()): Date {
  const cur: Date | null =
    currentExpiry && typeof (currentExpiry as { toDate?: unknown }).toDate === "function"
      ? (currentExpiry as Timestamp).toDate()
      : currentExpiry
      ? new Date(currentExpiry as string)
      : null;
  const base = cur && !isNaN(cur.getTime()) && cur > now ? cur : now;
  return new Date(base.getTime() + days * 86_400_000);
}

export interface CreditInput {
  paymentId: string;
  uid: string;
  plan: Exclude<PlanId, "free">;
  status: string;
  amountUsd: number;
  orderId: string;
  subscriptionId: string | null;
  days?: number;
  /** set when an admin credits a payment by hand */
  manualBy?: string;
}

/** Idempotent: crediting an already-credited payment is a no-op. */
export async function creditPayment(db: AnyDb, input: CreditInput, now: Date = new Date()): Promise<"credited" | "already" | "refunded"> {
  const paymentRef = db.collection("crypto_payments").doc(input.paymentId);
  const userRef = db.collection("users").doc(input.uid);
  return db.runTransaction(async (tx: any) => {
    const existing = await tx.get(paymentRef);
    const ex = existing.exists ? existing.data() : null;
    if (ex?.credited) return "already" as const;
    if (ex?.state === "refunded" || ex?.refund) return "refunded" as const;
    const userSnap = await tx.get(userRef);
    const newExpiry = computeNewExpiry(userSnap.data()?.planExpiresAt, input.days ?? PERIOD_DAYS, now);
    tx.set(userRef, { plan: input.plan, planExpiresAt: newExpiry.toISOString() }, { merge: true });
    tx.set(
      paymentRef,
      {
        credited: true,
        state: "paid",
        uid: input.uid,
        plan: input.plan,
        status: input.status,
        amountUsd: input.amountUsd,
        orderId: input.orderId,
        subscriptionId: input.subscriptionId,
        createdAt: ex?.createdAt || now.toISOString(),
        creditedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ...(input.manualBy ? { manualCredit: { at: now.toISOString(), by: input.manualBy } } : {}),
      },
      { merge: true }
    );
    return "credited" as const;
  });
}

export interface NonCreditedInput {
  paymentId: string;
  uid: string | null;
  plan: string;
  status: string;
  amountUsd: number;
  orderId: string;
  subscriptionId: string | null;
}

/** Records a failed/expired/partial/refunded notification WITHOUT granting access. */
export async function recordNonCredited(db: AnyDb, input: NonCreditedInput, now: Date = new Date()): Promise<void> {
  const ref = db.collection("crypto_payments").doc(input.paymentId);
  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const ex = snap.exists ? snap.data() : null;
    const iso = now.toISOString();
    if (ex?.credited) {
      // The processor refunded a payment we had already credited — surface it,
      // but leave the decision to revoke access to an admin.
      if (input.status === "refunded" && !ex.refund) {
        tx.set(ref, { state: "refunded", status: "refunded", updatedAt: iso, refund: { at: iso, by: "nowpayments", amountUsd: Number(ex.amountUsd) || input.amountUsd, reason: "Refunded by the payment processor", revokedAccess: false } }, { merge: true });
      }
      return;
    }
    tx.set(
      ref,
      { credited: false, state: stateOfStatus(input.status), status: input.status, uid: input.uid, plan: input.plan, amountUsd: input.amountUsd, orderId: input.orderId, subscriptionId: input.subscriptionId, createdAt: ex?.createdAt || iso, updatedAt: iso },
      { merge: true }
    );
  });
}

export type RefundResult = { ok: true; revoked: boolean } | { ok: false; error: string };

/** Marks a credited payment refunded (the money itself is returned from the
 * NOWPayments dashboard — there is no refund API for crypto). Optionally takes
 * back the access that payment bought. */
export async function refundPayment(db: AnyDb, args: { paymentId: string; amountUsd?: number; reason?: string; revokeAccess: boolean; actor: string }, now: Date = new Date()): Promise<RefundResult> {
  const paymentRef = db.collection("crypto_payments").doc(args.paymentId);
  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(paymentRef);
    if (!snap.exists) return { ok: false as const, error: "Payment not found." };
    const p = snap.data();
    if (p.refund || p.state === "refunded") return { ok: false as const, error: "This payment was already refunded." };
    if (!p.credited) return { ok: false as const, error: "Only a credited (paid) payment can be refunded." };
    const paid = Number(p.amountUsd) || 0;
    const amount = args.amountUsd === undefined ? paid : Number(args.amountUsd);
    if (!Number.isFinite(amount) || amount <= 0 || amount > paid) return { ok: false as const, error: `Refund must be more than $0 and at most $${paid}.` };

    let revoked = false;
    if (args.revokeAccess && p.uid) {
      const userRef = db.collection("users").doc(p.uid);
      const userSnap = await tx.get(userRef);
      if (userSnap.exists) {
        const cur = userSnap.data().planExpiresAt;
        const curDate: Date | null = cur && typeof cur.toDate === "function" ? cur.toDate() : cur ? new Date(cur) : null;
        if (curDate && !isNaN(curDate.getTime())) {
          const reduced = new Date(curDate.getTime() - PERIOD_DAYS * 86_400_000);
          if (reduced.getTime() <= now.getTime()) tx.set(userRef, { plan: "free", planExpiresAt: null }, { merge: true });
          else tx.set(userRef, { planExpiresAt: reduced.toISOString() }, { merge: true });
          revoked = true;
        }
      }
    }
    tx.set(paymentRef, { state: "refunded", status: "refunded", updatedAt: now.toISOString(), refund: { at: now.toISOString(), by: args.actor, amountUsd: amount, reason: (args.reason || "").slice(0, 300) || null, revokedAccess: revoked } }, { merge: true });
    return { ok: true as const, revoked };
  });
}

/** Takes back the access a processor-refunded payment bought (admin follow-up). */
export async function revokeRefundedAccess(db: AnyDb, paymentId: string, actor: string, now: Date = new Date()): Promise<RefundResult> {
  const paymentRef = db.collection("crypto_payments").doc(paymentId);
  return db.runTransaction(async (tx: any) => {
    const snap = await tx.get(paymentRef);
    if (!snap.exists) return { ok: false as const, error: "Payment not found." };
    const p = snap.data();
    if (!p.refund) return { ok: false as const, error: "Refund this payment first." };
    if (p.refund.revokedAccess) return { ok: false as const, error: "Access was already revoked." };
    if (!p.uid) return { ok: false as const, error: "No account is linked to this payment." };
    const userRef = db.collection("users").doc(p.uid);
    const userSnap = await tx.get(userRef);
    let revoked = false;
    if (userSnap.exists) {
      const cur = userSnap.data().planExpiresAt;
      const curDate: Date | null = cur && typeof cur.toDate === "function" ? cur.toDate() : cur ? new Date(cur) : null;
      if (curDate && !isNaN(curDate.getTime())) {
        const reduced = new Date(curDate.getTime() - PERIOD_DAYS * 86_400_000);
        if (reduced.getTime() <= now.getTime()) tx.set(userRef, { plan: "free", planExpiresAt: null }, { merge: true });
        else tx.set(userRef, { planExpiresAt: reduced.toISOString() }, { merge: true });
        revoked = true;
      }
    }
    tx.set(paymentRef, { updatedAt: now.toISOString(), refund: { ...p.refund, revokedAccess: revoked, revokedBy: actor } }, { merge: true });
    return { ok: true as const, revoked };
  });
}

export async function setPaymentNote(db: AnyDb, paymentId: string, note: string | null, dismissed: boolean | undefined): Promise<boolean> {
  const ref = db.collection("crypto_payments").doc(paymentId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.set({ note: note ? note.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, 500) : null, ...(dismissed === undefined ? {} : { dismissed }), updatedAt: new Date().toISOString() }, { merge: true });
  return true;
}

export interface PaymentListQuery {
  state?: PaymentState | "";
  uid?: string;
  cursor?: string | null;
  limit?: number;
}

export async function listPayments(db: AnyDb, q: PaymentListQuery): Promise<Page<PaymentRecord>> {
  const where: WhereClause[] = [];
  if (q.state) where.push(["state", "==", q.state]);
  if (q.uid) where.push(["uid", "==", q.uid]);
  return paginate<PaymentRecord>(db, { collection: "crypto_payments", orderField: "updatedAt", direction: "desc", where, limit: q.limit, cursor: q.cursor, map: toPayment });
}

/** One-time upgrade for records written before `state` / `updatedAt` existed,
 * so they appear in the (indexed) admin list. Safe to re-run. */
export async function backfillPayments(db: AnyDb, maxPages = 10): Promise<{ updated: number }> {
  let updated = 0;
  let last: unknown = null;
  for (let i = 0; i < maxPages; i++) {
    let q = db.collection("crypto_payments").orderBy("creditedAt", "asc").limit(400);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    const batch = db.batch();
    let n = 0;
    for (const d of snap.docs) {
      const x = d.data();
      if (x.updatedAt === undefined || x.state === undefined) {
        batch.set(d.ref, { updatedAt: x.updatedAt ?? x.creditedAt ?? new Date().toISOString(), state: x.state ?? (x.credited ? "paid" : "failed"), createdAt: x.createdAt ?? x.creditedAt ?? new Date().toISOString() }, { merge: true });
        n++;
      }
    }
    if (n) await batch.commit();
    updated += n;
    last = snap.docs[snap.docs.length - 1].data().creditedAt;
    if (snap.size < 400) break;
  }
  return { updated };
}

// ---- commission / fees & summary ------------------------------------------

export interface CommerceConfig {
  commissionPercent: number;
  flatFeeUsd: number;
  label: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}
export const DEFAULT_COMMERCE: CommerceConfig = { commissionPercent: 0, flatFeeUsd: 0, label: "Processor / partner commission" };

export function normalizeCommerce(raw: unknown): CommerceConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pct = typeof r.commissionPercent === "number" && r.commissionPercent >= 0 && r.commissionPercent <= 100 ? r.commissionPercent : 0;
  const flat = typeof r.flatFeeUsd === "number" && r.flatFeeUsd >= 0 && r.flatFeeUsd <= 1000 ? r.flatFeeUsd : 0;
  return { commissionPercent: pct, flatFeeUsd: flat, label: typeof r.label === "string" && r.label.trim() ? r.label.slice(0, 60) : DEFAULT_COMMERCE.label, updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null, updatedBy: typeof r.updatedBy === "string" ? r.updatedBy : null };
}

export function validateCommerce(input: { commissionPercent?: unknown; flatFeeUsd?: unknown; label?: unknown }): { ok: true; value: Pick<CommerceConfig, "commissionPercent" | "flatFeeUsd" | "label"> } | { ok: false; error: string } {
  const pct = Number(input.commissionPercent), flat = Number(input.flatFeeUsd ?? 0);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { ok: false, error: "Commission must be between 0 and 100 %." };
  if (!Number.isFinite(flat) || flat < 0 || flat > 1000) return { ok: false, error: "Flat fee must be between $0 and $1,000." };
  const label = typeof input.label === "string" && input.label.trim() ? input.label.trim().slice(0, 60) : DEFAULT_COMMERCE.label;
  return { ok: true, value: { commissionPercent: Math.round(pct * 100) / 100, flatFeeUsd: Math.round(flat * 100) / 100, label } };
}

export async function getCommerce(db: AnyDb = adminDb()): Promise<CommerceConfig> {
  const s = await db.collection("config").doc("commerce").get();
  return normalizeCommerce(s.exists ? s.data() : null);
}
export async function saveCommerce(db: AnyDb, input: Parameters<typeof validateCommerce>[0], actor: string) {
  const v = validateCommerce(input);
  if (!v.ok) return v;
  const value = { ...v.value, updatedAt: new Date().toISOString(), updatedBy: actor };
  await db.collection("config").doc("commerce").set(value);
  return { ok: true as const, value: normalizeCommerce(value) };
}

export interface PaymentsSummary {
  days: number;
  scanned: number;
  /** true when more than `cap` records fall in the window, so figures are a lower bound */
  truncated: boolean;
  paidCount: number;
  grossUsd: number;
  refundedCount: number;
  refundedUsd: number;
  failedCount: number;
  commissionUsd: number;
  netUsd: number;
  byPlan: Record<string, { count: number; grossUsd: number }>;
  commission: CommerceConfig;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function paymentsSummary(db: AnyDb, days = 30, cap = 2000, now: Date = new Date()): Promise<PaymentsSummary> {
  const since = new Date(now.getTime() - days * 86_400_000).toISOString();
  const [commission, snap] = await Promise.all([
    getCommerce(db),
    db.collection("crypto_payments").where("updatedAt", ">=", since).orderBy("updatedAt", "desc").limit(cap + 1).get(),
  ]);
  const docs = snap.docs.slice(0, cap);
  let paidCount = 0, grossUsd = 0, refundedCount = 0, refundedUsd = 0, failedCount = 0;
  const byPlan: PaymentsSummary["byPlan"] = {};
  for (const d of docs) {
    const p = toPayment(d.id, d.data());
    if (p.refund) { refundedCount++; refundedUsd += p.refund.amountUsd; }
    if (p.credited) {
      paidCount++; grossUsd += p.amountUsd;
      byPlan[p.plan] = { count: (byPlan[p.plan]?.count || 0) + 1, grossUsd: round2((byPlan[p.plan]?.grossUsd || 0) + p.amountUsd) };
    } else if (p.state === "failed" || p.state === "expired" || p.state === "partially_paid") failedCount++;
  }
  const commissionUsd = round2((grossUsd * commission.commissionPercent) / 100 + paidCount * commission.flatFeeUsd);
  return { days, scanned: docs.length, truncated: snap.docs.length > cap, paidCount, grossUsd: round2(grossUsd), refundedCount, refundedUsd: round2(refundedUsd), failedCount, commissionUsd, netUsd: round2(grossUsd - refundedUsd - commissionUsd), byPlan, commission };
}
