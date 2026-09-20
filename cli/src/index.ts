import { runAudit, AuditOptions } from "./engine/analyze";
import type { AuditResult, AuditModule } from "./engine/types";

const VERSION = "1.0.0";

const HELP = `
audityxe — free, unlimited, local-first website audit

USAGE
  audityxe <url> [options]

OPTIONS
  --deep                 Run the deep crawl (up to 25 pages, 3 hops) instead
                          of the default fast crawl (homepage sample only).
  --psi-key <key>        Your own free Google PageSpeed Insights API key —
                          adds a real-browser Lighthouse pass. Get one free
                          at https://developers.google.com/speed/docs/insights/v5/get-started
  --min-score <n>        Exit with a non-zero status code if the overall
                          score is below <n> (0-100). Designed for CI gates.
  --json                 Print the full result as JSON instead of a
                          formatted terminal report (also useful piped to
                          \`jq\`, saved to a file, etc).
  --no-color             Disable ANSI colors in terminal output.
  -h, --help             Show this help.
  -v, --version          Show the CLI version.

EXAMPLES
  audityxe https://example.com
  audityxe https://example.com --deep --min-score 80
  audityxe https://example.com --json > report.json

Everything runs on your own machine — the only network requests made are
to the URL you're auditing (and Google's PageSpeed API, only if you pass
--psi-key). No account, no signup, no rate limit, no data sent anywhere
else. Same audit engine as https://audityxe.vercel.app, MIT-equivalent
licensed — see https://github.com/zelvior/audityxe/blob/main/LICENSE.md
`.trim();

interface ParsedArgs {
  url?: string;
  deep: boolean;
  psiKey?: string;
  minScore?: number;
  json: boolean;
  color: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { deep: false, json: false, color: true, help: false, version: false };
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
      case "--json":
        args.json = true;
        break;
      case "--no-color":
        args.color = false;
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
        if (!a.startsWith("-") && !args.url) args.url = a;
        break;
    }
  }
  return args;
}

// Minimal, dependency-free ANSI helpers — a real package like `chalk`
// isn't worth the extra install weight for a handful of colors.
function color(enabled: boolean) {
  const wrap = (code: string) => (s: string) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : s);
  return {
    bold: wrap("1"),
    dim: wrap("2"),
    green: wrap("32"),
    yellow: wrap("33"),
    red: wrap("31"),
    cyan: wrap("36"),
  };
}

function scoreColor(c: ReturnType<typeof color>, score: number | null): (s: string) => string {
  if (score === null) return c.dim;
  if (score >= 80) return c.green;
  if (score >= 50) return c.yellow;
  return c.red;
}

function statusSymbol(c: ReturnType<typeof color>, status: AuditModule["status"]): string {
  if (status === "good") return c.green("✓");
  if (status === "warning") return c.yellow("!");
  return c.red("✗");
}

function printReport(result: AuditResult, useColor: boolean): void {
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

export async function main(argv: string[]): Promise<void> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
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

  const options: AuditOptions = {
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

  let result: AuditResult;
  try {
    result = await runAudit(args.url!, undefined, options);
  } catch (err) {
    console.error(`Audit failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
    return;
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printReport(result, args.color);
  }

  if (args.minScore !== undefined && result.overall < args.minScore) {
    if (!args.json) {
      console.error(
        color(args.color).red(`\nFAILED: overall score ${result.overall} is below --min-score ${args.minScore}.`)
      );
    }
    process.exitCode = 1;
  }
}
