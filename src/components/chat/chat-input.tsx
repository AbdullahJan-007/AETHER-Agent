"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Square, Hammer, Compass, Bug, ShieldCheck, Paperclip, X } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import type { EngineerMode, AttachedFile } from "@/lib/gemini/prompt-builder";

export interface ChatInputProps {
  onSendMessage: (text: string, mode: EngineerMode, attachments: AttachedFile[]) => void;
  onStopGeneration?: () => void;
  isGenerating: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  isGenerating,
}) => {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<EngineerMode>("build");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isGenerating) return;

    onSendMessage(input.trim(), mode, attachments);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
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

  const modes: Array<{ id: EngineerMode; label: string; icon: React.ReactNode }> = [
    { id: "build", label: "Build", icon: <Hammer className="w-3 h-3" /> },
    { id: "architect", label: "Architect", icon: <Compass className="w-3 h-3" /> },
    { id: "debug", label: "Debug", icon: <Bug className="w-3 h-3" /> },
    { id: "review", label: "Review", icon: <ShieldCheck className="w-3 h-3" /> },
  ];

  return (
    <div className="border-t border-[#242b3d] bg-[#12151e] p-3 space-y-2">
      {/* Mode Selector & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                mode === m.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-[#1a1f2c] text-slate-400 hover:text-slate-200 border border-[#242b3d]"
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>

        <Badge variant="outline" className="text-[10px] text-slate-500 font-mono">
          Gemini 2.5 Flash • Free Tier
        </Badge>
      </div>

      {/* Attachment Chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachments.map((att, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1a1f2c] border border-[#242b3d] text-xs text-indigo-300 font-mono"
            >
              <Paperclip className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[150px]">{att.name}</span>
              <button onClick={() => removeAttachment(i)} className="hover:text-red-400">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Box */}
      <div className="relative flex items-end gap-2 bg-[#1a1f2c] border border-[#242b3d] rounded-xl p-2 focus-within:border-indigo-500 transition-colors">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          multiple
          className="hidden"
        />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          title="Attach files or logs"
          className="text-slate-400 hover:text-slate-200 shrink-0 mb-0.5"
        >
          <Paperclip className="w-4 h-4" />
        </Button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Describe full-stack features, paste logs, or request architectural refactors (Ctrl+Enter to send)..."
          rows={1}
          className="w-full bg-transparent text-slate-200 text-xs sm:text-sm focus:outline-none resize-none leading-relaxed max-h-44 py-1"
        />

        {isGenerating ? (
          <Button
            size="icon"
            variant="destructive"
            onClick={onStopGeneration}
            title="Stop generation"
            className="shrink-0 mb-0.5"
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="primary"
            onClick={() => handleSubmit()}
            disabled={!input.trim() && attachments.length === 0}
            title="Send prompt (Ctrl+Enter)"
            className="shrink-0 mb-0.5"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
