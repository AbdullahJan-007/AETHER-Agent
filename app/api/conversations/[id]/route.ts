import { NextResponse } from "next/server";
import { validateLocalRequest } from "@/lib/security/proxy";
import { ConversationStore } from "@/lib/history/conversation-store";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const security = validateLocalRequest(request);
  if (!security.allowed) return security.response!;

  const { id } = await params;
  if (!ConversationStore.isValidUUID(id)) {
    return NextResponse.json({ success: false, error: "Invalid conversation ID." }, { status: 400 });
  }

  try {
    const convo = ConversationStore.getConversation(id);
    if (!convo) {
      return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, conversation: convo });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const security = validateLocalRequest(request);
  if (!security.allowed) return security.response!;

  const { id } = await params;
  if (!ConversationStore.isValidUUID(id)) {
    return NextResponse.json({ success: false, error: "Invalid conversation ID." }, { status: 400 });
  }

  try {
    const body = await request.json();
    if (typeof body.title === "string") {
      const ok = ConversationStore.renameConversation(id, body.title);
      if (!ok) {
        return NextResponse.json({ success: false, error: "Conversation not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    if (body.record) {
      body.record.id = id;
      body.record.updatedAt = new Date().toISOString();
      ConversationStore.saveConversation(body.record);
      return NextResponse.json({ success: true, conversation: body.record });
    }

    return NextResponse.json({ success: false, error: "Missing title or record payload." }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const security = validateLocalRequest(request);
  if (!security.allowed) return security.response!;

  const { id } = await params;
  if (!ConversationStore.isValidUUID(id)) {
    return NextResponse.json({ success: false, error: "Invalid conversation ID." }, { status: 400 });
  }

  try {
    const deleted = ConversationStore.deleteConversation(id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
