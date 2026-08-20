/**
 * Generic Gemini client with per-task API keys and automatic failover.
 *
 * Each "task" (e.g. VERDICT, PROMO) can have its own dedicated API key(s),
 * configured in .env.local. Multiple keys per task can be supplied as a
 * comma-separated list for redundancy — if one key is rate-limited or
 * invalid, the next one in the list is tried automatically. If every key
 * for a task fails (or none is configured), the caller is expected to
 * fall back to a non-AI heuristic — this module never throws to the
 * caller, it just returns null on total failure.
 */

export type GeminiTask = "VERDICT" | "PROMO" | "FIXES" | "BANNER";

interface CallOptions {
  temperature?: number;
  timeoutMs?: number;
}

/** Filters out empty strings and obvious unfilled placeholder values (e.g.
 * "your_verdict_task_key_here") so a real shared key isn't shadowed by a
 * placeholder left in a task-specific slot. Real Gemini API keys are long
 * opaque strings — placeholders are short and human-readable. */
function isPlausibleKey(key: string): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  if (lower.includes("your_") || lower.includes("_here") || lower.includes("placeholder")) return false;
  if (lower.includes(" ")) return false;
  if (key.length < 20) return false;
  return true;
}

/** Reads the comma-separated key list for a given task. Task-specific
 * keys (GEMINI_API_KEY_<TASK>) are tried first, falling back to the
 * shared GEMINI_API_KEY list — both lists are merged (not either/or), so
 * a valid shared key is never shadowed by an unfilled task-specific
 * placeholder, and a task can also supply extra keys on top of the
 * shared pool. Duplicates and invalid/placeholder entries are dropped. */
function keysForTask(task: GeminiTask): string[] {
  const taskSpecific = (process.env[`GEMINI_API_KEY_${task}`] || "")
    .split(",")
    .map((k) => k.trim())
    .filter(isPlausibleKey);
  const shared = (process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(isPlausibleKey);

  const merged = [...taskSpecific, ...shared];
  return Array.from(new Set(merged));
}

function modelForTask(task: GeminiTask): string {
  return (
    process.env[`GEMINI_MODEL_${task}`] ||
    process.env.GEMINI_MODEL ||
    "gemini-2.0-flash"
  );
}

function timeoutForTask(task: GeminiTask): number {
  const taskSpecific = process.env[`GEMINI_TIMEOUT_MS_${task}`];
  const shared = process.env.GEMINI_TIMEOUT_MS;
  const raw = taskSpecific || shared;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15000;
}

interface KeyAttemptResult {
  ok: boolean;
  text?: string;
  retryable: boolean;
  reason?: string;
}

/** Pulls a JSON object out of a model response even if it's wrapped in
 * markdown fences or preceded/followed by stray text. */
function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1).trim();
  }
  return text.trim();
}

async function callGeminiWithKey(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number,
  temperature: number
): Promise<KeyAttemptResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature, responseMimeType: "application/json" },
        }),
      }
    );

    if (res.status === 429 || res.status === 503) {
      // Rate-limited or overloaded — safe to retry with the next key.
      return { ok: false, retryable: true, reason: `status ${res.status}` };
    }
    if (res.status === 401 || res.status === 403) {
      // Bad/revoked key for this task — try the next key, not this one again.
      return { ok: false, retryable: true, reason: `auth error ${res.status}` };
    }
    if (!res.ok) {
      return { ok: false, retryable: true, reason: `status ${res.status}` };
    }

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, retryable: true, reason: "empty response" };
    }
    return { ok: true, text, retryable: false };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, retryable: true, reason: aborted ? "timeout" : "network error" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs a JSON-producing Gemini prompt for a given task, trying every
 * configured key for that task in order until one succeeds. Returns the
 * parsed JSON object, or null if every key failed / none configured.
 */
export async function generateJsonForTask<T>(
  task: GeminiTask,
  prompt: string,
  options: CallOptions = {}
): Promise<T | null> {
  const keys = keysForTask(task);
  if (keys.length === 0) {
    console.warn(`[gemini:${task}] no valid API key configured — set GEMINI_API_KEY or GEMINI_API_KEY_${task} in .env.local`);
    return null;
  }

  const model = modelForTask(task);
  const timeoutMs = options.timeoutMs ?? timeoutForTask(task);
  const temperature = options.temperature ?? 0.8;

  const failures: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const result = await callGeminiWithKey(keys[i], model, prompt, timeoutMs, temperature);

    if (result.ok && result.text) {
      try {
        const cleaned = extractJsonBlock(result.text);
        return JSON.parse(cleaned) as T;
      } catch {
        failures.push(`key #${i + 1}: malformed JSON`);
        continue; // try next key
      }
    }

    failures.push(`key #${i + 1}: ${result.reason}`);
    if (!result.retryable) break;
  }

  if (failures.length > 0) {
    console.warn(`[gemini:${task}] all keys failed — ${failures.join("; ")}`);
  }
  return null;
}
