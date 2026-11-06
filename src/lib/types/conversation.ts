import type { ProposedChange } from "../agent/tools/types";

export interface ToolCallRecord {
  id: string;
  name: string;
  summary: string;
  ok?: boolean;
  output?: string;
}

export interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  plan?: string;
  toolCalls?: ToolCallRecord[];
  stagedDiffs?: ProposedChange[];
  createdAt?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  projectRoot: string;
  mode: "build" | "architect" | "debug" | "review";
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationRecord {
  id: string;
  title: string;
  projectRoot: string;
  mode: "build" | "architect" | "debug" | "review";
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageRecord[];
}
