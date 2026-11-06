/**
 * Central, environment-driven limits for the AETHER agent.
 *
 * AETHER runs on the user's own machine or hybrid Vercel cloud, so these defaults
 * are tuned for low latency (fast Time-To-First-Token) and high reliability.
 * Every value can be overridden in `.env.local`.
 */
export interface AgentConfig {
  /** Gemini model id used by the agent. */
  model: string;
  /** Maximum model turns (think → tool → think …) per user request. */
  maxSteps: number;
  /** Upper bound on tokens the model may generate per turn. */
  maxOutputTokens: number;
  /** Requests per minute sent to Gemini. 0 disables client-side throttling. */
  rpm: number;
  /** Largest file `read_file` will return in one call, in bytes. */
  readFileMaxBytes: number;
  /** Characters of prior conversation sent to the model (oldest trimmed first). */
  historyCharBudget: number;
  /** Timeout for `run_check` commands (tests, lint, build…), in milliseconds. */
  checkTimeoutMs: number;
  /** Maximum matches `search_code` returns. */
  searchMaxMatches: number;
  /** Maximum proposed file changes per request. */
  maxProposals: number;
}

const DEPRECATED_OR_OVERLOADED_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]);

export function resolveActiveModel(rawModel?: string): string {
  const candidate = (rawModel || "").trim().replace(/^models\//, "");
  if (!candidate || DEPRECATED_OR_OVERLOADED_MODELS.has(candidate)) {
    return "gemini-3.5-flash-lite";
  }
  return candidate;
}

function readInt(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

export function getAgentConfig(): AgentConfig {
  return {
    model: resolveActiveModel(process.env.AETHER_MODEL),
    maxSteps: readInt("AETHER_MAX_STEPS", 30, 1),
    maxOutputTokens: readInt("AETHER_MAX_OUTPUT_TOKENS", 16_384, 256),
    rpm: readInt("AETHER_RPM", 0, 0),
    readFileMaxBytes: readInt("AETHER_READ_FILE_MAX_BYTES", 2_000_000, 1_000),
    historyCharBudget: readInt("AETHER_HISTORY_CHAR_BUDGET", 3_000_000, 10_000),
    checkTimeoutMs: readInt("AETHER_CHECK_TIMEOUT_MS", 600_000, 5_000),
    searchMaxMatches: readInt("AETHER_SEARCH_MAX_MATCHES", 300, 1),
    maxProposals: readInt("AETHER_MAX_PROPOSALS", 200, 1),
  };
}
