import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class GeminiClient {
  private static instance: GoogleGenAI | null = null;
  private static lastCallTimes: number[] = [];
  private static readonly RATE_LIMIT_RPM = 15;
  private static readonly MODEL_NAME = "gemini-2.5-flash";
  private static readonly MAX_RETRIES = 3;

  private static getClient(): GoogleGenAI {
    if (!this.instance) {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GOOGLE_API_KEY is not configured. Please add your free Gemini API key to .env.local"
        );
      }
      this.instance = new GoogleGenAI({ apiKey });
    }
    return this.instance;
  }

  /**
   * Enforces 15 RPM free-tier rate limit queue.
   */
  private static async throttle(): Promise<void> {
    const now = Date.now();
    this.lastCallTimes = this.lastCallTimes.filter((t) => now - t < 60_000);

    if (this.lastCallTimes.length >= this.RATE_LIMIT_RPM) {
      const oldest = this.lastCallTimes[0];
      const waitMs = 60_000 - (now - oldest) + 500;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.lastCallTimes.push(Date.now());
  }

  /**
   * Normalizes message history to adhere to Gemini API constraints:
   * 1. No empty text contents.
   * 2. No consecutive turns with the same role.
   * 3. Must begin with a user turn.
   */
  private static normalizeMessages(messages: ChatMessage[]): Array<{ role: string; parts: [{ text: string }] }> {
    const valid = messages.filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0);
    if (valid.length === 0) {
      return [{ role: "user", parts: [{ text: "Hello" }] }];
    }

    const collapsed: Array<{ role: "user" | "model"; text: string }> = [];

    for (const msg of valid) {
      const role = msg.role === "assistant" ? "model" : "user";
      const last = collapsed[collapsed.length - 1];

      if (last && last.role === role) {
        last.text += `\n\n${msg.content}`;
      } else {
        collapsed.push({ role, text: msg.content });
      }
    }

    // Ensure begins with user
    if (collapsed[0]?.role !== "user") {
      collapsed.unshift({ role: "user", text: "Proceed with the request." });
    }

    return collapsed.map((c) => ({
      role: c.role,
      parts: [{ text: c.text }],
    }));
  }

  /**
   * Streams chat response using the official @google/genai SDK with retry backoff and abort signal.
   */
  public static async *streamChat(
    messages: ChatMessage[],
    systemInstruction: string,
    signal?: AbortSignal
  ): AsyncIterable<string> {
    const ai = this.getClient();
    const contents = this.normalizeMessages(messages);

    let attempt = 0;
    while (attempt < this.MAX_RETRIES) {
      if (signal?.aborted) return;
      attempt++;

      try {
        await this.throttle();
        if (signal?.aborted) return;

        const responseStream = await ai.models.generateContentStream({
          model: this.MODEL_NAME,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });

        for await (const chunk of responseStream) {
          if (signal?.aborted) return;
          const text = chunk.text;
          if (text) {
            yield text;
          }
        }

        return; // Success, exit retry loop
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isTransient = /429|503|500|resource_exhausted|rate_limit/i.test(errorMsg);

        if (isTransient && attempt < this.MAX_RETRIES && !signal?.aborted) {
          const jitter = Math.random() * 500;
          const delay = Math.pow(2, attempt) * 1000 + jitter;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw err;
      }
    }
  }
}
