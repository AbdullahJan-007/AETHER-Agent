import { NextRequest } from "next/server";
import { GeminiClient, PromptBuilder, EngineerMode, AttachedFile } from "@/lib/gemini";
import { SecretVault } from "@/lib/security";

export const runtime = "nodejs";

const MAX_MESSAGES = 50;
const MAX_ATTACHMENTS = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, mode = "build", attachedFiles = [] } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages array is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: `Exceeded maximum message limit of ${MAX_MESSAGES}.` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (Array.isArray(attachedFiles) && attachedFiles.length > MAX_ATTACHMENTS) {
      return new Response(JSON.stringify({ error: `Exceeded maximum attachment limit of ${MAX_ATTACHMENTS}.` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = PromptBuilder.buildFullStackSystemPrompt(
      mode as EngineerMode,
      attachedFiles as AttachedFile[]
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = GeminiClient.streamChat(messages, systemPrompt, req.signal);
          for await (const chunk of generator) {
            if (req.signal.aborted) break;
            const sanitizedChunk = SecretVault.redactSecrets(chunk);
            const sseData = `data: ${JSON.stringify({ chunk: sanitizedChunk })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
          if (!req.signal.aborted) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
          controller.close();
        } catch (streamError: unknown) {
          if (!req.signal.aborted) {
            const errMsg = streamError instanceof Error ? streamError.message : "Stream error";
            const errData = `data: ${JSON.stringify({ error: errMsg })}\n\n`;
            controller.enqueue(encoder.encode(errData));
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
