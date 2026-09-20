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
}

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("Audityxe");

  context.subscriptions.push(
    vscode.commands.registerCommand("audityxe.auditUrl", () => runAudit(false)),
    vscode.commands.registerCommand("audityxe.auditUrlDeep", () => runAudit(true))
  );
}

export function deactivate() {}

async function runAudit(deep: boolean): Promise<void> {
  const url = await vscode.window.showInputBox({
    prompt: "URL to audit",
    placeHolder: "https://example.com",
    validateInput: (v) => (v && /^https?:\/\//i.test(v) ? null : "Enter a full URL, including https://"),
  });
  if (!url) return;

  output.clear();
  output.show(true);
  output.appendLine(`Auditing ${url}${deep ? " (deep crawl)" : ""}…`);
  output.appendLine("Running entirely on your machine via npx audityxe-cli — no account, no limit.\n");

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Audityxe: auditing ${url}`, cancellable: false },
    () =>
      new Promise<void>((resolve) => {
        const args = deep ? "--deep --json" : "--json";
        // npx audityxe-cli isn't installed by this extension — it's
        // fetched on demand the same way any `npx <package>` invocation
        // works, and needs Node + npm on PATH in the integrated
        // terminal's environment (the same one this exec inherits).
        exec(
          `npx --yes audityxe-cli@latest "${url.replace(/"/g, '\\"')}" ${args}`,
          { maxBuffer: 1024 * 1024 * 20, timeout: 120000 },
          (err, stdout, stderr) => {
            if (err && !stdout) {
              output.appendLine("Audit failed to run.");
              output.appendLine(stderr || err.message);
              output.appendLine(
                "\nIs Node.js/npm installed and on PATH? Try running the same command in a terminal:\n" +
                  `npx audityxe-cli "${url}"`
              );
              vscode.window.showErrorMessage("Audityxe: audit failed to run — see the Audityxe output panel.");
              resolve();
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
            resolve();
          }
        );
      })
  );
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
