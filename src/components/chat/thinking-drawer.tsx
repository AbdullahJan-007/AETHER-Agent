"use client";

import React, { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export interface ThinkingDrawerProps {
  thinking: string;
  isThinking: boolean;
}

export const ThinkingDrawer: React.FC<ThinkingDrawerProps> = ({ thinking, isThinking }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!thinking && !isThinking) return null;

  return (
    <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden text-xs font-mono">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className={`w-4 h-4 ${isThinking ? "animate-pulse text-amber-300" : ""}`} />
          <span className="font-semibold">
            {isThinking ? "AETHER Deep Cognition in Progress..." : "Cognitive Reasoning Trace"}
          </span>
          {isThinking && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-amber-500/70">
          <span>{isExpanded ? "Collapse" : "Expand"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 text-amber-200/80 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto border-t border-amber-500/10">
          {thinking || "Analyzing full-stack architecture, dependencies, and boundary constraints..."}
        </div>
      )}
    </div>
  );
};
