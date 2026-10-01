/** Pure, side-effect-free risk scoring (unit-testable). Each signal adds
 * points; the total is capped at 100. Thresholds are deliberately
 * conservative — a normal visitor scores 0-10, so a block ("critical")
 * needs several independent signals agreeing, not one oddity. */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskInput {
  clientBot: string[]; // signals reported by the browser collector
  serverBotUa: boolean;
  missingAcceptLanguage: boolean;
  uaMismatch: boolean; // UA the page declared != UA header the server saw
  langMismatch: boolean;
  noDevice: boolean; // web request with no verifiable device token
  idConflict: boolean; // cookie id != storage id
  deviceResets: number; // times this device re-appeared with cleared storage
  fpMultiDevice24h: number; // distinct device ids sharing this fingerprint in 24h
  deviceUids: number; // accounts ever seen on this device
  deviceUids24h: number;
  ipUids24h: number;
  uidDevices24h: number;
  uidAgeMinutes: number | null;
  countryHop: boolean; // impossible travel
  linkedBannedUids: number; // banned/suspended accounts on the same device
  recentStrikePoints: number;
}

export interface RiskReason {
  code: string;
  points: number;
  detail?: string;
}
export interface RiskResult {
  score: number;
  level: RiskLevel;
  reasons: RiskReason[];
}

const BOT_WEIGHTS: Record<string, number> = {
  webdriver: 40,
  headless_ua: 35,
  automation_globals: 40,
  tampered_apis: 20,
  software_renderer: 12,
  canvas_noise: 10,
  no_languages: 10,
  zero_screen: 25,
  no_plugins_chrome: 6,
  notification_inconsistent: 8,
  chrome_object_missing: 12,
};

export function levelFor(score: number): RiskLevel {
  return score >= 85 ? "critical" : score >= 60 ? "high" : score >= 30 ? "medium" : "low";
}

export function computeRisk(i: RiskInput): RiskResult {
  const reasons: RiskReason[] = [];
  const add = (code: string, points: number, detail?: string) => {
    if (points > 0) reasons.push({ code, points, detail });
  };

  let bot = 0;
  for (const s of i.clientBot) bot += BOT_WEIGHTS[s] || 0;
  add("client_bot_signals", Math.min(bot, 70), i.clientBot.join(","));
  add("bot_user_agent", i.serverBotUa ? 30 : 0);
  add("no_accept_language", i.missingAcceptLanguage ? 8 : 0);
  add("ua_mismatch", i.uaMismatch ? 25 : 0, "page-declared UA differs from request UA header");
  add("lang_mismatch", i.langMismatch ? 6 : 0);
  add("no_device_token", i.noDevice ? 20 : 0);
  add("storage_id_conflict", i.idConflict ? 10 : 0);
  add("storage_resets", i.deviceResets >= 6 ? 30 : i.deviceResets >= 3 ? 15 : 0, `${i.deviceResets} resets`);
  add("fingerprint_multi_device", i.fpMultiDevice24h >= 6 ? 35 : i.fpMultiDevice24h >= 3 ? 20 : 0, `${i.fpMultiDevice24h} ids/24h`);
  add("multi_account_device", i.deviceUids >= 10 ? 45 : i.deviceUids >= 5 ? 30 : i.deviceUids >= 3 ? 15 : 0, `${i.deviceUids} accounts`);
  add("account_burst_device", i.deviceUids24h >= 4 ? 20 : 0, `${i.deviceUids24h} accounts/24h`);
  add("multi_account_ip", i.ipUids24h >= 15 ? 25 : i.ipUids24h >= 6 ? 10 : 0, `${i.ipUids24h} accounts/24h`);
  add("multi_device_account", i.uidDevices24h >= 8 ? 30 : i.uidDevices24h >= 4 ? 15 : 0, `${i.uidDevices24h} devices/24h`);
  add("brand_new_account", i.uidAgeMinutes !== null && i.uidAgeMinutes < 30 ? 5 : 0);
  add("impossible_travel", i.countryHop ? 25 : 0);
  add("linked_to_banned_account", i.linkedBannedUids > 0 ? Math.min(55, 35 + 10 * (i.linkedBannedUids - 1)) : 0, `${i.linkedBannedUids} linked`);
  add("recent_strikes", Math.min(30, Math.round(i.recentStrikePoints * 3)), `${i.recentStrikePoints} pts`);

  const score = Math.min(100, reasons.reduce((s, r) => s + r.points, 0));
  return { score, level: levelFor(score), reasons };
}

/** Rate-limit multiplier by risk — risky traffic gets a tighter budget
 * before it ever reaches "block". */
export function limitMultiplier(level: RiskLevel): number {
  return level === "low" ? 1 : level === "medium" ? 0.6 : level === "high" ? 0.3 : 0;
}
