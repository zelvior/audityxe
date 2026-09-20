"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_child_process_1 = require("node:child_process");
let output;
function activate(context) {
    output = vscode.window.createOutputChannel("Audityxe");
    context.subscriptions.push(vscode.commands.registerCommand("audityxe.auditUrl", () => runAudit(false)), vscode.commands.registerCommand("audityxe.auditUrlDeep", () => runAudit(true)));
}
function deactivate() { }
async function runAudit(deep) {
    const url = await vscode.window.showInputBox({
        prompt: "URL to audit",
        placeHolder: "https://example.com",
        validateInput: (v) => (v && /^https?:\/\//i.test(v) ? null : "Enter a full URL, including https://"),
    });
    if (!url)
        return;
    output.clear();
    output.show(true);
    output.appendLine(`Auditing ${url}${deep ? " (deep crawl)" : ""}…`);
    output.appendLine("Running entirely on your machine via npx audityxe-cli — no account, no limit.\n");
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Audityxe: auditing ${url}`, cancellable: false }, () => new Promise((resolve) => {
        const args = deep ? "--deep --json" : "--json";
        // npx audityxe-cli isn't installed by this extension — it's
        // fetched on demand the same way any `npx <package>` invocation
        // works, and needs Node + npm on PATH in the integrated
        // terminal's environment (the same one this exec inherits).
        (0, node_child_process_1.exec)(`npx --yes audityxe-cli@latest "${url.replace(/"/g, '\\"')}" ${args}`, { maxBuffer: 1024 * 1024 * 20, timeout: 120000 }, (err, stdout, stderr) => {
            if (err && !stdout) {
                output.appendLine("Audit failed to run.");
                output.appendLine(stderr || err.message);
                output.appendLine("\nIs Node.js/npm installed and on PATH? Try running the same command in a terminal:\n" +
                    `npx audityxe-cli "${url}"`);
                vscode.window.showErrorMessage("Audityxe: audit failed to run — see the Audityxe output panel.");
                resolve();
                return;
            }
            try {
                const result = JSON.parse(stdout);
                printReport(result);
                vscode.window.showInformationMessage(`Audityxe: ${url} scored ${result.overall}/100 — see the Audityxe output panel for details.`);
            }
            catch {
                output.appendLine("Couldn't parse the audit output:");
                output.appendLine(stdout);
                output.appendLine(stderr);
            }
            resolve();
        });
    }));
}
function printReport(result) {
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
//# sourceMappingURL=extension.js.map