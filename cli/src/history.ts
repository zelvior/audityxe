import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Opt-in (--track), purely local trend tracking — a flat JSON file at
 * ~/.audityxe/history.json, one array of every tracked run. No server,
 * no account, nothing leaves the machine; this is just enough
 * persistence to answer "did this get better or worse since last
 * time" without needing the hosted app's account system at all.
 */

export interface HistoryEntry {
  url: string;
  timestamp: string;
  overall: number;
  categories: { label: string; score: number }[];
}

function historyFilePath(): string {
  const dir = path.join(os.homedir(), ".audityxe");
  return path.join(dir, "history.json");
}

function readAll(): HistoryEntry[] {
  try {
    const raw = fs.readFileSync(historyFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): void {
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

export function appendHistoryEntry(entry: HistoryEntry): void {
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
function normalizeUrlKey(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

export function readHistoryForUrl(url: string): HistoryEntry[] {
  const key = normalizeUrlKey(url);
  return readAll()
    .filter((e) => normalizeUrlKey(e.url) === key)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function readAllTrackedUrls(): { url: string; latest: HistoryEntry }[] {
  const all = readAll();
  const byUrl = new Map<string, HistoryEntry[]>();
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

export function getHistoryFilePath(): string {
  return historyFilePath();
}
