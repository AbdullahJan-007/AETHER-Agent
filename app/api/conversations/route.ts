import { NextResponse } from "next/server";
import { validateLocalRequest } from "@/src/lib/security/proxy";
import { ConversationStore } from "@/src/lib/history/conversation-store";
import type { ConversationRecord } from "@/src/lib/types/conversation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const security = validateLocalRequest(request);
  if (!security.allowed) return security.response!;

  try {
    const list = ConversationStore.listSummaries();
    return NextResponse.json({ success: true, conversations: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const security = validateLocalRequest(request);
  if (!security.allowed) return security.response!;

  try {
    const body = await request.json();
    let id = body.id;
    if (!id || typeof id !== "string") {
      id = crypto.randomUUID();
    }

    if (!ConversationStore.isValidUUID(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid conversation UUID format." },
        { status: 400 }
      );
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    let title = body.title;

    // Auto-generate title from first user message if not supplied
    if (!title || typeof title !== "string" || title.trim() === "") {
      const firstUserMsg = messages.find((m: any) => m.role === "user");
      if (firstUserMsg && typeof firstUserMsg.content === "string") {
        title = firstUserMsg.content.slice(0, 60).trim();
      } else {
        title = "New conversation";
      }
    }

    const now = new Date().toISOString();
    const record: ConversationRecord = {
      id,
      title,
      projectRoot: body.projectRoot || "",
      mode: body.mode || "build",
      createdAt: body.createdAt || now,
      updatedAt: now,
      messages,
    };

    ConversationStore.saveConversation(record);
    return NextResponse.json({ success: true, conversation: record });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
