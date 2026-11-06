"use client";

import React, { useState } from "react";
import {
  Folder,
  FileText,
  Search,
  FileEdit,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ToolCallRecord } from "@/src/lib/types/conversation";

interface WorkLogProps {
  toolCalls?: ToolCallRecord[];
}

export function WorkLog({ toolCalls }: WorkLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!toolCalls || toolCalls.length === 0) return null;

  const getToolIcon = (name: string) => {
    switch (name) {
      case "list_files":
        return <Folder className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={1.9} />;
      case "read_file":
        return <FileText className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={1.9} />;
      case "search_code":
        return <Search className="w-4 h-4 text-purple-600 shrink-0" strokeWidth={1.9} />;
      case "stage_patch":
        return <FileEdit className="w-4 h-4 text-rose-600 shrink-0" strokeWidth={1.9} />;
      case "run_check":
        return <Terminal className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.9} />;
      default:
        return <Terminal className="w-4 h-4 text-stone-500 shrink-0" strokeWidth={1.9} />;
    }
  };

  return (
    <div className="my-2 border border-stone-200/80 rounded-xl bg-white/70 overflow-hidden shadow-xs">
      <div className="px-3 py-2 text-xs font-semibold text-stone-600 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <span className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-stone-500" strokeWidth={1.9} />
          Work Log ({toolCalls.length} actions)
        </span>
      </div>

      <div className="divide-y divide-stone-100">
        {toolCalls.map((item) => {
          const isExpanded = expandedId === item.id;
          const isRunning = item.ok === undefined;

          return (
            <div key={item.id} className="text-xs">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-50/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  {getToolIcon(item.name)}
                  <span className="font-medium text-stone-800 truncate">
                    {item.summary || item.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isRunning ? (
                    <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" strokeWidth={1.9} />
                  ) : item.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.9} />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.9} />
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.9} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400" strokeWidth={1.9} />
                  )}
                </div>
              </button>

              {isExpanded && item.output && (
                <div className="px-3 py-2 bg-stone-900 text-stone-200 font-mono text-[11px] overflow-x-auto max-h-48 border-t border-stone-100">
                  <pre className="whitespace-pre-wrap">{item.output}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
