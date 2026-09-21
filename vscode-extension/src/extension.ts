import * as vscode from "vscode";
import { exec } from "node:child_process";

interface AuditResultSummary {
  url: string;
  overall: number;
  verdict: string;
  categories: { label: string; score: number }[];
  modules: {
    label: string;
    status: "good" | "warning" | "critical";
    score: number | null;
    summary: string;
    findings: { label: string; status: string; detail: string }[];
  }[];
  competitor?: {
    url: string;
    overall: number;
    categories: { label: string; score: number }[];
  };
}

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("Audityxe");

  context.subscriptions.push(
    vscode.commands.registerCommand("audityxe.auditUrl", () => runAudit(false)),
    vscode.commands.registerCommand("audityxe.auditUrlDeep", () => runAudit(true)),
    vscode.commands.registerCommand("audityxe.compareUrls", () => runCompare()),
    vscode.commands.registerCommand("audityxe.viewHistory", () => viewHistory())
  );
}

export function deactivate() {}

async function promptForUrl(prompt: string): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt,
    placeHolder: "https://example.com",
    validateInput: (v) => (v && /^https?:\/\//i.test(v) ? null : "Enter a full URL, including https://"),
  });
}

/** Shells out to `npx audityxe-cli`, same as every command here — this
 * extension has no audit logic of its own, it's a thin front end over
 * the CLI (see ../cli). `args` are passed through as-is; the caller is
 * responsible for shell-quoting anything derived from user input. */
function runCli(args: string, timeoutMs = 120000): Promise<{ stdout: string; stderr: string; failed: boolean }> {
  return new Promise((resolve) => {
    exec(`npx --yes audityxe-cli@latest ${args}`, { maxBuffer: 1024 * 1024 * 20, timeout: timeoutMs }, (err, stdout, stderr) => {
      resolve({ stdout, stderr, failed: !!err && !stdout });
    });
  });
}

function quote(url: string): string {
  return `"${url.replace(/"/g, '\\"')}"`;
}

async function runAudit(deep: boolean): Promise<void> {
  const url = await promptForUrl("URL to audit");
  if (!url) return;

  output.clear();
  output.show(true);
  output.appendLine(`Auditing ${url}${deep ? " (deep crawl)" : ""}…`);
  output.appendLine("Running entirely on your machine via npx audityxe-cli — no account, no limit.\n");

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Audityxe: auditing ${url}`, cancellable: false },
    async () => {
      const args = `${quote(url)} ${deep ? "--deep " : ""}--json`;
      const { stdout, stderr, failed } = await runCli(args);
      if (failed) {
        reportCliFailure(stderr, url);
        return;
      }
      try {
        const result: AuditResultSummary = JSON.parse(stdout);
        printReport(result);
        vscode.window.showInformationMessage(
          `Audityxe: ${url} scored ${result.overall}/100 — see the Audityxe output panel for details.`
        );
      } catch {
        output.appendLine("Couldn't parse the audit output:");
        output.appendLine(stdout);
        output.appendLine(stderr);
      }
    }
  );
}

async function runCompare(): Promise<void> {
  const url = await promptForUrl("Your URL");
  if (!url) return;
  const compareUrl = await promptForUrl("Compare against (competitor URL)");
  if (!compareUrl) return;

  output.clear();
  output.show(true);
  output.appendLine(`Comparing ${url} vs ${compareUrl}…`);
  output.appendLine("Auditing both URLs fully — this takes longer than a single audit.\n");

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Audityxe: comparing ${url} vs ${compareUrl}`, cancellable: false },
    async () => {
      const args = `${quote(url)} --compare ${quote(compareUrl)} --json`;
      const { stdout, stderr, failed } = await runCli(args, 180000);
      if (failed) {
        reportCliFailure(stderr, url);
        return;
      }
      try {
        const result: AuditResultSummary = JSON.parse(stdout);
        printReport(result);
        if (result.competitor) {
          printComparison(result);
          vscode.window.showInformationMessage(
            `Audityxe: ${url} (${result.overall}) vs ${result.competitor.url} (${result.competitor.overall}) — see the Audityxe output panel.`
          );
        } else {
          output.appendLine(
            "\n(No comparison data — the competitor URL may have been slow, unreachable, or blocked automated requests. The primary audit above is still complete.)"
          );
          vscode.window.showWarningMessage(`Audityxe: audited ${url}, but the comparison against ${compareUrl} didn't complete.`);
        }
      } catch {
        output.appendLine("Couldn't parse the audit output:");
        output.appendLine(stdout);
        output.appendLine(stderr);
      }
    }
  );
}

async function viewHistory(): Promise<void> {
  const url = await vscode.window.showInputBox({
    prompt: "URL to view history for (leave blank to list every tracked URL)",
    placeHolder: "https://example.com",
  });

  output.clear();
  output.show(true);

  const args = url ? `history ${quote(url)} --no-color` : `history --no-color`;
  const { stdout, stderr, failed } = await runCli(args, 15000);
  if (failed) {
    output.appendLine("Couldn't read history.");
    output.appendLine(stderr);
    return;
  }
  output.appendLine(stdout.trim());
  output.appendLine("\n(Tracked by running `audityxe <url> --track` from a terminal, or wire --track into your own scripts — this extension doesn't create history entries itself, only reads them.)");
}

function reportCliFailure(stderr: string, url: string): void {
  output.appendLine("Audit failed to run.");
  output.appendLine(stderr);
  output.appendLine(
    "\nIs Node.js/npm installed and on PATH? Try running the same command in a terminal:\n" + `npx audityxe-cli "${url}"`
  );
  vscode.window.showErrorMessage("Audityxe: audit failed to run — see the Audityxe output panel.");
}

function printReport(result: AuditResultSummary): void {
  output.appendLine(`Overall score: ${result.overall}/100`);
  output.appendLine(result.verdict);
  output.appendLine("");
  output.appendLine("Categories:");
  for (const c of result.categories) {
    output.appendLine(`  ${String(c.score).padStart(5)}  ${c.label}`);
  }
  output.appendLine("");
  output.appendLine("Modules:");
  for (const m of result.modules) {
    const symbol = m.status === "good" ? "✓" : m.status === "warning" ? "!" : "✗";
    const score = m.score === null ? "n/a" : String(m.score);
    output.appendLine(`  ${symbol} ${m.label} (${score})`);
    const notable = m.findings.filter((f) => f.status !== "pass").slice(0, 5);
    for (const f of notable) {
      output.appendLine(`      - ${f.label}: ${f.detail}`);
    }
  }
}

function printComparison(result: AuditResultSummary): void {
  const comp = result.competitor!;
  output.appendLine("");
  output.appendLine(`Head-to-head: ${result.url} vs ${comp.url}`);
  output.appendLine(`  Overall   ${result.overall}  vs  ${comp.overall}`);
  for (const cat of result.categories) {
    const other = comp.categories.find((c) => c.label === cat.label);
    if (!other) continue;
    output.appendLine(`  ${cat.label.padEnd(28)} ${String(cat.score).padStart(5)}  vs  ${String(other.score)}`);
  }
}
