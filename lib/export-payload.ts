import { AuditResult } from "./types";

/**
 * Everything in AuditResult, reshaped into one complete, stable export
 * shape. Both the JSON download and the PDF generator read from this
 * same builder so they can never silently diverge — if a field gets
 * added to AuditResult, it should be added here once, and both exports
 * pick it up.
 */
export function buildAuditExportPayload(result: AuditResult) {
  const allFindings = result.modules.flatMap((m) => m.findings);
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  allFindings.forEach((f) => {
    if (f.status !== "fail" || f.unverifiable) return;
    const sev = f.severity ?? "high";
    bySeverity[sev] += 1;
  });

  return {
    // Bump when a field is added/removed/renamed in a way a downstream
    // consumer parsing this JSON should know about — additive-only
    // changes (a new optional field) don't require a bump, a shape
    // change does.
    schemaVersion: "1.1",
    meta: {
      tool: "Audityxe",
      generatedAt: new Date().toISOString(),
      url: result.url,
      crawlMode: result.crawlMode,
    },
    overall: result.overall,
    scoringMethodology: result.scoringMethodology ?? null,
    verdict: result.verdict,
    categories: result.categories,
    // Same counts the PDF export visualizes as its module-status donut,
    // findings-by-outcome stacked bar, and fail-severity pie chart —
    // computed once here so a JSON consumer gets the identical numbers
    // without re-deriving them from `modules` themselves.
    summary: {
      modulesAudited: result.modules.length,
      modulesGood: result.modules.filter((m) => m.status === "good").length,
      modulesWarning: result.modules.filter((m) => m.status === "warning").length,
      modulesCritical: result.modules.filter((m) => m.status === "critical").length,
      findings: {
        pass: allFindings.filter((f) => f.status === "pass").length,
        warn: allFindings.filter((f) => f.status === "warn" && !f.unverifiable).length,
        fail: allFindings.filter((f) => f.status === "fail" && !f.unverifiable).length,
        unverified: allFindings.filter((f) => f.unverifiable).length,
      },
      failsBySeverity: bySeverity,
      fixesGenerated: result.fixes.length,
    },
    siteContext: result.siteContext
      ? {
          siteType: result.siteContext.siteType,
          label: result.siteContext.label,
          reasons: result.siteContext.reasons,
          confidence: result.siteContext.confidence ?? "high",
        }
      : null,
    modules: result.modules.map((m) => ({
      id: m.id,
      label: m.label,
      status: m.status,
      score: m.score,
      summary: m.summary,
      findings: m.findings.map((f) => ({
        label: f.label,
        status: f.status,
        severity: f.severity ?? (f.status === "fail" ? "high" : f.status === "warn" ? "medium" : null),
        // Whether the check actually ran to a confirmed result. A "warn"
        // with unverifiable:true means the underlying lookup errored or
        // timed out, not that a problem was confirmed — kept distinct in
        // every export, not just the in-app UI, since a spreadsheet or
        // downstream tool reading only status/severity would otherwise
        // treat it identically to a real finding.
        unverifiable: f.unverifiable ?? false,
        confidence: f.confidence ?? "high",
        detail: f.detail,
        evidence: f.evidence ?? null,
      })),
    })),
    fixes: result.fixes,
    // Independent of the promo lock below — always a real, complete
    // value (either the AI-personalized version, or a deterministic
    // fallback keyed off the actual score/categories when promo/AI
    // generation wasn't available) rather than a value that only exists
    // when Pro+BYOK unlocked it. Previously nested under `promo` and
    // nulled out whenever promo was locked, which hid a real value that
    // was always present on `result` regardless.
    banner: {
      ...result.banner,
      aiGenerated: !result.promoLocked,
    },
    performance: {
      fetched: result.pageSpeed?.fetched ?? false,
      attempted: result.pageSpeed?.attempted ?? false,
      errorMessage: result.pageSpeed?.errorMessage ?? null,
      locked: result.pageSpeedLocked ?? false,
      lockReason: result.pageSpeedLockReason ?? null,
      // Lab scores/CWV below are from a single automated Lighthouse run
      // against this URL — not real-user data, and can vary run to run.
      // Real-world field data (when Google has enough Chrome traffic on
      // this origin to report it) is included separately under
      // `fieldData` and should be treated as the higher-confidence
      // number where the two diverge.
      note: "lab_measurement_not_field_data",
      scores: result.pageSpeed?.fetched
        ? {
            performance: result.pageSpeed.performanceScore,
            accessibility: result.pageSpeed.accessibilityScore,
            bestPractices: result.pageSpeed.bestPracticesScore,
            seo: result.pageSpeed.seoScore,
          }
        : null,
      coreWebVitals: result.pageSpeed?.fetched ? result.pageSpeed.coreWebVitals : null,
      fieldData: result.pageSpeed?.fieldData ?? null,
      topIssues: result.pageSpeed?.fetched ? result.pageSpeed.topIssues : [],
      // Base64 data URL, so it's intentionally omitted from the JSON
      // export by default (it can be hundreds of KB and would dominate
      // the file) — exposed as a boolean so consumers know it exists.
      finalScreenshotAvailable: !!(result.pageSpeed?.finalScreenshotDataUrl || result.pageSpeed?.finalScreenshotDesktopDataUrl),
      finalScreenshotDesktopAvailable: !!result.pageSpeed?.finalScreenshotDesktopDataUrl,
    },
    // The standalone Chrome UX Report lookup (lib/crux.ts) — distinct
    // from performance.fieldData above, which is PSI's own embedded
    // (and less complete) field-data snapshot. This is the fuller,
    // per-metric real-user data shown in the UI as "Real-world Core
    // Web Vitals" (components/CruxFieldData.tsx).
    crux: {
      available: result.crux.available,
      reason: result.crux.reason,
      origin: result.crux.origin,
      collectionPeriod: result.crux.collectionPeriod,
      metrics: result.crux.metrics,
    },
    promo: {
      locked: result.promoLocked ?? false,
      lockReason: result.promoLockReason ?? null,
      xPost: result.promoLocked ? null : result.xPost || null,
      linkedinPost: result.promoLocked ? null : result.linkedinPost || null,
    },
    competitor: result.competitor
      ? {
          url: result.competitor.url,
          overall: result.competitor.overall,
          categories: result.competitor.categories,
          summary: result.competitor.summary,
        }
      : null,
    usage: result._usage ?? null,
  };
}

export type AuditExportPayload = ReturnType<typeof buildAuditExportPayload>;
