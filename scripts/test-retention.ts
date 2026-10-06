import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { FakeFirestore } from "./_fake-firestore";
import { REGISTRY, resolveRetention, validateRetentionUpdate, cutoffFor, PROTECTED_COLLECTIONS } from "../lib/retention-core";
import { runRetention, saveRetention, collectStats, getRetention } from "../lib/retention";

(async () => {
  const NOW = new Date("2026-10-04T12:00:00Z");
  const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

  // --- registry safety ---
  for (const p of REGISTRY) assert.ok(!PROTECTED_COLLECTIONS.includes(p.collection), `${p.collection} must not be deletable`);
  assert.ok(["users", "config", "redeemCodes", "counters", "dailyStats", "pushSubscriptions", "showcase_submissions"].every((c) => PROTECTED_COLLECTIONS.includes(c)));

  // --- defaults + overlay + clamping ---
  const d = resolveRetention(null);
  assert.equal(d.policies.find((p) => p.id === "audits")!.ttlDays, 90);
  assert.equal(d.policies.find((p) => p.id === "cryptoPayments")!.enabled, false, "financial records are opt-in");
  const o = resolveRetention({ policies: { audits: { ttlDays: 30 }, auditJobs: { enabled: false }, usage: { ttlDays: 99999 }, abuseRl: { ttlDays: 5 } } });
  assert.equal(o.policies.find((p) => p.id === "audits")!.ttlDays, 30);
  assert.equal(o.policies.find((p) => p.id === "auditJobs")!.enabled, false);
  assert.equal(o.policies.find((p) => p.id === "usage")!.ttlDays, 365, "clamped to max");
  assert.equal(o.policies.find((p) => p.id === "abuseRl")!.ttlDays, 0, "locked policies ignore stored ttl");

  // --- validation ---
  assert.equal(validateRetentionUpdate({ policies: { nope: { ttlDays: 5 } } }, null).ok, false);
  assert.equal(validateRetentionUpdate({ policies: { audits: { ttlDays: 0 } } }, null).ok, false, "below min");
  assert.equal(validateRetentionUpdate({ policies: { audits: { ttlDays: "abc" } } }, null).ok, false);
  assert.equal(validateRetentionUpdate({ policies: { audits: { enabled: "yes" } } }, null).ok, false);
  assert.equal(validateRetentionUpdate({ policies: { abuseBans: { ttlDays: 3 } } }, null).ok, false, "locked");
  assert.equal(validateRetentionUpdate({ policies: { users: { ttlDays: 3 } } }, null).ok, false, "users is not in the registry");
  assert.equal(validateRetentionUpdate({ unverifiedUsers: { ttlDays: 500 } }, null).ok, false);
  const good = validateRetentionUpdate({ policies: { audits: { ttlDays: 45, enabled: true } }, unverifiedUsers: { ttlDays: 14 } }, { policies: { usage: { ttlDays: 20 } } });
  assert.ok(good.ok && good.value.policies!.usage.ttlDays === 20 && good.value.policies!.audits.ttlDays === 45 && good.value.unverifiedUsers!.ttlDays === 14, "edits merge, existing settings kept");

  // --- cutoffs by field type ---
  assert.equal(cutoffFor({ fieldType: "date", ttlDays: 30 }, NOW), "2026-09-04");
  assert.equal(cutoffFor({ fieldType: "iso", ttlDays: 1 }, NOW), "2026-10-03T12:00:00.000Z");

  // --- end-to-end deletion against the fake DB ---
  const db = new FakeFirestore();
  for (let i = 0; i < 950; i++) db.seed("audits", `a${i}`, { createdAt: Timestamp.fromDate(daysAgo(i < 700 ? 120 : 10)), url: "x" }); // 700 expired, 250 fresh
  for (let i = 0; i < 5; i++) db.seed("auditJobs", `j${i}`, { createdAt: daysAgo(i < 3 ? 3 : 0).toISOString() });
  db.seed("usage", "old", { date: "2026-08-01", count: 2 }); db.seed("usage", "new", { date: "2026-10-04", count: 1 });
  db.seed("abuse_bans", "perm", { until: null, expireAt: null });          // permanent ban: no expiry
  db.seed("abuse_bans", "lapsed", { expireAt: Timestamp.fromDate(daysAgo(2)) });
  db.seed("abuse_bans", "live", { expireAt: Timestamp.fromDate(new Date(NOW.getTime() + 86_400_000)) });
  db.seed("crypto_payments", "pay1", { updatedAt: daysAgo(4000).toISOString() });
  for (let i = 0; i < 4; i++) db.seed("users", `u${i}`, { createdAt: Timestamp.fromDate(daysAgo(900)) });
  db.seed("config", "retention", { policies: {} });

  const summary = await runRetention({ db, now: NOW });
  assert.equal(summary.results.audits.deleted, 700);
  assert.equal(db._store("audits").size, 250, "fresh audits survive");
  assert.equal(summary.results.auditJobs.deleted, 3);
  assert.equal(db._store("usage").size, 1); assert.ok(db._store("usage").has("new"));
  assert.ok(db._store("abuse_bans").has("perm") && db._store("abuse_bans").has("live") && !db._store("abuse_bans").has("lapsed"), "only lapsed bans removed; permanent + live kept");
  assert.equal(db._store("crypto_payments").size, 1, "payments are never auto-deleted unless explicitly enabled");
  assert.equal(db._store("users").size, 4, "users are never touched");
  assert.equal(summary.results.cryptoPayments.skipped, "disabled");
  assert.ok((db._store("config").get("retention_status") as { ranAt: string }).ranAt, "last-run summary persisted for the admin page");

  // paging: a backlog bigger than one run's budget reports 'more remain' and finishes next run
  const big = new FakeFirestore();
  for (let i = 0; i < 1000; i++) big.seed("audits", `b${i}`, { createdAt: Timestamp.fromDate(daysAgo(500)) });
  const r1 = await runRetention({ db: big, now: NOW, maxPages: 2 });
  assert.equal(r1.results.audits.deleted, 800); assert.match(r1.results.audits.skipped || "", /more remain/);
  const r2 = await runRetention({ db: big, now: NOW, maxPages: 2 });
  assert.equal(r2.results.audits.deleted, 200); assert.equal(big._store("audits").size, 0);

  // admin edit takes effect on the very next run
  const saved = await saveRetention({ policies: { audits: { ttlDays: 5 } } }, "admin@x.io", db);
  assert.ok(saved.ok);
  const r3 = await runRetention({ db, now: NOW });
  assert.equal(r3.results.audits.deleted, 250, "tightening retention to 5 days removes the 10-day-old rows");
  assert.equal((await getRetention(db)).policies.find((p) => p.id === "audits")!.ttlDays, 5);
  const off = await saveRetention({ policies: { usage: { enabled: false } } }, "admin@x.io", db);
  assert.ok(off.ok);

  // stats
  const st = await collectStats(db, NOW);
  assert.equal(st.find((s) => s.id === "audits")!.total, 0);
  console.log("retention tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
