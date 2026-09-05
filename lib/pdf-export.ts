import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AuditResult, AuditModule, CategoryScore } from "./types";
import { buildAuditExportPayload } from "./export-payload";

const INK = "#12121A";
const MUTED = "#6B6B78";
const LINE = "#E4E4EC";
const PAGE_W = 210;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface DocWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}
function lastAutoTableY(doc: jsPDF): number {
  return (doc as DocWithAutoTable).lastAutoTable?.finalY ?? 20;
}

function colorForScore(score: number): [number, number, number] {
  if (score >= 8) return [16, 150, 105];
  if (score >= 5) return [217, 119, 6];
  return [220, 38, 60];
}

function statusColor(status: "good" | "warning" | "critical"): [number, number, number] {
  if (status === "good") return [16, 150, 105];
  if (status === "warning") return [217, 119, 6];
  return [220, 38, 60];
}

function findingColor(status: "pass" | "warn" | "fail"): [number, number, number] {
  if (status === "pass") return [16, 150, 105];
  if (status === "warn") return [217, 119, 6];
  return [220, 38, 60];
}

function footer(doc: jsPDF, hostname: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, 287, PAGE_W - MARGIN, 287);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(`Audityxe report \u2014 ${hostname}`, MARGIN, 292);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, 292, { align: "right" });
  }
}

function sectionHeading(doc: jsPDF, y: number, text: string): number {
  doc.setFontSize(14);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.text(text, MARGIN, y);
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 2.5, PAGE_W - MARGIN, y + 2.5);
  doc.setFont("helvetica", "normal");
  return y + 10;
}

function drawScoreDonut(doc: jsPDF, cx: number, cy: number, r: number, score: number) {
  const [cr, cg, cb] = colorForScore(score);
  doc.setDrawColor(230, 230, 236);
  doc.setLineWidth(3.2);
  doc.circle(cx, cy, r, "S");
  const fraction = Math.max(0, Math.min(1, score / 10));
  const steps = Math.max(1, Math.round(fraction * 72));
  doc.setDrawColor(cr, cg, cb);
  for (let i = 0; i < steps; i++) {
    const a0 = -Math.PI / 2 + (i / 72) * 2 * Math.PI;
    const a1 = -Math.PI / 2 + ((i + 1) / 72) * 2 * Math.PI;
    doc.line(cx + r * Math.cos(a0), cy + r * Math.sin(a0), cx + r * Math.cos(a1), cy + r * Math.sin(a1));
  }
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(cr, cg, cb);
  doc.text(score.toFixed(1), cx, cy + 1.5, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text("/ 10", cx, cy + 7, { align: "center" });
}

function categoryBars(doc: jsPDF, y: number, categories: CategoryScore[]): number {
  const barW = CONTENT_W - 55;
  categories.forEach((c) => {
    doc.setFontSize(9.5);
    doc.setTextColor(INK);
    doc.text(c.label, MARGIN, y + 3.2);
    doc.setTextColor(MUTED);
    doc.text(c.score.toFixed(1), MARGIN + 55 + barW + 3, y + 3.2);
    doc.setFillColor(235, 235, 240);
    doc.roundedRect(MARGIN + 55, y - 1.5, barW, 3.2, 1, 1, "F");
    const [r, g, b] = colorForScore(c.score);
    doc.setFillColor(r, g, b);
    doc.roundedRect(MARGIN + 55, y - 1.5, barW * (c.score / 10), 3.2, 1, 1, "F");
    y += 8;
  });
  return y;
}

/**
 * Generates a full, detailed PDF export of an audit result and triggers a
 * browser download. Every field present in the JSON export (AuditActionBar's
 * handleExport) is represented here too, laid out as a proper report rather
 * than a raw data dump: cover summary, executive summary, per-module findings
 * with severity, fix snippets, PageSpeed lab metrics, and promo copy.
 */
export function generateAuditPdf(result: AuditResult) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const generatedAt = new Date();
  // Built from the exact same function that powers the JSON export, so
  // the two can never silently drift out of sync with each other.
  const payload = buildAuditExportPayload(result);

  /* ── Cover / executive summary ─────────────────────────────── */
  doc.setFillColor(18, 18, 26);
  doc.rect(0, 0, PAGE_W, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Audityxe", MARGIN, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Website audit report", MARGIN, 23);
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 210);
  doc.text(`Generated ${generatedAt.toLocaleString()}`, MARGIN, 30);

  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("AUDIT RESULT FOR", MARGIN, 50);
  doc.setFontSize(15);
  doc.text(result.url, MARGIN, 58);

  drawScoreDonut(doc, PAGE_W - MARGIN - 18, 55, 16, result.overall);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const [vr, vg, vb] = colorForScore(result.overall);
  doc.setTextColor(vr, vg, vb);
  const verdictLines = doc.splitTextToSize(result.verdict, CONTENT_W - 45);
  doc.text(verdictLines, MARGIN, 70);

  let y = 70 + verdictLines.length * 5 + 8;
  y = sectionHeading(doc, y, "Category scores");
  y = categoryBars(doc, y, result.categories) + 4;

  const criticalModules = result.modules.filter((m) => m.status === "critical").length;
  const warningModules = result.modules.filter((m) => m.status === "warning").length;
  const goodModules = result.modules.filter((m) => m.status === "good").length;
  const allFindings = result.modules.flatMap((m) => m.findings);
  const criticalFindings = allFindings.filter((f) => f.status === "fail" && f.severity === "critical").length;
  const highFindings = allFindings.filter((f) => f.status === "fail" && (f.severity ?? "high") === "high").length;
  const totalFails = allFindings.filter((f) => f.status === "fail").length;
  const totalWarns = allFindings.filter((f) => f.status === "warn").length;
  const totalPasses = allFindings.filter((f) => f.status === "pass").length;

  y = sectionHeading(doc, y + 4, "Executive summary");
  const summaryRows: [string, string][] = [
    ["Modules audited", String(result.modules.length)],
    ["Modules in critical state", String(criticalModules)],
    ["Modules with warnings", String(warningModules)],
    ["Modules passing cleanly", String(goodModules)],
    ["Total findings (pass / warn / fail)", `${totalPasses} / ${totalWarns} / ${totalFails}`],
    ["Critical-severity findings", String(criticalFindings)],
    ["High-severity findings", String(highFindings)],
    ["Actionable code fixes generated", String(result.fixes.length)],
  ];
  if (payload.usage) {
    summaryRows.push(["Audit quota used today", `${payload.usage.used} / ${payload.usage.limit} (${payload.usage.plan} plan)`]);
  }
  autoTable(doc, {
    startY: y,
    theme: "plain",
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9.5, cellPadding: 1.6 },
    body: summaryRows,
    columnStyles: { 0: { textColor: [107, 107, 120], cellWidth: 75 }, 1: { fontStyle: "bold", textColor: [18, 18, 26] } },
  });

  if (payload.promo.locked || payload.performance.locked || payload.performance.lockReason) {
    const fy = lastAutoTableY(doc);
    let ly = fy + 8;
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    if (payload.promo.locked) {
      const reason =
        payload.promo.lockReason === "byok_missing"
          ? "Promo copy is Pro-only and requires your own AI key (Settings \u2192 BYOK) \u2014 not configured for this audit."
          : payload.promo.lockReason === "byok_failed"
          ? "Promo copy generation failed using the configured AI key for this audit."
          : "Promo copy is a Pro-plan feature and wasn't generated for this audit.";
      doc.text(`\u2022 Promo kit not included: ${reason}`, MARGIN, ly);
      ly += 5;
    }
    if (payload.performance.lockReason) {
      const reason =
        payload.performance.lockReason === "weekly_limit"
          ? "the weekly PageSpeed Insights (Lighthouse) quota for this plan was already used."
          : "a real PageSpeed Insights pass wasn't confirmed/requested for this audit.";
      doc.text(`\u2022 Lab performance data not included: ${reason}`, MARGIN, ly);
      ly += 5;
    }
    y = ly;
  }

  if (result.siteContext) {
    const finalY = Math.max(lastAutoTableY(doc), y);
    let sy = sectionHeading(doc, finalY + 10, "Site classification");
    doc.setFontSize(9.5);
    doc.setTextColor(INK);
    doc.text(`${result.siteContext.label} (${result.siteContext.siteType})`, MARGIN, sy);
    sy += 6;
    doc.setTextColor(MUTED);
    result.siteContext.reasons.forEach((r) => {
      if (sy > 275) {
        doc.addPage();
        sy = 20;
      }
      const lines = doc.splitTextToSize(`\u2022 ${r}`, CONTENT_W);
      doc.text(lines, MARGIN, sy);
      sy += lines.length * 4.6;
    });
  }

  /* ── Per-module findings ────────────────────────────────────── */
  doc.addPage();
  y = sectionHeading(doc, 20, "Audit modules");
  // A local, explicitly-managed cursor — NOT doc.lastAutoTable.finalY.
  // jspdf-autotable's lastAutoTable is a property on the document that
  // persists across addPage() calls; reading it right after starting a
  // new page returns whatever Y position the *previous* page's last
  // table ended at, not "top of this new page". That produced a large,
  // wrong gap before every module's box (and the same bug again in the
  // fixes loop below) — this cursor is reset to a real top-of-page
  // value every time addPage() is called, and only ever advanced from
  // an autoTable finalY read on the same page it just drew on.
  let moduleCursorY = y;
  result.modules.forEach((m: AuditModule) => {
    const startY = moduleCursorY + 10;
    let drawY = startY;
    if (startY > 255) {
      doc.addPage();
      drawY = 20;
    }
    const [sr, sg, sb] = statusColor(m.status);
    autoTable(doc, {
      startY: drawY,
      head: [[`${m.label}  \u2014  score ${m.score.toFixed(1)}/10  \u2014  ${m.status.toUpperCase()}`]],
      body: [],
      theme: "plain",
      margin: { left: MARGIN, right: MARGIN },
      headStyles: { fillColor: [sr, sg, sb], textColor: [255, 255, 255], fontSize: 10, fontStyle: "bold", cellPadding: 2.5 },
    });
    const afterHeadY = lastAutoTableY(doc);
    autoTable(doc, {
      startY: afterHeadY,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Status", "Severity", "Finding", "Detail", "Evidence"]],
      body: m.findings.map((f) => [
        f.status.toUpperCase(),
        f.severity ? f.severity.toUpperCase() : "\u2014",
        f.label,
        f.detail,
        f.evidence || "\u2014 (no verifiable evidence recorded for this check)",
      ]),
      styles: { fontSize: 7.6, cellPadding: 1.8, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [244, 244, 248], textColor: [18, 18, 26], fontSize: 7.6 },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 16 },
        2: { cellWidth: 30, fontStyle: "bold" },
        3: { cellWidth: 60 },
        4: { cellWidth: "auto", textColor: [107, 107, 120], fontSize: 6.8 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const status = (data.cell.raw as string).toLowerCase() as "pass" | "warn" | "fail";
          const [r, g, b] = findingColor(status);
          data.cell.styles.textColor = [r, g, b];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 1 && data.cell.raw === "CRITICAL") {
          data.cell.styles.textColor = [220, 38, 60];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    moduleCursorY = lastAutoTableY(doc);
  });

  /* ── PageSpeed lab data ─────────────────────────────────────── */
  if (result.pageSpeed?.fetched) {
    doc.addPage();
    y = sectionHeading(doc, 20, "Performance (lab measurement data)");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(
      "Values below come from a single automated Lighthouse run against this URL \u2014 lab data, not real-user\nfield measurement, and can vary run to run.",
      MARGIN,
      y
    );
    y += 10;
    const cwv = result.pageSpeed.coreWebVitals;
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Metric", "Value"]],
      body: [
        ["Performance score", result.pageSpeed.performanceScore != null ? `${result.pageSpeed.performanceScore}/100` : "\u2014"],
        ["Accessibility score", result.pageSpeed.accessibilityScore != null ? `${result.pageSpeed.accessibilityScore}/100` : "\u2014"],
        ["Best Practices score", result.pageSpeed.bestPracticesScore != null ? `${result.pageSpeed.bestPracticesScore}/100` : "\u2014"],
        ["SEO score", result.pageSpeed.seoScore != null ? `${result.pageSpeed.seoScore}/100` : "\u2014"],
        ["LCP (Largest Contentful Paint)", cwv.lcpMs != null ? `${cwv.lcpMs} ms` : "\u2014"],
        ["CLS (Cumulative Layout Shift)", cwv.clsScore != null ? String(cwv.clsScore) : "\u2014"],
        ["TBT (Total Blocking Time)", cwv.tbtMs != null ? `${cwv.tbtMs} ms` : "\u2014"],
        ["FCP (First Contentful Paint)", cwv.fcpMs != null ? `${cwv.fcpMs} ms` : "\u2014"],
        ["Speed Index", cwv.speedIndexMs != null ? `${cwv.speedIndexMs} ms` : "\u2014"],
      ],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [244, 244, 248], textColor: [18, 18, 26] },
    });
    if (result.pageSpeed.topIssues.length) {
      const fy = lastAutoTableY(doc);
      autoTable(doc, {
        startY: fy + 8,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Lighthouse issue", "Description"]],
        body: result.pageSpeed.topIssues.map((i) => [i.title, i.description]),
        styles: { fontSize: 8.5, cellPadding: 1.8, overflow: "linebreak" },
        headStyles: { fillColor: [244, 244, 248], textColor: [18, 18, 26] },
        columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
      });
    }
  }

  /* ── Fixes ──────────────────────────────────────────────────── */
  if (result.fixes.length) {
    doc.addPage();
    y = sectionHeading(doc, 20, `Recommended fixes (${result.fixes.length})`);
    let fixCursorY = y;
    result.fixes.forEach((fix) => {
      let startY = fixCursorY + 8;
      if (startY > 245) {
        doc.addPage();
        startY = 20;
      }
      autoTable(doc, {
        startY,
        margin: { left: MARGIN, right: MARGIN },
        theme: "plain",
        body: [[`${fix.category} \u2014 ${fix.target}`]],
        styles: { fontSize: 9.5, fontStyle: "bold", textColor: [18, 18, 26], cellPadding: { top: 2, bottom: 1, left: 0, right: 0 } },
      });
      const py = lastAutoTableY(doc);
      autoTable(doc, {
        startY: py,
        margin: { left: MARGIN, right: MARGIN },
        theme: "plain",
        body: [
          [{ content: "Problem", styles: { fontStyle: "bold", textColor: [107, 107, 120] } }, fix.problem],
          [{ content: "Evidence", styles: { fontStyle: "bold", textColor: [107, 107, 120] } }, fix.evidence],
          [{ content: "Fix", styles: { fontStyle: "bold", textColor: [107, 107, 120] } }, fix.fix],
        ],
        styles: { fontSize: 8.5, cellPadding: 1.4, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: "auto" } },
      });
      const snippetY = lastAutoTableY(doc);
      const snippetLines = fix.snippet.split("\n");
      doc.setFillColor(24, 24, 32);
      const snippetHeight = snippetLines.length * 3.9 + 4;
      doc.roundedRect(MARGIN, snippetY + 2, CONTENT_W, snippetHeight, 1.5, 1.5, "F");
      doc.setFont("courier", "normal");
      doc.setFontSize(7.4);
      snippetLines.forEach((line, i) => {
        if (line.startsWith("+")) doc.setTextColor(110, 220, 160);
        else if (line.startsWith("-")) doc.setTextColor(240, 120, 130);
        else doc.setTextColor(210, 210, 220);
        doc.text(line.slice(0, 108), MARGIN + 3, snippetY + 6.5 + i * 3.9);
      });
      doc.setFont("helvetica", "normal");
      fixCursorY = snippetY + snippetHeight + 2;
    });
  }

  /* ── Promo copy (only when unlocked) ───────────────────────── */
  if (!result.promoLocked && (result.xPost || result.linkedinPost)) {
    doc.addPage();
    y = sectionHeading(doc, 20, "Promo kit copy");
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Platform", "Copy"]],
      body: [
        ["X / Twitter", result.xPost || "\u2014"],
        ["LinkedIn", result.linkedinPost || "\u2014"],
      ],
      styles: { fontSize: 9, cellPadding: 2.4, overflow: "linebreak" },
      headStyles: { fillColor: [244, 244, 248], textColor: [18, 18, 26] },
      columnStyles: { 0: { cellWidth: 28, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
    });
  }

  /* ── Competitor comparison ─────────────────────────────────── */
  if (result.competitor) {
    doc.addPage();
    y = sectionHeading(doc, 20, `Competitor comparison \u2014 vs ${result.competitor.url}`);
    y = categoryBars(doc, y + 4, result.categories);
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text(`${result.competitor.url} overall: ${result.competitor.overall.toFixed(1)}/10`, MARGIN, y + 4);
    y += 10;
    if (result.competitor.summary.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Comparison"]],
        body: result.competitor.summary.map((s) => [s]),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [244, 244, 248], textColor: [18, 18, 26] },
      });
    }
  }

  footer(doc, result.url);
  doc.save(`audit-${result.url.replace(/[^a-z0-9.-]/gi, "_")}.pdf`);
}
