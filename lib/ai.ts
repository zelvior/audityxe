/**
 * Generic OpenAI-compatible chat-completions client with per-task API
 * keys and automatic failover. Swappable provider via env vars:
 *
 *   AI_BASE_URL   default: https://api.tokenrouter.com/v1
 *   AI_MODEL      default: nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
 *   AI_API_KEY    shared key list (comma-separated for redundancy)
 *   AI_API_KEY_<TASK>  task-specific keys, tried before the shared list
 *   AI_MODEL_<TASK>    task-specific model override
 *
 * Any OpenAI-compatible provider works by pointing AI_BASE_URL /
 * AI_MODEL at it — no code changes needed to switch providers.
 */

export type AiTask = "VERDICT" | "PROMO" | "FIXES" | "BANNER";

interface CallOptions {
  temperature?: number;
  timeoutMs?: number;
}

function isPlausibleKey(key: string): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  if (lower.includes("your_") || lower.includes("_here") || lower.includes("placeholder")) return false;
  if (lower.includes(" ")) return false;
  if (key.length < 10) return false;
  return true;
}

function keysForTask(task: AiTask): string[] {
  const taskSpecific = (process.env[`AI_API_KEY_${task}`] || "")
    .split(",")
    .map((k) => k.trim())
    .filter(isPlausibleKey);
  const shared = (process.env.AI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(isPlausibleKey);

  return Array.from(new Set([...taskSpecific, ...shared]));
}

function modelForTask(task: AiTask): string {
  return (
    process.env[`AI_MODEL_${task}`] ||
    process.env.AI_MODEL ||
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
  );
}

function timeoutForTask(task: AiTask): number {
  const raw = process.env[`AI_TIMEOUT_MS_${task}`] || process.env.AI_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15000;
}

/** Normalizes a base URL to always end at .../chat/completions, whether
 * the configured base includes /v1, ends with a slash, or is the bare
 * root — per TokenRouter's note that clients handle this differently. */
function chatCompletionsUrl(): string {
  const base = (process.env.AI_BASE_URL || "https://api.tokenrouter.com/v1").replace(/\/+$/, "");
  if (base.endsWith("/chat/completions")) return base;
  if (/\/v\d+$/.test(base)) return `${base}/chat/completions`;
  return `${base}/v1/chat/completions`;
}

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

interface KeyAttemptResult {
  ok: boolean;
  text?: string;
  retryable: boolean;
  reason?: string;
}

async function callWithKey(
  apiKey: string,
  model: string,
  prompt: string,
  timeoutMs: number,
  temperature: number
): Promise<KeyAttemptResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(chatCompletionsUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (res.status === 429 || res.status === 503) {
      return { ok: false, retryable: true, reason: `rate-limited/overloaded (${res.status})` };
    }
    if (res.status === 401 || res.status === 403) {
      const body = await res.json().catch(() => null);
      const apiMessage = body?.error?.message ? ` — ${body.error.message}` : "";
      return { ok: false, retryable: true, reason: `auth error ${res.status}${apiMessage}` };
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const apiMessage = body?.error?.message ? ` — ${body.error.message}` : "";
      return { ok: false, retryable: true, reason: `status ${res.status}${apiMessage}` };
    }

    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
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
 * Runs a JSON-producing chat-completion prompt for a given task, trying
 * every configured key for that task in order until one succeeds.
 * Returns the parsed JSON object, or null if every key failed / none
 * configured — callers are expected to fall back to a non-AI heuristic.
 */
export async function generateJsonForTask<T>(
  task: AiTask,
  prompt: string,
  options: CallOptions = {}
): Promise<T | null> {
  const keys = keysForTask(task);
  if (keys.length === 0) {
    console.warn(`[ai:${task}] no valid API key configured — set AI_API_KEY or AI_API_KEY_${task}`);
    return null;
  }

  const model = modelForTask(task);
  const timeoutMs = options.timeoutMs ?? timeoutForTask(task);
  const temperature = options.temperature ?? 0.8;
  const failures: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const result = await callWithKey(keys[i], model, prompt, timeoutMs, temperature);

    if (result.ok && result.text) {
      try {
        return JSON.parse(extractJsonBlock(result.text)) as T;
      } catch {
        failures.push(`key #${i + 1}: malformed JSON`);
        continue;
      }
    }
    failures.push(`key #${i + 1}: ${result.reason}`);
    if (!result.retryable) break;
  }

  if (failures.length > 0) {
    console.warn(`[ai:${task}] all keys failed — ${failures.join("; ")}`);
  }
  return null;
}
