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
exports.appendHistoryEntry = appendHistoryEntry;
exports.readHistoryForUrl = readHistoryForUrl;
exports.readAllTrackedUrls = readAllTrackedUrls;
exports.getHistoryFilePath = getHistoryFilePath;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
function historyFilePath() {
    const dir = path.join(os.homedir(), ".audityxe");
    return path.join(dir, "history.json");
}
function readAll() {
    try {
        const raw = fs.readFileSync(historyFilePath(), "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function writeAll(entries) {
    const filePath = historyFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
}
// A capped history file (not an ever-growing log) — enough to see a
// real trend without becoming an unbounded, forever-growing file
// someone forgets is there. Per-URL, not global: a project auditing
// many different URLs shouldn't have one URL's history crowd out
// another's.
const MAX_ENTRIES_PER_URL = 200;
function appendHistoryEntry(entry) {
    const all = readAll();
    const forUrl = all.filter((e) => e.url === entry.url);
    const others = all.filter((e) => e.url !== entry.url);
    const updated = [...forUrl, entry].slice(-MAX_ENTRIES_PER_URL);
    writeAll([...others, ...updated]);
}
// Storage always keys by the same bare-hostname form runAudit itself
// returns as `result.url` (e.g. "github.com", not
// "https://github.com/") — normalizing the *lookup* argument the same
// way means `audityxe history github.com` and
// `audityxe history https://github.com/` both find the same entries,
// instead of silently returning nothing because of a protocol/slash
// mismatch that isn't obvious from the CLI's own report output (which
// displays that same bare-hostname form).
function normalizeUrlKey(input) {
    return input
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .toLowerCase();
}
function readHistoryForUrl(url) {
    const key = normalizeUrlKey(url);
    return readAll()
        .filter((e) => normalizeUrlKey(e.url) === key)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
function readAllTrackedUrls() {
    const all = readAll();
    const byUrl = new Map();
    for (const e of all) {
        const list = byUrl.get(e.url) || [];
        list.push(e);
        byUrl.set(e.url, list);
    }
    return Array.from(byUrl.entries()).map(([url, entries]) => {
        const sorted = entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return { url, latest: sorted[sorted.length - 1] };
    });
}
function getHistoryFilePath() {
    return historyFilePath();
}
