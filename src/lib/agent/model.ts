import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getAgentConfig } from "./config";
import { getSharedRateLimiter } from "./rate-limiter";

/**
 * Ordered by verified live HTTP 200 availability and lowest latency (~1.3s TTFT):
 * 1. gemini-3.5-flash-lite (1M context, ~1.3s response, zero 503 congestion)
 * 2. gemini-3.1-flash-lite (fast fallback, ~2.1s response)
 * 3. gemini-2.5-flash-lite (high-availability lite fallback)
 * 4. gemini-3.8-flash (latest 3.8 model, used when not experiencing 503 spikes)
 * 5. gemini-flash-lite-latest
 */
export const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-lite-latest",
];

export function resolveApiKey(apiKey?: string): string {
  const key = (
    apiKey ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  ).trim();
  if (!key) {
    throw new Error(
      "Missing Google Gemini API key. Click 'API Key' in the top header or set GOOGLE_API_KEY in your environment variables."
    );
  }
  return key;
}

/**
 * Creates an instance of ChatGoogleGenerativeAI with maxRetries: 0 so that
 * 503 High Demand or 404 errors immediately trigger AETHER's fast model failover
 * instead of hanging inside LangChain's internal exponential backoff.
 */
export function createAgentModel(
  apiKey?: string,
  modelOverride?: string
): ChatGoogleGenerativeAI {
  const key = resolveApiKey(apiKey);
  const config = getAgentConfig();
  const targetModel = (modelOverride || config.model).replace(/^models\//, "");

  return new ChatGoogleGenerativeAI({
    model: targetModel,
    apiKey: key,
    maxOutputTokens: config.maxOutputTokens,
    temperature: 0.2,
    maxRetries: 0,
  });
}

/**
 * Detects whether an LLM error was caused by model unavailability (404),
 * server congestion / high demand (503), rate limiting (429), or gateway timeouts (500/502/504).
 */
export function isRetryableModelError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("504") ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("resource exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("no longer available") ||
    msg.includes("not found") ||
    msg.includes("not supported for generatecontent") ||
    msg.includes("update your code to use models/") ||
    msg.includes("ttft_timeout")
  );
}

// Keep alias for backward-compatible unit tests
export const isModelNotFoundError = isRetryableModelError;

/**
 * Extracts a recommended replacement model directly from Google's error message if present
 * (e.g., "Please update your code to use models/gemini-3.8-flash").
 */
export function extractSuggestedModel(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  const useMatch = msg.match(/use\s+models\/([a-zA-Z0-9._-]+)/i);
  if (useMatch && useMatch[1]) {
    return useMatch[1].replace(/[.,;:]+$/, "");
  }
  return null;
}

/**
 * Builds a deduplicated failover list of models to try when the primary model fails with 503/404/429.
 */
export function buildModelFailoverList(
  failedModel: string,
  err?: unknown,
  discovered: string[] = []
): string[] {
  const candidates: string[] = [];

  for (const fallback of DEFAULT_FALLBACK_MODELS) {
    if (fallback !== failedModel && !candidates.includes(fallback)) {
      candidates.push(fallback);
    }
  }

  const suggested = err ? extractSuggestedModel(err) : null;
  if (suggested && suggested !== failedModel && !candidates.includes(suggested)) {
    candidates.unshift(suggested);
  }

  for (const d of discovered) {
    if (d !== failedModel && !candidates.includes(d)) {
      candidates.push(d);
    }
  }

  return candidates;
}

/**
 * Acquires a rate-limiter slot before issuing a request to Gemini.
 */
export async function throttleModelRequest(signal?: AbortSignal): Promise<void> {
  const config = getAgentConfig();
  const limiter = getSharedRateLimiter(config.rpm);
  await limiter.acquire(signal);
}
