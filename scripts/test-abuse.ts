import assert from "node:assert/strict";
import { computeRisk, levelFor, limitMultiplier, RiskInput } from "../lib/abuse/risk";
import { ipSubject, maskIp, signDeviceToken, verifyDeviceToken, isDeviceId, isExemptIdentity, clientIp } from "../lib/abuse/core";

const clean: RiskInput = {
  clientBot: [], serverBotUa: false, missingAcceptLanguage: false, uaMismatch: false, langMismatch: false, noDevice: false,
  idConflict: false, deviceResets: 0, fpMultiDevice24h: 0, deviceUids: 1, deviceUids24h: 1, ipUids24h: 1, uidDevices24h: 1,
  uidAgeMinutes: 5000, countryHop: false, linkedBannedUids: 0, recentStrikePoints: 0,
};

// normal user
assert.equal(computeRisk(clean).level, "low");
// shared household device (3 accounts) must NOT be flagged beyond low
assert.equal(computeRisk({ ...clean, deviceUids: 3 }).level, "low");
// automation alone is high, not critical
const bot = computeRisk({ ...clean, clientBot: ["webdriver"], serverBotUa: true });
assert.ok(bot.score >= 60 && bot.level !== "low");
// farm: many accounts + resets + fp churn + bot = critical
const farm = computeRisk({ ...clean, deviceUids: 10, deviceUids24h: 6, deviceResets: 6, fpMultiDevice24h: 6, clientBot: ["headless_ua"] });
assert.equal(farm.level, "critical");
// ban evasion signal
assert.ok(computeRisk({ ...clean, linkedBannedUids: 1 }).score >= 35);
assert.equal(levelFor(29), "low"); assert.equal(levelFor(30), "medium"); assert.equal(levelFor(60), "high"); assert.equal(levelFor(85), "critical");
assert.equal(limitMultiplier("critical"), 0);

// ip subjects
assert.equal(ipSubject("203.0.113.9"), "203.0.113.9");
assert.equal(ipSubject("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), ipSubject("2001:db8:1:2:1:2:3:4"));
assert.notEqual(ipSubject("2001:db8:1:3::1"), ipSubject("2001:db8:1:2::1"));
assert.equal(ipSubject("::ffff:198.51.100.4"), "198.51.100.4");
assert.equal(maskIp("203.0.113.9"), "203.0.113.x");

// device token
const id = "a".repeat(32);
const tok = signDeviceToken(id);
assert.deepEqual(verifyDeviceToken(tok)?.deviceId, id);
assert.equal(verifyDeviceToken(tok.slice(0, -1) + (tok.endsWith("0") ? "1" : "0")), null);
assert.equal(verifyDeviceToken(tok.replace(id, "b".repeat(32))), null);
assert.equal(verifyDeviceToken("garbage"), null);
assert.ok(isDeviceId(id) && !isDeviceId("xyz"));

// admin exemption
process.env.ADMIN_EMAILS = "Boss@Example.com, other@x.io";
assert.equal(isExemptIdentity({ email: "boss@example.com", emailVerified: true }), true);
assert.equal(isExemptIdentity({ email: "boss@example.com", emailVerified: false }), false); // unverified never exempt
assert.equal(isExemptIdentity({ email: "rando@example.com", emailVerified: true }), false);
assert.equal(isExemptIdentity(null), false);

// IP header precedence: spoofed X-Forwarded-For must not beat the platform header
const h = (o: Record<string, string>) => new Request("https://x.test", { headers: o });
assert.equal(clientIp(h({ "x-vercel-forwarded-for": "198.51.100.1", "x-forwarded-for": "1.2.3.4" })), "198.51.100.1");

console.log("abuse tests passed");
