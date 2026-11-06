"use client";

import React, { useRef, useEffect } from "react";
import { User, Copy, Check, ShieldCheck, Eye } from "lucide-react";
import { AetherLogo } from "@/src/components/ui/aether-logo";
import { WorkLog } from "./work-log";
import type { ChatMessageRecord } from "@/src/lib/types/conversation";
import type { ProposedChange } from "@/src/lib/agent/tools/types";
import { toast } from "sonner";

export interface MessageListProps {
  messages: ChatMessageRecord[];
  isStreaming: boolean;
  onOpenReview?: (changes: ProposedChange[]) => void;
}

export function MessageList({
  messages,
  isStreaming,
  onOpenReview,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-24 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-stone-200/80 flex items-center justify-center mb-3.5">
            <AetherLogo size={28} />
          </div>
          <h2 className="text-base font-bold text-stone-900 font-sans tracking-tight">
            How can AETHER help you engineer today?
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-sm leading-relaxed">
            Ready to explore your codebase, build production features, design UI systems, or debug test failures.
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
              <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 shadow-2xs flex items-center justify-center shrink-0 mt-0.5">
                <AetherLogo size={16} />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-xs rounded-br-xs"
                  : "bg-white border border-stone-200/90 text-stone-900 shadow-xs rounded-bl-xs"
              }`}
            >
              {msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0 && (
                <WorkLog toolCalls={msg.toolCalls} />
              )}

              {/* Message Content */}
              {msg.content ? (
                <div className="whitespace-pre-wrap font-sans leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                isStreaming &&
                msg.role === "assistant" &&
                (!msg.toolCalls || msg.toolCalls.length === 0) && (
                  <div className="text-xs text-stone-400 italic">Thinking...</div>
                )
              )}

              {/* Staged Changes Card */}
              {msg.stagedDiffs && msg.stagedDiffs.length > 0 && (
                <div className="mt-3.5 p-3 rounded-xl bg-orange-50/40 border border-orange-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-orange-600" strokeWidth={1.9} />
                      <span className="text-xs font-semibold text-stone-800">
                        {msg.stagedDiffs.length} Staged Change
                        {msg.stagedDiffs.length === 1 ? "" : "s"} Pending
                      </span>
                    </div>

                    {onOpenReview && (
                      <button
                        type="button"
                        onClick={() => onOpenReview(msg.stagedDiffs!)}
                        className="px-2.5 py-1 text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" strokeWidth={1.9} />
                        Review & Save
                      </button>
                    )}
                  </div>
                </div>
              )}

              {msg.role === "assistant" && msg.content && (
                <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(msg.id, msg.content)}
                    className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.9} />
                    )}
                  </button>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-orange-700" strokeWidth={1.9} />
              </div>
            )}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
