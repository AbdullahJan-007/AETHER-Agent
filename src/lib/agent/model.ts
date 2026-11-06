import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getAgentConfig } from "./config";
import { getSharedRateLimiter } from "./rate-limiter";

/**
 * Creates an instance of ChatGoogleGenerativeAI configured with project defaults.
 */
export function createAgentModel(apiKey?: string): ChatGoogleGenerativeAI {
  const key = apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "Missing Google Gemini API key. Set GOOGLE_API_KEY in your .env.local file."
    );
  }

  const config = getAgentConfig();

  return new ChatGoogleGenerativeAI({
    model: config.model,
    apiKey: key,
    maxOutputTokens: config.maxOutputTokens,
    temperature: 0.2,
    maxRetries: 2,
  });
}

/**
 * Acquires a rate-limiter slot before issuing a request to Gemini.
 */
export async function throttleModelRequest(signal?: AbortSignal): Promise<void> {
  const config = getAgentConfig();
  const limiter = getSharedRateLimiter(config.rpm);
  await limiter.acquire(signal);
}
