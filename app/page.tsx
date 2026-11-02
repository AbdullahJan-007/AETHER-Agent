"use client";

import React, { useState, useRef } from "react";
import { WorkstationHeader } from "@/components/layout";
import { ProjectSwitcher, FileTree, StagedDiffViewer } from "@/components/workspace";
import { TerminalDrawer } from "@/components/terminal";
import { MessageList, ChatInput, UiMessage } from "@/components/chat";
import { StreamParser } from "@/lib/gemini/stream-parser";
import type { EngineerMode, AttachedFile } from "@/lib/gemini/prompt-builder";
import { DiffCalculator } from "@/lib/workspace/diff-calculator";
import { useWorkstationStore, workstationStore } from "@/store/workstation-store";
import { toast } from "sonner";

export default function WorkstationPage() {
  const { selectedFile, selectedFileContent, setSelectedFile, addStagedDiff } =
    useWorkstationStore();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rightTab, setRightTab] = useState<"files" | "diff">("files");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = async (
    text: string,
    mode: EngineerMode,
    attachments: AttachedFile[]
  ) => {
    const userMsg: UiMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: text,
    };

    const assistantMsgId = Math.random().toString(36).substring(2, 9);
    const initialAssistantMsg: UiMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      isThinking: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const parser = new StreamParser();

    try {
      const chatPayload = {
        messages: [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        mode,
        attachedFiles: attachments,
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatPayload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream response");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.chunk) {
                parser.feed(parsed.chunk);
                const streamState = parser.getState();

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: streamState.cleanText,
                          thinking: streamState.thinking,
                          isThinking: streamState.isThinking,
                          plan: streamState.plan,
                          extractedFiles: streamState.extractedFiles,
                        }
                      : m
                  )
                );
              }
            } catch {
              // Ignore partial JSON chunks
            }
          }
        }
      }

      // Automatically stage generated files in Diff Reviewer
      const finalState = parser.getState();
      if (finalState.extractedFiles.length > 0) {
        const currentRoot = workstationStore.getState().projectRoot;

        for (const file of finalState.extractedFiles) {
          try {
            const stageRes = await fetch("/api/workspace", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "stage",
                file: file.path,
                content: file.content,
                root: currentRoot || undefined,
              }),
            });

            const stageData = await stageRes.json();
            if (stageData.success && stageData.diff) {
              addStagedDiff({ ...stageData.diff, newContent: file.content });
            } else {
              const fallbackDiff = DiffCalculator.calculateDiff(file.path, "", file.content);
              addStagedDiff(fallbackDiff);
            }
          } catch {
            const fallbackDiff = DiffCalculator.calculateDiff(file.path, "", file.content);
            addStagedDiff(fallbackDiff);
          }
        }

        setRightTab("diff");
        toast.info(
          `${finalState.extractedFiles.length} file(s) generated. Staged in Diff Reviewer.`
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info("Generation cancelled by user.");
      } else {
        const msg = err instanceof Error ? err.message : "Error";
        toast.error(`AETHER engine error: ${msg}`);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090a0f] text-slate-200">
      <WorkstationHeader activeRightTab={rightTab} onTabChange={setRightTab} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Chat, Input & Terminal Runner */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-[#242b3d]">
          <ProjectSwitcher />

          <MessageList messages={messages} isStreaming={isGenerating} />

          <ChatInput
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            isGenerating={isGenerating}
          />

          <TerminalDrawer
            onFixWithAI={(errLog) => handleSendMessage(errLog, "debug", [])}
          />
        </div>

        {/* Right Column: Files & Staged Diff Inspector */}
        <div className="hidden lg:flex flex-col w-96 shrink-0 bg-[#12151e]">
          {rightTab === "files" ? (
            <div className="flex flex-col h-full">
              <FileTree />
              {selectedFile && selectedFileContent !== null && (
                <div className="border-t border-[#242b3d] p-3 max-h-56 overflow-y-auto bg-[#090a0f] font-mono text-xs">
                  <div className="text-slate-400 font-semibold mb-1 truncate">
                    {selectedFile}
                  </div>
                  <pre className="whitespace-pre-wrap text-slate-300">
                    {selectedFileContent}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <StagedDiffViewer />
          )}
        </div>
      </div>
    </div>
  );
}
