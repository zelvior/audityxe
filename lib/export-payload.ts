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
    scoringMethodology: result.scoringMethodology ?? null,
    verdict: result.verdict,
    categories: result.categories,
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
