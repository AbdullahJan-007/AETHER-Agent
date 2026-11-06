"use client";

import React, { useState } from "react";
import { Check, X, FileDiff, CheckCheck, FileCode } from "lucide-react";
import { useWorkstationStore } from "@/store/workstation-store";
import type { StagedDiff } from "@/lib/workspace/diff-calculator";
import { toast } from "sonner";

export function StagedDiffViewer() {
  const { stagedDiffs, projectRoot, removeStagedDiff, clearStagedDiffs, setFileTree } =
    useWorkstationStore();
  const [activeDiffIndex, setActiveDiffIndex] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

  if (stagedDiffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-400 p-8 text-center bg-white/70">
        <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center mb-3">
          <FileDiff className="w-5 h-5 text-orange-500" strokeWidth={1.9} />
        </div>
        <p className="text-xs font-semibold text-stone-700">Zero Staged Changes</p>
        <p className="text-[11px] max-w-xs mt-1 text-stone-500 leading-relaxed">
          When AETHER proposes code changes, diffs appear here for line-by-line review before writing to disk.
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(activeDiffIndex, stagedDiffs.length - 1);
  const currentDiff: StagedDiff = stagedDiffs[safeIndex] || stagedDiffs[0];

  const getFullContent = (diff: StagedDiff): string => {
    if (diff.newContent !== undefined) {
      return diff.newContent;
    }
    return diff.diffLines
      .filter((l) => l.type === "add" || l.type === "context")
      .map((l) => l.content)
      .join("\n");
  };

  const handleApplySingle = async (diff: StagedDiff) => {
    setIsApplying(true);
    try {
      const fullContent = getFullContent(diff);
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          file: diff.filePath,
          content: fullContent,
          root: projectRoot,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Applied changes to ${diff.filePath}`);
        removeStagedDiff(diff.filePath);
      } else {
        toast.error(data.error || "Failed to apply patch");
      }
    } catch {
      toast.error("Network error while applying patch");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/70 select-none text-xs">
      {/* Diff selector tabs */}
      <div className="flex items-center gap-1.5 p-2 border-b border-stone-200/70 overflow-x-auto">
        {stagedDiffs.map((diff, idx) => (
          <button
            key={diff.filePath}
            type="button"
            onClick={() => setActiveDiffIndex(idx)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors shrink-0 cursor-pointer ${
              idx === safeIndex
                ? "bg-orange-50 text-orange-900 border border-orange-200 font-semibold"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <FileCode className="w-3 h-3 text-stone-400" />
            <span className="truncate max-w-[120px]">{diff.filePath.split("/").pop()}</span>
            <span className="text-[10px] text-emerald-600 font-bold">+{diff.additions}</span>
            <span className="text-[10px] text-rose-600 font-bold">-{diff.deletions}</span>
          </button>
        ))}
      </div>

      {/* Active diff viewer */}
      <div className="p-2 border-b border-stone-200/70 flex items-center justify-between bg-stone-50/50">
        <span className="font-mono text-xs font-semibold text-stone-800 truncate mr-2">
          {currentDiff.filePath}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => removeStagedDiff(currentDiff.filePath)}
            className="p-1 hover:bg-rose-50 text-stone-500 hover:text-rose-600 rounded-lg cursor-pointer"
            title="Discard"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>

          <button
            type="button"
            disabled={isApplying}
            onClick={() => handleApplySingle(currentDiff)}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3 h-3" strokeWidth={2} />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Code diff lines */}
      <div className="flex-1 overflow-y-auto p-2 bg-stone-900 text-stone-200 font-mono text-[11px]">
        {currentDiff.diffLines.map((line, idx) => (
          <div
            key={idx}
            className={`px-2 py-0.5 whitespace-pre ${
              line.type === "add"
                ? "bg-emerald-950/70 text-emerald-300"
                : line.type === "delete"
                ? "bg-rose-950/70 text-rose-300"
                : "text-stone-400"
            }`}
          >
            <span className="inline-block w-4 opacity-50">
              {line.type === "add" ? "+" : line.type === "delete" ? "-" : " "}
            </span>
            {line.content}
          </div>
        ))}
      </div>
    </div>
  );
}
