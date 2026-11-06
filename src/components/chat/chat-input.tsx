"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Square,
  Hammer,
  Compass,
  Bug,
  ShieldCheck,
  Paperclip,
  X,
  AlertTriangle,
} from "lucide-react";
import type { AgentMode } from "@/src/lib/agent/system-prompt";

export interface AttachedFile {
  name: string;
  content: string;
}

export interface ChatInputProps {
  onSendMessage: (text: string, mode: AgentMode, attachments: AttachedFile[]) => void;
  onStopGeneration?: () => void;
  isGenerating: boolean;
  activeMode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
}

export function ChatInput({
  onSendMessage,
  onStopGeneration,
  isGenerating,
  activeMode,
  onModeChange,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isGenerating) return;

    onSendMessage(input.trim(), activeMode, attachments);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setAttachments((prev) => [...prev, { name: file.name, content }]);
        }
      };
      reader.readAsText(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const pasteError = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setInput((prev) => `${prev ? prev + "\n\n" : ""}Here is the error/stack trace:\n\`\`\`\n${clipText}\n\`\`\``);
      }
    } catch {
      setInput((prev) => `${prev ? prev + "\n\n" : ""}Here is the error/stack trace:\n\`\`\`\n[Paste error output here]\n\`\`\``);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  return (
    <div className="p-3 sm:p-4 bg-white/80 border-t border-stone-200/80 backdrop-blur-md">
      {/* Mode bar & Quick buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1 p-0.5 bg-stone-100/80 rounded-xl border border-stone-200/60">
          {(
            [
              { id: "build", label: "Build", icon: Hammer },
              { id: "architect", label: "Architect", icon: Compass },
              { id: "debug", label: "Debug", icon: Bug },
              { id: "review", label: "Review", icon: ShieldCheck },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const isActive = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onModeChange(m.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-orange-500" : "text-stone-400"}`} strokeWidth={1.9} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={pasteError}
            className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 rounded-lg border border-stone-200/80 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.9} />
            <span>Paste Error</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-stone-600 hover:bg-stone-100 rounded-lg border border-stone-200/80 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Paperclip className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.9} />
            <span>Attach File</span>
          </button>
        </div>
      </div>

      {/* Attachment Pills */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg text-xs text-orange-900"
            >
              <span className="font-mono truncate max-w-[150px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Textarea & Controls */}
      <div className="flex items-end gap-2 bg-white rounded-2xl border border-stone-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 p-2 shadow-xs transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask AETHER to implement a feature, inspect files, or debug a test failure..."
          rows={1}
          className="flex-1 max-h-48 resize-none bg-transparent px-2 py-1 text-xs sm:text-sm text-stone-900 focus:outline-hidden placeholder:text-stone-400 leading-relaxed"
        />

        {isGenerating ? (
          <button
            type="button"
            onClick={onStopGeneration}
            className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            title="Stop generation"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!input.trim() && attachments.length === 0}
            className="p-2 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
