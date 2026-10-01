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
    /** System-role instructions prepended to the conversation — use this
     * for durable behavioral instructions (role, constraints, output
     * contract) rather than folding everything into the user prompt. */
    systemPrompt?: string;
    /** BYOK override: when set, this key/baseUrl/model are used INSTEAD
     * of the shared server-configured credentials for this single call.
     * Used for Pro-only, bring-your-own-key features like promo copy. */
    byok?: {
        apiKey: string;
        baseUrl?: string | null;
        model?: string | null;
    };
}
/**
 * Runs a JSON-producing chat-completion prompt for a given task, trying
 * every configured key for that task in order until one succeeds.
 * Returns the parsed JSON object, or null if every key failed / none
 * configured — callers are expected to fall back to a non-AI heuristic.
 */
export declare function generateJsonForTask<T>(task: AiTask, prompt: string, options?: CallOptions): Promise<T | null>;
export {};
