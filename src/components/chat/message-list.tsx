"use client";

import React, { useRef, useEffect } from "react";
import { User, Bot, Copy, FilePlus2, Check } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { ThinkingDrawer } from "./thinking-drawer";
import { PlanChecklist } from "./plan-checklist";
import type { ExtractedFile } from "@/lib/gemini/stream-parser";
import { useWorkstationStore } from "@/store/workstation-store";
import { DiffCalculator } from "@/lib/workspace/diff-calculator";
import { toast } from "sonner";

export interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  isThinking?: boolean;
  plan?: string;
  extractedFiles?: ExtractedFile[];
}

export interface MessageListProps {
  messages: UiMessage[];
  isStreaming: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isStreaming }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { addStagedDiff } = useWorkstationStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleStageFile = (file: ExtractedFile) => {
    const diff = DiffCalculator.calculateDiff(file.path, "", file.content);
    addStagedDiff(diff);
    toast.success(`Staged ${file.path} in Diff Reviewer`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-16">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-3">
            <Bot className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-300">AETHER Full-Stack Engineer</h2>
          <p className="text-xs max-w-sm mt-1 text-slate-400">
            Select your local repository above to inspect the architecture, run tests, and generate production code with staged diffs.
          </p>
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl p-3.5 leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-[#12151e] border border-[#242b3d] text-slate-200"
              }`}
            >
              {msg.role === "assistant" && (
                <>
                  <ThinkingDrawer
                    thinking={msg.thinking || ""}
                    isThinking={msg.isThinking || false}
                  />
                  <PlanChecklist planText={msg.plan || ""} />
                </>
              )}

              {/* Message text */}
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Extracted Code Files with Staging triggers */}
              {msg.extractedFiles && msg.extractedFiles.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-[#242b3d] pt-3">
                  <span className="text-[11px] font-semibold text-indigo-400 font-mono">
                    Generated Code Files ({msg.extractedFiles.length}):
                  </span>
                  {msg.extractedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[#242b3d] bg-[#1a1f2c] overflow-hidden font-mono text-xs"
                    >
                      <div className="px-3 py-1.5 bg-[#222838] flex items-center justify-between border-b border-[#242b3d]">
                        <span className="text-indigo-300 font-medium truncate">{f.path}</span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copyToClipboard(f.content)}
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleStageFile(f)}
                          >
                            <FilePlus2 className="w-3 h-3" />
                            <span>Stage in Diff</span>
                          </Button>
                        </div>
                      </div>
                      <pre className="p-3 overflow-x-auto text-slate-300 max-h-56">
                        {f.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-[#1a1f2c] border border-[#242b3d] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
};
