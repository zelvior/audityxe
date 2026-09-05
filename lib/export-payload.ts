import { AuditResult } from "./types";

/**
 * Everything in AuditResult, reshaped into one complete, stable export
 * shape. Both the JSON download and the PDF generator read from this
 * same builder so they can never silently diverge — if a field gets
 * added to AuditResult, it should be added here once, and both exports
 * pick it up.
 */
export function buildAuditExportPayload(result: AuditResult) {
  return {
    meta: {
      tool: "Audityxe",
      generatedAt: new Date().toISOString(),
      url: result.url,
    },
    overall: result.overall,
    verdict: result.verdict,
    categories: result.categories,
    siteContext: result.siteContext ?? null,
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
        detail: f.detail,
        evidence: f.evidence ?? null,
      })),
    })),
    fixes: result.fixes,
    performance: {
      fetched: result.pageSpeed?.fetched ?? false,
      locked: result.pageSpeedLocked ?? false,
      lockReason: result.pageSpeedLockReason ?? null,
      // These are lab-measurement values from a single automated
      // Lighthouse run against this URL — not real-user field data —
      // and can vary run to run. Labeled explicitly wherever surfaced.
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
      topIssues: result.pageSpeed?.fetched ? result.pageSpeed.topIssues : [],
    },
    promo: {
      locked: result.promoLocked ?? false,
      lockReason: result.promoLockReason ?? null,
      xPost: result.promoLocked ? null : result.xPost || null,
      linkedinPost: result.promoLocked ? null : result.linkedinPost || null,
      banner: result.promoLocked ? null : result.banner,
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
