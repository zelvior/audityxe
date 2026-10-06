import assert from "node:assert/strict";
import { FakeFirestore } from "./_fake-firestore";
import { creditPayment, recordNonCredited, refundPayment, revokeRefundedAccess, listPayments, paymentsSummary, saveCommerce, setPaymentNote, backfillPayments, computeNewExpiry, toPayment, validateCommerce } from "../lib/payments";

(async () => {
  const NOW = new Date("2026-10-04T12:00:00Z");
  const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);
  const db = new FakeFirestore() as any;
  db.seed("users", "u1", { plan: "free", planExpiresAt: null });
  db.seed("users", "u2", { plan: "pro", planExpiresAt: day(40).toISOString() });
  const base = (id: string, uid: string) => ({ paymentId: id, uid, plan: "pro" as const, status: "finished", amountUsd: 15, orderId: `${uid}:pro:1`, subscriptionId: null });

  // expiry stacking incl. Firestore-Timestamp-like, ISO, junk
  assert.equal(computeNewExpiry(null, 30, NOW).toISOString(), day(30).toISOString());
  assert.equal(computeNewExpiry(day(10).toISOString(), 30, NOW).toISOString(), day(40).toISOString());
  assert.equal(computeNewExpiry("garbage", 30, NOW).toISOString(), day(30).toISOString());
  assert.equal(computeNewExpiry(day(-5).toISOString(), 30, NOW).toISOString(), day(30).toISOString(), "expired access restarts from now");

  // credit is idempotent (NOWPayments retries)
  assert.equal(await creditPayment(db, base("p1", "u1"), NOW), "credited");
  assert.equal(await creditPayment(db, base("p1", "u1"), NOW), "already");
  assert.equal(db._store("users").get("u1").plan, "pro"); assert.equal(db._store("users").get("u1").planExpiresAt, day(30).toISOString(), "30 days granted once, not twice");
  assert.equal(db._store("crypto_payments").get("p1").state, "paid");

  // failed / expired / partial are recorded, never credited
  await recordNonCredited(db, { paymentId: "f1", uid: "u1", plan: "pro", status: "failed", amountUsd: 15, orderId: "u1:pro:2", subscriptionId: null }, NOW);
  await recordNonCredited(db, { paymentId: "e1", uid: "u2", plan: "pro", status: "expired", amountUsd: 15, orderId: "u2:pro:3", subscriptionId: null }, NOW);
  await recordNonCredited(db, { paymentId: "pp1", uid: "u2", plan: "pro", status: "partially_paid", amountUsd: 15, orderId: "u2:pro:4", subscriptionId: null }, NOW);
  assert.equal(db._store("crypto_payments").get("f1").credited, false);
  assert.equal(db._store("users").get("u2").planExpiresAt, day(40).toISOString(), "a failed payment grants nothing");
  // a failure notification arriving AFTER a successful credit must not undo it
  await recordNonCredited(db, { paymentId: "p1", uid: "u1", plan: "pro", status: "failed", amountUsd: 15, orderId: "x", subscriptionId: null }, NOW);
  assert.equal(db._store("crypto_payments").get("p1").credited, true);
  // ...and a later 'finished' for a previously-failed record credits it normally
  assert.equal(await creditPayment(db, base("f1", "u1"), NOW), "credited");
  assert.equal(db._store("users").get("u1").planExpiresAt, day(60).toISOString(), "stacked on top of the first 30 days");
  db._store("crypto_payments").delete("f1");
  await recordNonCredited(db, { paymentId: "f1", uid: "u1", plan: "pro", status: "failed", amountUsd: 15, orderId: "u1:pro:2", subscriptionId: null }, NOW);
  db._store("users").get("u1").planExpiresAt = day(30).toISOString();

  // refund: full amount, access revoked (30d off 30d -> back to free)
  let r = await refundPayment(db, { paymentId: "p1", reason: "customer request", revokeAccess: true, actor: "admin@x.io" }, NOW);
  assert.deepEqual(r, { ok: true, revoked: true });
  assert.equal(db._store("users").get("u1").plan, "free"); assert.equal(db._store("users").get("u1").planExpiresAt, null);
  const pay = toPayment("p1", db._store("crypto_payments").get("p1"));
  assert.equal(pay.state, "refunded"); assert.equal(pay.refund!.amountUsd, 15); assert.equal(pay.refund!.by, "admin@x.io"); assert.equal(pay.refund!.revokedAccess, true);
  // can't refund twice / refund unpaid / over-refund
  assert.equal((await refundPayment(db, { paymentId: "p1", revokeAccess: false, actor: "a" }, NOW)).ok, false);
  assert.equal((await refundPayment(db, { paymentId: "e1", revokeAccess: false, actor: "a" }, NOW)).ok, false);
  await creditPayment(db, base("p2", "u2"), NOW);
  assert.equal((await refundPayment(db, { paymentId: "p2", amountUsd: 99, revokeAccess: false, actor: "a" }, NOW)).ok, false, "over-refund rejected");
  // partial refund, keep access
  r = await refundPayment(db, { paymentId: "p2", amountUsd: 5, revokeAccess: false, actor: "admin@x.io" }, NOW);
  assert.deepEqual(r, { ok: true, revoked: false }); assert.equal(db._store("users").get("u2").plan, "pro");
  // revoking only one period off a longer plan keeps the rest (u2 has 70d after stacking -> 40d)
  assert.equal(db._store("users").get("u2").planExpiresAt, day(70).toISOString());
  assert.equal((await revokeRefundedAccess(db, "p2", "admin@x.io", NOW)).ok, true);
  assert.equal(db._store("users").get("u2").planExpiresAt, day(40).toISOString());
  assert.equal((await revokeRefundedAccess(db, "p2", "admin@x.io", NOW)).ok, false, "revoke once only");
  // refunded payments can't be re-credited by a manual credit
  assert.equal(await creditPayment(db, base("p1", "u1"), NOW), "already");

  // processor-side refund of a credited payment is flagged, access left to the admin
  await creditPayment(db, base("p3", "u2"), NOW);
  await recordNonCredited(db, { paymentId: "p3", uid: "u2", plan: "pro", status: "refunded", amountUsd: 15, orderId: "x", subscriptionId: null }, NOW);
  assert.equal(toPayment("p3", db._store("crypto_payments").get("p3")).refund!.by, "nowpayments");

  // manual credit of a failed payment records who did it
  assert.equal(await creditPayment(db, { ...base("e1", "u2"), manualBy: "admin@x.io" }, NOW), "credited");
  assert.equal(toPayment("e1", db._store("crypto_payments").get("e1")).manualCredit!.by, "admin@x.io");

  // notes / dismiss
  assert.equal(await setPaymentNote(db, "pp1", "customer underpaid; emailed", true), true);
  assert.equal(toPayment("pp1", db._store("crypto_payments").get("pp1")).dismissed, true);
  assert.equal(await setPaymentNote(db, "nope", "x", true), false);

  // listing + filters + pagination over a large history
  for (let i = 0; i < 700; i++) db.seed("crypto_payments", `bulk${i}`, { credited: i % 3 !== 0, state: i % 3 !== 0 ? "paid" : "failed", uid: `user${i % 20}`, plan: "standard", amountUsd: 5, updatedAt: new Date(NOW.getTime() - i * 60_000).toISOString(), creditedAt: new Date(NOW.getTime() - i * 60_000).toISOString() });
  let cursor: string | null = null, total = 0, pages = 0; const ids = new Set<string>();
  do { const p: any = await listPayments(db, { limit: 100, cursor }); p.items.forEach((x: any) => ids.add(x.id)); total += p.items.length; cursor = p.nextCursor; pages++; } while (cursor);
  assert.equal(total, ids.size); assert.ok(total >= 705);
  const failed = await listPayments(db, { state: "failed", limit: 200 }); assert.ok(failed.items.length > 0 && failed.items.every((x) => x.state === "failed"));
  assert.ok((await listPayments(db, { uid: "user3", limit: 200 })).items.every((x) => x.uid === "user3"));

  // legacy records (no state/updatedAt) are invisible to the indexed list until backfilled
  for (let i = 0; i < 5; i++) db.seed("crypto_payments", `legacy${i}`, { credited: true, uid: "u9", plan: "pro", amountUsd: 15, creditedAt: new Date(NOW.getTime() - (900 + i) * 86_400_000).toISOString() });
  const before = (await listPayments(db, { uid: "u9", limit: 50 })).items.length; assert.equal(before, 0);
  assert.equal((await backfillPayments(db)).updated >= 5, true);
  const afterB = await listPayments(db, { uid: "u9", limit: 50 }); assert.equal(afterB.items.length, 5); assert.ok(afterB.items.every((x) => x.state === "paid"));

  // commission config + summary
  assert.equal(validateCommerce({ commissionPercent: 120 }).ok, false); assert.equal(validateCommerce({ commissionPercent: -1 }).ok, false); assert.equal(validateCommerce({ commissionPercent: 5, flatFeeUsd: 5000 }).ok, false);
  const saved: any = await saveCommerce(db, { commissionPercent: 10, flatFeeUsd: 0.5, label: "NOWPayments fee" }, "admin@x.io"); assert.ok(saved.ok);
  const sum = await paymentsSummary(db, 30, 5000, NOW);
  const paidDocs = [...db._store("crypto_payments").values()].filter((d: any) => d.credited && new Date(d.updatedAt) >= new Date(NOW.getTime() - 30 * 86_400_000));
  assert.equal(sum.paidCount, paidDocs.length);
  assert.equal(sum.grossUsd, Math.round(paidDocs.reduce((a: number, d: any) => a + d.amountUsd, 0) * 100) / 100);
  assert.equal(sum.commissionUsd, Math.round((sum.grossUsd * 0.1 + sum.paidCount * 0.5) * 100) / 100);
  assert.equal(sum.netUsd, Math.round((sum.grossUsd - sum.refundedUsd - sum.commissionUsd) * 100) / 100);
  assert.ok(sum.refundedCount >= 2 && sum.failedCount > 0 && !sum.truncated);
  assert.equal((await paymentsSummary(db, 30, 50, NOW)).truncated, true, "flags when the cap cuts the window");
  console.log("payments tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
