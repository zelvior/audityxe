import jsPDF, { GState } from "jspdf";
import autoTable from "jspdf-autotable";
import { AuditResult, AuditModule, CategoryScore } from "./types";
import { buildAuditExportPayload } from "./export-payload";

const INK = "#201B14";
const MUTED = "#6E6252";
const LINE = "#E3D6BE";
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
  if (score >= 8) return [63, 125, 92];
  if (score >= 5) return [168, 114, 10];
  return [178, 58, 46];
}

function statusColor(status: "good" | "warning" | "critical"): [number, number, number] {
  if (status === "good") return [63, 125, 92];
  if (status === "warning") return [168, 114, 10];
  return [178, 58, 46];
}

function findingColor(status: "pass" | "warn" | "fail" | "unverified"): [number, number, number] {
  if (status === "pass") return [63, 125, 92];
  if (status === "warn") return [168, 114, 10];
  if (status === "unverified") return [110, 98, 82];
  return [178, 58, 46];
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
 * Radar / vector-metrics chart — the same 6 category scores as the bars
 * above, plotted as a hexagon so their overall *shape* (a well-rounded
 * site vs. one spiky weak category) is visible at a glance, mirroring
 * components/VectorMetricsVisualizer.tsx in the web app. Built from
 * straight-line polygon edges (via jsPDF's `lines()` path primitive)
 * rather than a true curved radial chart — appropriate here since a
 * hexagon (one vertex per category) has straight edges by definition,
 * unlike the circular donuts elsewhere in this file.
 */
function drawRadarChart(doc: jsPDF, cx: number, cy: number, r: number, categories: CategoryScore[]) {
  const n = categories.length;
  if (n < 3) return; // a radar chart needs at least a triangle to mean anything
  const angleFor = (i: number) => -Math.PI / 2 + (i / n) * 2 * Math.PI;
  const pointAt = (i: number, fraction: number) => {
    const a = angleFor(i);
    return [cx + r * fraction * Math.cos(a), cy + r * fraction * Math.sin(a)] as const;
  };

  // Gridlines at 20/40/60/80/100% — faint concentric hexagons.
  doc.setDrawColor(230, 226, 214);
  doc.setLineWidth(0.2);
  [0.2, 0.4, 0.6, 0.8, 1].forEach((frac) => {
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pointAt(i, frac);
      const [x2, y2] = pointAt((i + 1) % n, frac);
      doc.line(x1, y1, x2, y2);
    }
  });
  // Spokes from center to each category vertex.
  for (let i = 0; i < n; i++) {
    const [x, y] = pointAt(i, 1);
    doc.line(cx, cy, x, y);
  }

  // The actual data polygon — translucent fill isn't available in
  // jsPDF's vector drawing without a graphics-state alpha call, so a
  // light, brand-toned fill color is used directly (still reads
  // clearly against the white page background) with a bold stroke on
  // top for the outline.
  const avg = categories.reduce((s, c) => s + c.score, 0) / categories.length;
  const [pr, pg, pb] = colorForScore(avg);
  const points: [number, number][] = categories.map((c, i) => pointAt(i, Math.max(0.04, c.score / 10)) as unknown as [number, number]);
  const flatFromSecond = points.slice(1).map((p, i) => [p[0] - points[i][0], p[1] - points[i][1]]);
  doc.setFillColor(pr, pg, pb);
  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(0.8);
  // jsPDF's GState alpha (setGState) is supported in modern jsPDF — used
  // here only for this one fill so the grid/spokes underneath stay
  // legible through the data polygon, then restored to full opacity
  // immediately after for every chart/table drawn afterward.
  doc.setGState(new GState({ opacity: 0.28 }));
  doc.lines(flatFromSecond, points[0][0], points[0][1], [1, 1], "F", true);
  doc.setGState(new GState({ opacity: 1 }));
  doc.lines(flatFromSecond, points[0][0], points[0][1], [1, 1], "S", true);

  // Vertex dots + category labels + numeric score, placed just outside
  // the outer gridline ring on each axis.
  categories.forEach((c, i) => {
    const [dx, dy] = pointAt(i, Math.max(0.04, c.score / 10));
    doc.setFillColor(pr, pg, pb);
    doc.circle(dx, dy, 0.9, "F");

    const [lx, ly] = pointAt(i, 1.16);
    doc.setFontSize(6.6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK);
    const align = Math.abs(Math.cos(angleFor(i))) < 0.3 ? "center" : Math.cos(angleFor(i)) > 0 ? "left" : "right";
    doc.text(c.label, lx, ly - 1.5, { align });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    const [sr, sg, sb] = colorForScore(c.score);
    doc.setTextColor(sr, sg, sb);
    doc.text(c.score.toFixed(1), lx, ly + 2.5, { align });
  });
}

/**
 * A genuine filled pie chart (as opposed to drawScoreDonut/
 * drawModuleStatusDonut above, which are rings with a hole) — built the
 * same way this file already approximates circles elsewhere: many thin
 * filled triangles fanning out from the center, one per small angular
 * step, rather than a true SVG-style arc path (jsPDF's vector primitives
 * don't include a filled-arc/wedge shape directly).
 */
function drawPieChart(doc: jsPDF, cx: number, cy: number, r: number, segments: { count: number; color: [number, number, number]; label: string }[]) {
  const total = segments.reduce((s, seg) => s + seg.count, 0) || 1;
  let angleStart = -Math.PI / 2;
  segments.forEach((seg) => {
    if (seg.count === 0) return;
    const sweep = (seg.count / total) * 2 * Math.PI;
    const steps = Math.max(1, Math.round((seg.count / total) * 120) || 1);
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.15);
    for (let i = 0; i < steps; i++) {
      const a0 = angleStart + (i / steps) * sweep;
      const a1 = angleStart + ((i + 1) / steps) * sweep;
      doc.triangle(cx, cy, cx + r * Math.cos(a0), cy + r * Math.sin(a0), cx + r * Math.cos(a1), cy + r * Math.sin(a1), "FD");
    }
    angleStart += sweep;
  });

  let ly = cy - r + 2;
  segments.forEach((seg) => {
    if (seg.count === 0) return;
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.roundedRect(cx + r + 8, ly - 2.6, 3, 3, 0.6, 0.6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(INK);
    doc.text(`${seg.label}: ${seg.count}`, cx + r + 13, ly);
    ly += 6.5;
  });
}

/**
 * Multi-segment donut chart — module status breakdown (good/warning/
 * critical). Same vector-line-segment technique as drawScoreDonut, just
 * generalized to more than one color band around the ring, plus a small
 * legend to its right so the three counts are still readable even
 * without hovering a slice (this is a static PDF, not an interactive
 * chart).
 */
function drawModuleStatusDonut(doc: jsPDF, cx: number, cy: number, r: number, good: number, warning: number, critical: number) {
  const total = good + warning + critical || 1;
  const segments: { count: number; color: [number, number, number]; label: string }[] = [
    { count: good, color: [63, 125, 92], label: "Passing" },
    { count: warning, color: [201, 148, 45], label: "Warning" },
    { count: critical, color: [190, 62, 62], label: "Critical" },
  ];
  doc.setLineWidth(4.2);
  let angleStart = -Math.PI / 2;
  segments.forEach((seg) => {
    if (seg.count === 0) return;
    const sweep = (seg.count / total) * 2 * Math.PI;
    const steps = Math.max(1, Math.round((seg.count / total) * 90));
    doc.setDrawColor(seg.color[0], seg.color[1], seg.color[2]);
    for (let i = 0; i < steps; i++) {
      const a0 = angleStart + (i / steps) * sweep;
      const a1 = angleStart + ((i + 1) / steps) * sweep;
      doc.line(cx + r * Math.cos(a0), cy + r * Math.sin(a0), cx + r * Math.cos(a1), cy + r * Math.sin(a1));
    }
    angleStart += sweep;
  });
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(INK);
  doc.text(String(good + warning + critical), cx, cy + 1, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text("modules", cx, cy + 5.5, { align: "center" });

  let ly = cy - r + 2;
  segments.forEach((seg) => {
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.roundedRect(cx + r + 8, ly - 2.6, 3, 3, 0.6, 0.6, "F");
    doc.setFontSize(8);
    doc.setTextColor(INK);
    doc.text(`${seg.label}: ${seg.count}`, cx + r + 13, ly);
    ly += 6.5;
  });
}

/**
 * Single-row stacked bar — pass/warn/fail/unverified finding counts as
 * proportional colored segments, with the count printed inside each
 * segment wide enough to hold it. Gives an at-a-glance shape of the
 * whole audit's findings without reading the executive-summary table.
 */
function drawFindingsStackedBar(doc: jsPDF, y: number, passes: number, warns: number, fails: number, unverified: number): number {
  const total = passes + warns + fails + unverified || 1;
  const barW = CONTENT_W;
  const barH = 7;
  const segs: { count: number; color: [number, number, number]; label: string }[] = [
    { count: passes, color: [63, 125, 92], label: "Pass" },
    { count: warns, color: [201, 148, 45], label: "Warn" },
    { count: fails, color: [190, 62, 62], label: "Fail" },
    { count: unverified, color: [176, 176, 184], label: "Unverified" },
  ];
  let x = MARGIN;
  segs.forEach((seg) => {
    if (seg.count === 0) return;
    const w = (seg.count / total) * barW;
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.rect(x, y, w, barH, "F");
    if (w > 9) {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(String(seg.count), x + w / 2, y + barH / 2 + 1.5, { align: "center" });
    }
    x += w;
  });
  let ly = y + barH + 6;
  let lx = MARGIN;
  doc.setFont("helvetica", "normal");
  segs.forEach((seg) => {
    doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
    doc.roundedRect(lx, ly - 2.6, 3, 3, 0.6, 0.6, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED);
    const label = `${seg.label} (${seg.count})`;
    doc.text(label, lx + 5, ly);
    lx += doc.getTextWidth(label) + 15;
  });
  return ly + 6;
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

  // Vector-metrics radar chart — same 6 scores as the bars just drawn,
  // as a shape rather than a list, so a lopsided single-weak-category
  // profile is visible at a glance the way it is in the web app's own
  // VectorMetricsVisualizer.
  {
    const radarY = y + 32;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK);
    doc.text("Vector metrics", MARGIN, y + 4);
    doc.setFont("helvetica", "normal");
    drawRadarChart(doc, PAGE_W / 2, radarY, 26, result.categories);
    y = radarY + 34;
  }

  const criticalModules = result.modules.filter((m) => m.status === "critical").length;
  const warningModules = result.modules.filter((m) => m.status === "warning").length;
  const goodModules = result.modules.filter((m) => m.status === "good").length;
  const allFindings = result.modules.flatMap((m) => m.findings);
  const criticalFindings = allFindings.filter((f) => f.status === "fail" && f.severity === "critical").length;
  const highFindings = allFindings.filter((f) => f.status === "fail" && (f.severity ?? "high") === "high").length;
  const mediumFindings = allFindings.filter((f) => f.status === "fail" && f.severity === "medium").length;
  const lowFindings = allFindings.filter((f) => f.status === "fail" && f.severity === "low").length;
  const totalFails = allFindings.filter((f) => f.status === "fail" && !f.unverifiable).length;
  const totalWarns = allFindings.filter((f) => f.status === "warn" && !f.unverifiable).length;
  const totalPasses = allFindings.filter((f) => f.status === "pass").length;
  // Distinct from a real warn: a lookup that errored or timed out, not
  // a confirmed problem — kept out of the pass/warn/fail tally so it
  // can't be mistaken for either.
  const totalUnverified = allFindings.filter((f) => f.unverifiable).length;

  // The cover page ends here (header, verdict, category bars, radar
  // chart) — executive summary and its charts start fresh on their own
  // page rather than risking an overflow off the bottom of a page whose
  // remaining space depends on how long the verdict text wrapped to.
  doc.addPage();
  y = sectionHeading(doc, 20, "Executive summary");
  const summaryRows: [string, string][] = [
    ["Modules audited", String(result.modules.length)],
    ["Modules in critical state", String(criticalModules)],
    ["Modules with warnings", String(warningModules)],
    ["Modules passing cleanly", String(goodModules)],
    ["Total findings (pass / warn / fail)", `${totalPasses} / ${totalWarns} / ${totalFails}`],
    ["Unverified checks (lookup failed/timed out \u2014 not scored)", String(totalUnverified)],
    ["Critical-severity findings", String(criticalFindings)],
    ["High-severity findings", String(highFindings)],
    ["Medium-severity findings", String(mediumFindings)],
    ["Low-severity findings", String(lowFindings)],
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
    columnStyles: { 0: { textColor: [110, 98, 82], cellWidth: 75 }, 1: { fontStyle: "bold", textColor: [32, 27, 20] } },
  });

  // Three at-a-glance charts: a module-status donut, a stacked bar of
  // every finding across the whole audit, and a genuine filled pie chart
  // of fail-severity distribution — all derived from the same counts
  // already in the table above, just visualized instead of only
  // tabulated.
  {
    const chartY = lastAutoTableY(doc) + 16;
    drawModuleStatusDonut(doc, MARGIN + 16, chartY, 14, goodModules, warningModules, criticalModules);

    if (totalFails > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(INK);
      doc.text("Fails by severity", PAGE_W - MARGIN - 62, chartY - 18);
      doc.setFont("helvetica", "normal");
      drawPieChart(doc, PAGE_W - MARGIN - 48, chartY, 14, [
        { count: criticalFindings, color: [178, 58, 46], label: "Critical" },
        { count: highFindings, color: [214, 110, 40], label: "High" },
        { count: mediumFindings, color: [201, 148, 45], label: "Medium" },
        { count: lowFindings, color: [150, 140, 120], label: "Low" },
      ]);
    }

    const barY = chartY + 24;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK);
    doc.text("All findings, by outcome", MARGIN, barY - 3);
    doc.setFont("helvetica", "normal");
    y = drawFindingsStackedBar(doc, barY, totalPasses, totalWarns, totalFails, totalUnverified) + 4;
  }

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
    const confidenceSuffix = result.siteContext.confidence && result.siteContext.confidence !== "high"
      ? `  \u2014  ${result.siteContext.confidence.toUpperCase()} CONFIDENCE`
      : "";
    doc.text(`${result.siteContext.label} (${result.siteContext.siteType})${confidenceSuffix}`, MARGIN, sy);
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
    y = sy;
  }

  if (result.scoringMethodology) {
    const finalY = Math.max(lastAutoTableY(doc), y);
    let sy = sectionHeading(doc, finalY + 10, "How the overall score is calculated");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    if (sy > 265) {
      doc.addPage();
      sy = 20;
    }
    const lines = doc.splitTextToSize(result.scoringMethodology, CONTENT_W);
    doc.text(lines, MARGIN, sy);
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
      head: [[`${m.label}  \u2014  ${m.score == null ? "not scored" : `score ${m.score.toFixed(1)}/10`}  \u2014  ${m.status.toUpperCase()}`]],
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
        f.unverifiable ? "UNVERIFIED" : f.status.toUpperCase(),
        f.severity ? f.severity.toUpperCase() : "\u2014",
        f.label,
        f.detail,
        f.evidence || "\u2014 (no verifiable evidence recorded for this check)",
      ]),
      styles: { fontSize: 7.6, cellPadding: 1.8, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [241, 233, 216], textColor: [32, 27, 20], fontSize: 7.6 },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 16 },
        2: { cellWidth: 30, fontStyle: "bold" },
        3: { cellWidth: 60 },
        4: { cellWidth: "auto", textColor: [110, 98, 82], fontSize: 6.8 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const raw = (data.cell.raw as string).toLowerCase();
          const status = raw === "unverified" ? "unverified" : (raw as "pass" | "warn" | "fail");
          const [r, g, b] = findingColor(status);
          data.cell.styles.textColor = [r, g, b];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 1 && data.cell.raw === "CRITICAL") {
          data.cell.styles.textColor = [178, 58, 46];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    moduleCursorY = lastAutoTableY(doc);
  });

  /* ── PageSpeed lab data ─────────────────────────────────────── */
  if (result.pageSpeed?.attempted && !result.pageSpeed?.fetched) {
    doc.addPage();
    y = sectionHeading(doc, 20, "Performance (lab measurement data)");
    doc.setFontSize(9);
    doc.setTextColor(...findingColor("fail"));
    doc.text("A real-browser (Lighthouse) pass was requested but did not complete.", MARGIN, y);
    y += 6;
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    const reason = result.pageSpeed.errorMessage || "Unknown error.";
    const wrapped = doc.splitTextToSize(reason, CONTENT_W);
    doc.text(wrapped, MARGIN, y);
  } else if (result.pageSpeed?.fetched) {
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
      headStyles: { fillColor: [241, 233, 216], textColor: [32, 27, 20] },
    });
    // Visual proof of the real Chrome render, straight from the same
    // PSI response — wrapped in try/catch because jsPDF throws on a
    // malformed/unsupported image payload, and a screenshot failing to
    // embed should never take the whole report export down with it.
    // Prefers the desktop capture (meaningfully higher resolution, and
    // this is a document meant to be read on a screen or printed, not
    // a phone) and falls back to the mobile one if desktop failed.
    const bestScreenshot = result.pageSpeed.finalScreenshotDesktopDataUrl || result.pageSpeed.finalScreenshotDataUrl;
    if (bestScreenshot) {
      try {
        const shotY = lastAutoTableY(doc) + 8;
        doc.setFontSize(8.5);
        doc.setTextColor(MUTED);
        doc.text("Final render captured by Chrome during the Lighthouse run:", MARGIN, shotY);
        // Fixed width AND height (not the previous height=0 "auto from
        // aspect ratio"): the screenshot now comes from Lighthouse's
        // full-page-screenshot audit when available (see
        // extractBestScreenshot in lib/pagespeed.ts), which captures
        // the *entire* scrolled page rather than one viewport-height
        // frame — auto-sizing from that image's real aspect ratio could
        // produce a height of hundreds of mm on a long page and run
        // straight off subsequent report pages with no pagination logic
        // to catch it. addImage stretches to whatever box you give it
        // (no cropping option in this synchronous call), so a very long
        // page's capture will appear vertically compressed here rather
        // than true-to-proportion — a real trade-off, but a bounded,
        // predictable one instead of a broken PDF layout.
        doc.addImage(bestScreenshot, "JPEG", MARGIN, shotY + 4, 90, 60);
      } catch {
        // non-fatal — skip the image, keep the rest of the report
      }
    }

    if (result.pageSpeed.topIssues.length) {
      const fy = lastAutoTableY(doc);
      autoTable(doc, {
        startY: fy + 8,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Lighthouse issue", "Description"]],
        body: result.pageSpeed.topIssues.map((i) => [i.title, i.description]),
        styles: { fontSize: 8.5, cellPadding: 1.8, overflow: "linebreak" },
        headStyles: { fillColor: [241, 233, 216], textColor: [32, 27, 20] },
        columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
      });
    }

    if (result.pageSpeed.fieldData?.available) {
      const fd = result.pageSpeed.fieldData;
      const fy = lastAutoTableY(doc) + 8;
      doc.setFontSize(8.5);
      doc.setTextColor(MUTED);
      doc.text(
        `Real-world Core Web Vitals (${fd.scope}-level, CrUX, past 28 days) \u2014 from actual Chrome users,\nthe higher-confidence number where it diverges from the lab run above.`,
        MARGIN,
        fy
      );
      autoTable(doc, {
        startY: fy + 8,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Metric", "Value"]],
        body: [
          ["Overall category", fd.overallCategory ?? "\u2014"],
          ["LCP (field)", fd.lcpMs != null ? `${fd.lcpMs} ms` : "\u2014"],
          ["CLS (field)", fd.clsScore != null ? String(fd.clsScore) : "\u2014"],
          ["INP (field)", fd.inpMs != null ? `${fd.inpMs} ms` : "\u2014"],
          ["FCP (field)", fd.fcpMs != null ? `${fd.fcpMs} ms` : "\u2014"],
        ],
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [241, 233, 216], textColor: [32, 27, 20] },
      });
    } else {
      const fy = lastAutoTableY(doc) + 8;
      doc.setFontSize(8);
      doc.setTextColor(MUTED);
      doc.text(
        "No real-world (CrUX) field data is available for this origin \u2014 not enough recorded Chrome traffic\nfor Google to report on. The lab metrics above are the best available signal.",
        MARGIN,
        fy
      );
    }
  }

  // Standalone Chrome UX Report lookup (lib/crux.ts) — distinct from
  // the PSI-embedded field data above, and NOT gated behind a
  // Lighthouse pass: this is fetched for every audit regardless of
  // plan, so it's the only source of real-user Core Web Vitals a
  // Free/Standard-plan report has at all (the block above only exists
  // when a Pro-plan Lighthouse pass was actually run). Previously
  // computed on every audit but never included in this export at all.
  if (result.crux.available && result.crux.metrics.length > 0) {
    const cy = lastAutoTableY(doc) + 10;
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(
      `Real-world Core Web Vitals (CrUX, past 28 days) \u2014 from actual Chrome users who visited\n${result.crux.origin ?? result.url}, not a simulated run.`,
      MARGIN,
      cy
    );
    autoTable(doc, {
      startY: cy + 8,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Metric", "Value (p75)", "Verdict"]],
      body: result.crux.metrics.map((m) => [
        m.label,
        m.unit === "ms" ? `${Math.round(m.p75)} ms` : String(m.p75.toFixed(2)),
        m.verdict === "good" ? "Good" : m.verdict === "needs-improvement" ? "Needs improvement" : "Poor",
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [241, 233, 216], textColor: [32, 27, 20] },
    });
  } else if (result.crux.reason === "no_data") {
    const cy = lastAutoTableY(doc) + 10;
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(
      "No real-world (CrUX) field data is available for this origin \u2014 not enough recorded Chrome traffic\nfor Google to report on.",
      MARGIN,
      cy
    );
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
        styles: { fontSize: 9.5, fontStyle: "bold", textColor: [32, 27, 20], cellPadding: { top: 2, bottom: 1, left: 0, right: 0 } },
      });
      const py = lastAutoTableY(doc);
      autoTable(doc, {
        startY: py,
        margin: { left: MARGIN, right: MARGIN },
        theme: "plain",
        body: [
          [{ content: "Problem", styles: { fontStyle: "bold", textColor: [110, 98, 82] } }, fix.problem],
          [{ content: "Evidence", styles: { fontStyle: "bold", textColor: [110, 98, 82] } }, fix.evidence],
          [{ content: "Fix", styles: { fontStyle: "bold", textColor: [110, 98, 82] } }, fix.fix],
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
      headStyles: { fillColor: [241, 233, 216], textColor: [32, 27, 20] },
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
        headStyles: { fillColor: [241, 233, 216], textColor: [32, 27, 20] },
      });
    }
  }

  footer(doc, result.url);
  doc.save(`audit-${result.url.replace(/[^a-z0-9.-]/gi, "_")}.pdf`);
}
