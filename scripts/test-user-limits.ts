import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { FakeFirestore } from "./_fake-firestore";
import { normalizeLimits, validateLimitsInput, setUserLimits, getUserLimits, invalidateUserLimits } from "../lib/user-limits";
import { checkAndIncrementUsage, getUsageSnapshot } from "../lib/rate-limit";

(async () => {
  // validation
  assert.equal(validateLimitsInput({ dailyAudits: -1 }).ok, false);
  assert.equal(validateLimitsInput({ dailyAudits: 1.5 }).ok, false);
  assert.equal(validateLimitsInput({ dailyAudits: 2_000_000 }).ok, false);
  assert.equal(validateLimitsInput({ perMinute: 0 }).ok, false, "per-minute must be >= 1");
  assert.equal(validateLimitsInput({ dailyAudits: "abc" }).ok, false);
  const ok = validateLimitsInput({ dailyAudits: "25", perMinute: 4, note: "  agency\x00 partner  " });
  assert.ok(ok.ok && ok.value.dailyAudits === 25 && ok.value.perMinute === 4 && ok.value.note === "agency  partner");
  const clear = validateLimitsInput({ dailyAudits: "", perMinute: null });
  assert.ok(clear.ok && clear.value.dailyAudits === null && clear.value.perMinute === null);
  assert.deepEqual(normalizeLimits({ dailyAudits: "x", perMinute: 99999999 }).dailyAudits, null, "garbage in the doc is ignored, not trusted");

  const db = new FakeFirestore() as any;
  db.seed("users", "free1", { email: "f@x.io", plan: "free", createdAt: Timestamp.now() });
  db.seed("users", "pro1", { email: "p@x.io", plan: "pro", planExpiresAt: new Date(Date.now() + 86_400_000 * 10).toISOString() });

  // default plan quota still applies (free = 2/day)
  assert.equal((await checkAndIncrementUsage("free1", db)).allowed, true);
  assert.equal((await checkAndIncrementUsage("free1", db)).allowed, true);
  const blocked = await checkAndIncrementUsage("free1", db);
  assert.equal(blocked.allowed, false); assert.equal(blocked.limit, 2);

  // admin raises it -> the very next request is allowed, and limit reflects the override
  const set = await setUserLimits("free1", { dailyAudits: 10, perMinute: 3, note: "beta tester" }, "admin@x.io", db);
  assert.ok(set.ok);
  const after = await checkAndIncrementUsage("free1", db);
  assert.equal(after.allowed, true); assert.equal(after.limit, 10); assert.equal(after.used, 3);
  assert.equal((await getUsageSnapshot("free1", db)).limit, 10);
  assert.equal((await getUserLimits("free1", db)).perMinute, 3);

  // admin can also LOWER below the plan (pro 8 -> 1) and block entirely (0)
  await setUserLimits("pro1", { dailyAudits: 1 }, "admin@x.io", db);
  assert.equal((await checkAndIncrementUsage("pro1", db)).allowed, true);
  assert.equal((await checkAndIncrementUsage("pro1", db)).allowed, false);
  await setUserLimits("pro1", { dailyAudits: 0 }, "admin@x.io", db);
  assert.equal((await checkAndIncrementUsage("pro1", db)).limit, 0);

  // clearing restores plan defaults
  await setUserLimits("free1", { dailyAudits: null, perMinute: null }, "admin@x.io", db);
  assert.equal(db._store("users").get("free1").limits, undefined, "override field removed");
  invalidateUserLimits("free1");
  assert.equal((await getUsageSnapshot("free1", db)).limit, 2);

  // can't set limits for someone with no profile doc
  assert.equal((await setUserLimits("ghost", { dailyAudits: 5 }, "admin@x.io", db)).ok, false);
  console.log("user limits tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
