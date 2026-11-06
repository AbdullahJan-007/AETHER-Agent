"use client";

import { useState, useRef, useCallback } from "react";
import type {
  ChatMessageRecord,
  ToolCallRecord,
} from "@/lib/types/conversation";
import type { ProposedChange } from "@/lib/agent/tools/types";
import type { AgentEvent } from "@/lib/agent/events";
import { toast } from "sonner";

interface SendMessageOptions {
  content: string;
  root: string;
  mode: "build" | "architect" | "debug" | "review";
  existingMessages: ChatMessageRecord[];
  attachedFiles?: Array<{ path: string; content: string }>;
  virtualFiles?: Record<string, string>;
  apiKey?: string;
  onUpdate: (messages: ChatMessageRecord[]) => void;
  onFinished: (messages: ChatMessageRecord[], proposals: ProposedChange[]) => void;
}

export function useChatSession() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [proposedChanges, setProposedChanges] = useState<ProposedChange[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      toast.info("Agent run stopped.");
    }
  }, []);

  const sendMessage = useCallback(
    async ({
      content,
      root,
      mode,
      existingMessages,
      attachedFiles = [],
      virtualFiles,
      apiKey,
      onUpdate,
      onFinished,
    }: SendMessageOptions) => {
      const userMessageId = crypto.randomUUID();
      const assistantMessageId = crypto.randomUUID();
      const now = new Date().toISOString();

      const userMsg: ChatMessageRecord = {
        id: userMessageId,
        role: "user",
        content,
        createdAt: now,
      };

      const assistantMsg: ChatMessageRecord = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        toolCalls: [],
        stagedDiffs: [],
        createdAt: now,
      };

      const updatedMessages = [...existingMessages, userMsg, assistantMsg];
      onUpdate(updatedMessages);

      setIsStreaming(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const stagedMap = new Map<string, ProposedChange>();
      const currentToolCalls: ToolCallRecord[] = [];
      let fullAssistantText = "";

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            root,
            mode,
            messages: updatedMessages.slice(0, -1).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            attachedFiles,
            virtualFiles,
            apiKey,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No readable stream response from agent.");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6);
            let event: AgentEvent;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            if (event.type === "token") {
              fullAssistantText += event.text;
              assistantMsg.content = fullAssistantText;
              onUpdate([...updatedMessages.slice(0, -1), { ...assistantMsg }]);
            } else if (event.type === "tool_start") {
              currentToolCalls.push({
                id: event.id,
                name: event.name,
                summary: event.summary,
              });
              assistantMsg.toolCalls = [...currentToolCalls];
              onUpdate([...updatedMessages.slice(0, -1), { ...assistantMsg }]);
            } else if (event.type === "tool_end") {
              const idx = currentToolCalls.findIndex((t) => t.id === event.id);
              if (idx !== -1) {
                currentToolCalls[idx] = {
                  ...currentToolCalls[idx],
                  ok: event.ok,
                  summary: event.summary,
                  output: event.output,
                };
              }
              assistantMsg.toolCalls = [...currentToolCalls];
              onUpdate([...updatedMessages.slice(0, -1), { ...assistantMsg }]);
            } else if (event.type === "change") {
              stagedMap.set(event.change.path, event.change);
              const list = Array.from(stagedMap.values());
              setProposedChanges(list);
              assistantMsg.stagedDiffs = list;
              onUpdate([...updatedMessages.slice(0, -1), { ...assistantMsg }]);
            } else if (event.type === "error") {
              toast.error(event.message);
            } else if (event.type === "done") {
              // Finalize
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Handled via stop
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(msg);
          assistantMsg.content += `\n\n*[Execution error: ${msg}]*`;
          onUpdate([...updatedMessages.slice(0, -1), { ...assistantMsg }]);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
        const finalProposals = Array.from(stagedMap.values());
        setProposedChanges(finalProposals);
        onFinished(
          [...updatedMessages.slice(0, -1), { ...assistantMsg }],
          finalProposals
        );
      }
    },
    []
  );

  return {
    isStreaming,
    proposedChanges,
    setProposedChanges,
    sendMessage,
    stop,
  };
}
