/**
 * Runs the REAL Cloudflare Worker cleanup code against a fake Firestore REST
 * API (global fetch is replaced), checking the exact requests it makes.
 */
import assert from "node:assert/strict";
import { runCleanup } from "../cloudflare-worker/src/index";

type Doc = Record<string, unknown>;
const store = new Map<string, Map<string, Doc>>(); // collection -> id -> plain data (Date for timestamps)
const queries: { collection: string; field: string; valueKind: string; value: string }[] = [];
const writes: string[] = [];
const col = (n: string) => (store.has(n) ? store.get(n)! : (store.set(n, new Map()), store.get(n)!));

function decode(v: Record<string, unknown>): unknown {
  if ("stringValue" in v) return v.stringValue; if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue); if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return new Date(v.timestampValue as string); if ("nullValue" in v) return null;
  if ("mapValue" in v) return Object.fromEntries(Object.entries(((v.mapValue as { fields?: Record<string, Record<string, unknown>> }).fields) || {}).map(([k, x]) => [k, decode(x)]));
  return undefined;
}
const encode = (v: unknown): Record<string, unknown> =>
  typeof v === "string" ? { stringValue: v } : typeof v === "boolean" ? { booleanValue: v } : typeof v === "number" ? { integerValue: String(v) } :
  v instanceof Date ? { timestampValue: v.toISOString() } : v === null ? { nullValue: null } :
  { mapValue: { fields: Object.fromEntries(Object.entries(v as Doc).map(([k, x]) => [k, encode(x)])) } };

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input); const method = init?.method || "GET"; const body = init?.body ? JSON.parse(String(init.body)) : null;
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  if (url.endsWith(":runQuery")) {
    const q = body.structuredQuery; const coll = q.from[0].collectionId; const f = q.where.fieldFilter;
    const kind = Object.keys(f.value)[0]; const val = f.value[kind] as string;
    queries.push({ collection: coll, field: f.field.fieldPath, valueKind: kind, value: val });
    const rows = [...col(coll).entries()].filter(([, d]) => {
      const x = d[f.field.fieldPath];
      if (x === undefined || x === null) return false;                       // range filters skip missing/null
      if (kind === "timestampValue") return x instanceof Date && x.getTime() < new Date(val).getTime();
      return typeof x === "string" && x < val;                                 // a string filter never matches a Timestamp field
    }).slice(0, q.limit);
    return json(rows.length ? rows.map(([id]) => ({ document: { name: `projects/p/databases/(default)/documents/${coll}/${id}` } })) : [{ readTime: "x" }]);
  }
  if (url.endsWith(":commit")) {
    for (const w of body.writes) { const [, , , , c, id] = w.delete.split("/").slice(-6).length === 6 ? ["", "", "", "", ...w.delete.split("/").slice(-2)] : []; col(c).delete(id); }
    return json({});
  }
  const m = url.match(/documents\/(config\/[a-z_]+)$/);
  if (m && method === "GET") { const [, id] = m[1].split("/"); const d = col("config").get(id); return d ? json({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, encode(v)])) }) : json({}, 404); }
  if (m && method === "PATCH") { const [, id] = m[1].split("/"); col("config").set(id, Object.fromEntries(Object.entries(body.fields).map(([k, v]) => [k, decode(v as Record<string, unknown>)]))); writes.push(m[1]); return json({}); }
  if (url.includes("accounts:batchGet")) return json({ userInfo: [{ localId: "stale", emailVerified: false, createdAt: String(Date.now() - 30 * 86_400_000), providerUserInfo: [{ providerId: "password" }] }, { localId: "fresh", emailVerified: false, createdAt: String(Date.now() - 2 * 86_400_000), providerUserInfo: [{ providerId: "password" }] }, { localId: "verified", emailVerified: true, createdAt: String(Date.now() - 90 * 86_400_000), providerUserInfo: [{ providerId: "password" }] }] });
  if (url.includes("accounts:delete")) { deletedUsers.push(body.localId); return json({}); }
  throw new Error("unexpected fetch " + method + " " + url);
}) as typeof fetch;
const deletedUsers: string[] = [];

const DAY = 86_400_000, ago = (d: number) => new Date(Date.now() - d * DAY);
(async () => {
  col("audits").set("old", { createdAt: ago(200) }); col("audits").set("new", { createdAt: ago(5) });                       // timestamp field
  col("auditJobs").set("oldjob", { createdAt: ago(3).toISOString() }); col("auditJobs").set("newjob", { createdAt: new Date().toISOString() }); // ISO string field
  col("usage").set("oldu", { date: ago(60).toISOString().slice(0, 10) }); col("usage").set("newu", { date: new Date().toISOString().slice(0, 10) }); // date field
  col("abuse_bans").set("perm", { expireAt: null }); col("abuse_bans").set("lapsed", { expireAt: ago(1) });
  col("users").set("u1", { createdAt: ago(900) }); col("crypto_payments").set("p1", { updatedAt: ago(5000).toISOString() });
  const env = { FIREBASE_PROJECT_ID: "p", GOOGLE_CLIENT_EMAIL: "x", GOOGLE_PRIVATE_KEY: "x", CLEANUP_SHARED_SECRET: "s" };

  // 1) no admin config yet -> registry defaults
  let s = await runCleanup(env, { accessToken: "tok" });
  assert.equal(s.source, "worker");
  assert.equal(s.results.audits.deleted, 1); assert.ok(col("audits").has("new") && !col("audits").has("old"));
  assert.equal(s.results.auditJobs.deleted, 1); assert.ok(col("auditJobs").has("newjob"));
  assert.equal(s.results.usage.deleted, 1); assert.ok(col("usage").has("newu"));
  assert.ok(col("abuse_bans").has("perm") && !col("abuse_bans").has("lapsed"), "permanent ban survives");
  assert.ok(col("users").has("u1") && col("crypto_payments").has("p1"), "users + payments untouched by default");
  assert.deepEqual(deletedUsers, ["stale"], "only the stale unverified account is deleted");
  // the right value type goes over the wire per field type
  const q = (c: string) => queries.find((x) => x.collection === c)!;
  assert.equal(q("audits").valueKind, "timestampValue"); assert.equal(q("auditJobs").valueKind, "stringValue"); assert.equal(q("usage").valueKind, "stringValue");
  assert.match(q("usage").value, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(col("config").has("retention_status"), "status doc written");

  // 2) the admin tightens audits to 3 days, disables auditJobs, sets unverified users to 1 day
  col("config").set("retention", { policies: { audits: { ttlDays: 3 }, auditJobs: { enabled: false } }, unverifiedUsers: { ttlDays: 1 } });
  col("audits").set("mid", { createdAt: ago(5) }); col("auditJobs").set("oldjob2", { createdAt: ago(9).toISOString() }); deletedUsers.length = 0;
  s = await runCleanup(env, { accessToken: "tok" });
  assert.equal(s.results.audits.deleted, 2, "the admin's 3-day limit applies on the next run (5-day-old rows go)");
  assert.equal(s.results.auditJobs.skipped, "disabled"); assert.ok(col("auditJobs").has("oldjob2"), "disabled policy deletes nothing");
  assert.deepEqual(deletedUsers.sort(), ["fresh", "stale"], "1-day unverified retention");

  // 3) the admin enables payment retention explicitly
  col("config").set("retention", { policies: { cryptoPayments: { enabled: true, ttlDays: 400 } } });
  s = await runCleanup(env, { accessToken: "tok" });
  assert.equal(s.results.cryptoPayments.deleted, 1); assert.ok(col("users").has("u1"));
  console.log("worker retention tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
