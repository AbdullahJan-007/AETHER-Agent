"use client";

import React, { useState } from "react";
import { CheckSquare, Square, ListOrdered } from "lucide-react";

export interface PlanChecklistProps {
  planText: string;
}

export const PlanChecklist: React.FC<PlanChecklistProps> = ({ planText }) => {
  if (!planText) return null;

  const rawLines = planText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});

  const toggleCheck = (index: number) => {
    setCheckedMap((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="mb-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs">
      <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-2.5">
        <ListOrdered className="w-4 h-4" />
        <span>Execution Plan Checklist</span>
      </div>

      <div className="space-y-1.5">
        {rawLines.map((line, idx) => {
          const isDone = checkedMap[idx] || line.includes("[x]") || line.includes("✓");
          const cleanLine = line
            .replace(/^-\s*\[[ x]\]\s*/i, "")
            .replace(/^\d+\.\s*/, "")
            .trim();

          return (
            <button
              key={idx}
              onClick={() => toggleCheck(idx)}
              className={`w-full text-left p-1.5 rounded-md flex items-start gap-2.5 transition-colors ${
                isDone
                  ? "bg-[#1a1f2c]/50 text-slate-500 line-through"
                  : "hover:bg-[#1a1f2c] text-slate-300"
              }`}
            >
              {isDone ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
              )}
              <span className="font-mono leading-relaxed">{cleanLine}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
