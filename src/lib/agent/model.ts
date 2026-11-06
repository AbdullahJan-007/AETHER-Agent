import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getAgentConfig } from "./config";
import { getSharedRateLimiter } from "./rate-limiter";

export const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-4-argon",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
];

export function resolveApiKey(apiKey?: string): string {
  const key = (apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    throw new Error(
      "Missing Google Gemini API key. Click 'API Key' in the top header or set GOOGLE_API_KEY in your environment variables."
    );
  }
  return key;
}

/**
 * Creates an instance of ChatGoogleGenerativeAI configured with project defaults.
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
    maxRetries: 1,
  });
}

/**
 * Detects whether an LLM error was caused by a deprecated, retired, or unavailable model ID (HTTP 404).
 */
export function isModelNotFoundError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("404") ||
    msg.includes("no longer available") ||
    msg.includes("not found") ||
    msg.includes("not supported for generatecontent") ||
    msg.includes("update your code to use models/")
  );
}

/**
 * Extracts a recommended replacement model directly from Google's error message if present
 * (e.g., "Please update your code to use models/gemini-3.8-flash").
 */
export function extractSuggestedModel(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/models\/([a-zA-Z0-9._-]+)/);
  if (match && match[1]) {
    // Look for "use models/<name>" first if multiple models appear in message
    const useMatch = msg.match(/use\s+models\/([a-zA-Z0-9._-]+)/i);
    if (useMatch && useMatch[1]) {
      return useMatch[1].replace(/[.,;:]+$/, "");
    }
  }
  return null;
}

/**
 * Dynamically queries the Google Generative Language API to discover active models
 * that support generateContent for the current API key.
 */
export async function discoverAvailableModels(apiKey?: string): Promise<string[]> {
  try {
    const key = resolveApiKey(apiKey);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      { method: "GET" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.models)) return [];

    const valid: string[] = [];
    for (const m of data.models) {
      const name = typeof m.name === "string" ? m.name.replace(/^models\//, "") : "";
      const methods: string[] = Array.isArray(m.supportedGenerationMethods)
        ? m.supportedGenerationMethods
        : [];
      if (
        name &&
        methods.includes("generateContent") &&
        name.startsWith("gemini-") &&
        !name.includes("embedding") &&
        !name.includes("tts") &&
        !name.includes("image") &&
        !name.includes("vision") &&
        !name.includes("aqa")
      ) {
        valid.push(name);
      }
    }

    // Prioritize flash and 3.x / 4.x models first
    valid.sort((a, b) => {
      const score = (id: string) => {
        if (id === "gemini-3.8-flash") return 100;
        if (id.startsWith("gemini-3.8")) return 90;
        if (id.startsWith("gemini-4")) return 85;
        if (id.startsWith("gemini-3.5")) return 80;
        if (id.startsWith("gemini-3")) return 75;
        if (id.includes("flash")) return 60;
        return 40;
      };
      return score(b) - score(a);
    });

    return valid;
  } catch {
    return [];
  }
}

/**
 * Builds a deduplicated failover list of models to try when the primary model fails with 404.
 */
export function buildModelFailoverList(
  failedModel: string,
  err?: unknown,
  discovered: string[] = []
): string[] {
  const candidates: string[] = [];
  const suggested = err ? extractSuggestedModel(err) : null;
  if (suggested && suggested !== failedModel) {
    candidates.push(suggested);
  }
  for (const d of discovered) {
    if (d !== failedModel && !candidates.includes(d)) {
      candidates.push(d);
    }
  }
  for (const fallback of DEFAULT_FALLBACK_MODELS) {
    if (fallback !== failedModel && !candidates.includes(fallback)) {
      candidates.push(fallback);
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
