import { NextResponse } from "next/server";
import { validateLocalRequest } from "@/src/lib/security/proxy";
import { PathGuard } from "@/src/lib/security/path-guard";
import { runAgent } from "@/src/lib/agent/run-agent";
import type { AgentRunOptions } from "@/src/lib/agent/events";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const securityCheck = validateLocalRequest(request);
  if (!securityCheck.allowed) {
    return securityCheck.response!;
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { root, mode = "build", messages = [], attachedFiles = [] } = body;

  if (!root || typeof root !== "string") {
    return NextResponse.json(
      { error: "A valid workspace project root path is required." },
      { status: 400 }
    );
  }

  const rootCheck = PathGuard.validateRoot(root);
  if (!rootCheck.safe) {
    return NextResponse.json(
      { error: rootCheck.error || "Invalid workspace root directory." },
      { status: 400 }
    );
  }

  const canonicalRoot = rootCheck.canonicalPath;
  const opts: AgentRunOptions = {
    root: canonicalRoot,
    mode,
    messages,
    attachedFiles,
    signal: request.signal,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runAgent(opts)) {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const errPayload = `data: ${JSON.stringify({ type: "error", message: errorMsg })}\n\n`;
        controller.enqueue(encoder.encode(errPayload));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
