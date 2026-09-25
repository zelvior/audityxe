"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const analyze_1 = require("./engine/analyze");
const history_1 = require("./history");
const VERSION = "1.1.3";
const HELP = `
audityxe — free, unlimited, local-first website audit

USAGE
  audityxe <url> [options]
  audityxe history [url]

OPTIONS
  --deep                 Run the deep crawl (up to 25 pages, 3 hops) instead
                          of the default fast crawl (homepage sample only).
  --compare <url>        Also audit a second URL and print a head-to-head
                          comparison (category-by-category and overall).
  --psi-key <key>        Your own free Google PageSpeed Insights API key —
                          adds a real-browser Lighthouse pass, and enables
                          the real-user Core Web Vitals (CrUX) module. Get
                          one free at
                          https://developers.google.com/speed/docs/insights/v5/get-started
  --min-score <n>        Exit with a non-zero status code if the overall
                          score is below <n> (0-100). Designed for CI gates.
  --track                Save this run's score to a local history file
                          (~/.audityxe/history.json) so you can see the
                          trend over time with \`audityxe history <url>\`.
  --json                 Print the full result as JSON instead of a
                          formatted terminal report (also useful piped to
                          \`jq\`, saved to a file, etc).
  --no-color             Disable ANSI colors in terminal output.
  -h, --help             Show this help.
  -v, --version          Show the CLI version.

SUBCOMMANDS
  audityxe history              List every URL you've tracked with --track,
                                 and its most recent score.
  audityxe history <url>        Show the full score trend for one URL —
                                 every tracked run, oldest to newest.

EXAMPLES
  audityxe https://example.com
  audityxe https://example.com --deep --min-score 80
  audityxe https://example.com --compare https://competitor.com
  audityxe https://example.com --track
  audityxe history https://example.com
  audityxe https://example.com --json > report.json

Everything runs on your own machine — the only network requests made are
to the URL(s) you're auditing (and Google's PageSpeed API, only if you pass
--psi-key). --track writes only to a local file on your own disk — nothing
is ever sent anywhere. No account, no signup, no rate limit. Same audit
engine as https://audityxe.vercel.app, MIT-equivalent licensed — see
https://github.com/zelvior/audityxe/blob/main/LICENSE.md
`.trim();
function parseArgs(argv) {
    const args = { deep: false, track: false, json: false, color: true, help: false, version: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        switch (a) {
            case "-h":
            case "--help":
                args.help = true;
                break;
            case "-v":
            case "--version":
                args.version = true;
                break;
            case "--deep":
                args.deep = true;
                break;
            case "--track":
                args.track = true;
                break;
            case "--json":
                args.json = true;
                break;
            case "--no-color":
                args.color = false;
                break;
            case "--compare":
                args.compareUrl = argv[++i];
                break;
            case "--psi-key":
                args.psiKey = argv[++i];
                break;
            case "--min-score": {
                const n = Number(argv[++i]);
                if (!Number.isFinite(n) || n < 0 || n > 100) {
                    throw new Error("--min-score must be a number between 0 and 100.");
                }
                args.minScore = n;
                break;
            }
            default:
                if (!a.startsWith("-") && !args.url)
                    args.url = a;
                break;
        }
    }
    return args;
}
// Minimal, dependency-free ANSI helpers — a real package like `chalk`
// isn't worth the extra install weight for a handful of colors.
function color(enabled) {
    const wrap = (code) => (s) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : s);
    return {
        bold: wrap("1"),
        dim: wrap("2"),
        green: wrap("32"),
        yellow: wrap("33"),
        red: wrap("31"),
        cyan: wrap("36"),
    };
}
function scoreColor(c, score) {
    if (score === null)
        return c.dim;
    if (score >= 80)
        return c.green;
    if (score >= 50)
        return c.yellow;
    return c.red;
}
function statusSymbol(c, status) {
    if (status === "good")
        return c.green("✓");
    if (status === "warning")
        return c.yellow("!");
    return c.red("✗");
}
function printReport(result, useColor) {
    const c = color(useColor);
    const sc = scoreColor(c, result.overall);
    console.log("");
    console.log(c.bold(`Audit: ${result.url}`));
    console.log(sc(c.bold(`Overall score: ${result.overall}/100`)) + "  " + c.dim(result.verdict));
    console.log("");
    console.log(c.bold("Categories"));
    for (const cat of result.categories) {
        const catColor = scoreColor(c, cat.score);
        console.log(`  ${catColor(String(cat.score).padStart(3))}  ${cat.label}`);
    }
    console.log("");
    console.log(c.bold("Modules"));
    for (const mod of result.modules) {
        const scoreLabel = mod.score === null ? c.dim("n/a") : scoreColor(c, mod.score)(String(mod.score));
        console.log(`  ${statusSymbol(c, mod.status)} ${mod.label} ${c.dim(`(${scoreLabel})`)}`);
        console.log(`    ${c.dim(mod.summary)}`);
        const notable = mod.findings.filter((f) => f.status !== "pass").slice(0, 5);
        for (const f of notable) {
            const symbol = f.status === "fail" ? c.red("  ✗") : c.yellow("  !");
            console.log(`  ${symbol} ${f.label} — ${c.dim(f.detail)}`);
        }
    }
    console.log("");
    if (result.fixes.length > 0) {
        console.log(c.bold(`Top fixes (${result.fixes.length})`));
        for (const fix of result.fixes.slice(0, 10)) {
            console.log(`  • ${c.bold(fix.target)}: ${fix.problem}`);
            console.log(`    ${c.dim("→ " + fix.fix)}`);
        }
        console.log("");
    }
}
function printComparison(result, useColor) {
    const c = color(useColor);
    const comp = result.competitor;
    if (!comp) {
        console.log(c.dim("\n(No comparison data returned for the --compare URL.)"));
        return;
    }
    console.log("");
    console.log(c.bold("Head-to-head"));
    const leftLabel = result.url;
    const rightLabel = comp.url;
    const overallDiff = result.overall - comp.overall;
    const overallArrow = overallDiff > 0 ? c.green("▲ ahead") : overallDiff < 0 ? c.red("▼ behind") : c.dim("= tied");
    console.log(`  Overall   ${String(result.overall).padStart(5)}  vs  ${String(comp.overall).padEnd(5)}   ${overallArrow}`);
    for (const cat of result.categories) {
        const other = comp.categories.find((cc) => cc.label === cat.label);
        if (!other)
            continue;
        const diff = cat.score - other.score;
        const arrow = diff > 0 ? c.green("▲") : diff < 0 ? c.red("▼") : c.dim("=");
        console.log(`  ${cat.label.padEnd(28)} ${String(cat.score).padStart(5)}  vs  ${String(other.score).padEnd(5)}   ${arrow}`);
    }
    if (comp.summary.length > 0) {
        console.log("");
        console.log(c.dim(`Compared: ${leftLabel} vs ${rightLabel}`));
        for (const line of comp.summary)
            console.log(`  • ${line}`);
    }
    console.log("");
}
function printHistoryList(useColor) {
    const c = color(useColor);
    const tracked = (0, history_1.readAllTrackedUrls)();
    if (tracked.length === 0) {
        console.log(`No tracked history yet. Run \`audityxe <url> --track\` at least once first.`);
        console.log(c.dim(`(History file: ${(0, history_1.getHistoryFilePath)()})`));
        return;
    }
    console.log(c.bold(`Tracked URLs (${tracked.length})`));
    for (const { url, latest } of tracked) {
        const sc = scoreColor(c, latest.overall);
        console.log(`  ${sc(String(latest.overall).padStart(5))}  ${url}  ${c.dim(new Date(latest.timestamp).toLocaleDateString())}`);
    }
    console.log(c.dim(`\n${(0, history_1.getHistoryFilePath)()}`));
}
function printHistoryForUrl(url, useColor) {
    const c = color(useColor);
    const entries = (0, history_1.readHistoryForUrl)(url);
    if (entries.length === 0) {
        console.log(`No tracked history for ${url} yet. Run \`audityxe ${url} --track\` first.`);
        return;
    }
    console.log(c.bold(`History: ${url} (${entries.length} run${entries.length > 1 ? "s" : ""})`));
    console.log("");
    let prev = null;
    for (const e of entries) {
        const sc = scoreColor(c, e.overall);
        const diff = prev ? e.overall - prev.overall : 0;
        const trend = !prev ? "" : diff > 0 ? c.green(` (+${diff.toFixed(1)})`) : diff < 0 ? c.red(` (${diff.toFixed(1)})`) : c.dim(" (=)");
        console.log(`  ${new Date(e.timestamp).toLocaleString().padEnd(22)} ${sc(String(e.overall).padStart(5))}${trend}`);
        prev = e;
    }
    console.log("");
}
async function handleHistoryCommand(argv, useColor) {
    const url = argv.find((a) => !a.startsWith("-"));
    if (url)
        printHistoryForUrl(url, useColor);
    else
        printHistoryList(useColor);
}
async function main(argv) {
    if (argv[0] === "history") {
        await handleHistoryCommand(argv.slice(1), !argv.includes("--no-color"));
        return;
    }
    let args;
    try {
        args = parseArgs(argv);
    }
    catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 2;
        return;
    }
    if (args.help || (!args.url && !args.version)) {
        console.log(HELP);
        return;
    }
    if (args.version) {
        console.log(VERSION);
        return;
    }
    const options = {
        crawlMode: args.deep ? "deep" : "fast",
        includePageSpeed: !!args.psiKey,
        psiByokKey: args.psiKey || null,
        // The CLI doesn't (yet) support the AI-generated promo copy/banner
        // feature — it needs a BYOK AI key with no CLI flag for it in this
        // v1, and is out of scope for a CI/local audit tool anyway. Explicit
        // false here (rather than the engine's own default of true) avoids
        // two guaranteed-to-fail AI calls, and the console warnings that
        // come with them, on every single run.
        includePromo: false,
    };
    let result;
    try {
        result = await (0, analyze_1.runAudit)(args.url, args.compareUrl, options);
    }
    catch (err) {
        console.error(`Audit failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
        return;
    }
    if (args.track) {
        (0, history_1.appendHistoryEntry)({
            url: result.url,
            timestamp: new Date().toISOString(),
            overall: result.overall,
            categories: result.categories.map((c) => ({ label: c.label, score: c.score })),
        });
    }
    if (args.json) {
        console.log(JSON.stringify(result, null, 2));
    }
    else {
        printReport(result, args.color);
        if (args.compareUrl)
            printComparison(result, args.color);
        if (args.track)
            console.log(color(args.color).dim(`Saved to history. View the trend with: audityxe history ${result.url}`));
    }
    if (args.minScore !== undefined && result.overall < args.minScore) {
        if (!args.json) {
            console.error(color(args.color).red(`\nFAILED: overall score ${result.overall} is below --min-score ${args.minScore}.`));
        }
        process.exitCode = 1;
    }
}
