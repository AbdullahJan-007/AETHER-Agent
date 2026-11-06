import type { ProposedChange } from "./tools/types";

export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool_start"; id: string; name: string; input: any; summary: string }
  | { type: "tool_end"; id: string; name: string; ok: boolean; summary: string; output?: string }
  | { type: "change"; change: ProposedChange }
  | { type: "error"; message: string }
  | { type: "done"; reason?: "completed" | "aborted" | "max_steps" | "error" };

export interface AgentRunOptions {
  root: string;
  mode: "build" | "architect" | "debug" | "review";
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  attachedFiles?: Array<{ path: string; content: string }>;
  signal?: AbortSignal;
}
