"use client";

import React, { useState } from "react";
import { Check, X, FileDiff, CheckCheck, FileCode } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { useWorkstationStore } from "@/store/workstation-store";
import type { StagedDiff } from "@/lib/workspace/diff-calculator";
import { toast } from "sonner";

export const StagedDiffViewer: React.FC = () => {
  const { stagedDiffs, projectRoot, removeStagedDiff, clearStagedDiffs, setFileTree } =
    useWorkstationStore();
  const [activeDiffIndex, setActiveDiffIndex] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

  if (stagedDiffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
        <FileDiff className="w-10 h-10 mb-2 opacity-40 text-indigo-400" />
        <p className="text-sm font-medium text-slate-400">Zero Staged Changes</p>
        <p className="text-xs max-w-xs mt-1">
          When AETHER generates full-stack code or fixes, changes are safely staged here for your review before writing to disk.
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
        if (data.backupPath) {
          toast.info(`Backup saved: ${data.backupPath}`);
        }
        removeStagedDiff(diff.filePath);

        // Refresh tree
        const treeRes = await fetch(
          `/api/workspace?action=tree&root=${encodeURIComponent(projectRoot)}`
        );
        const treeData = await treeRes.json();
        if (treeData.success) {
          setFileTree(treeData.tree);
        }
      } else {
        toast.error(data.error || "Failed to apply changes");
      }
    } catch {
      toast.error("Network error while writing changes");
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyAll = async () => {
    setIsApplying(true);
    let successCount = 0;

    for (const diff of stagedDiffs) {
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
          successCount++;
        }
      } catch {
        // Continue applying remaining files
      }
    }

    toast.success(`Applied ${successCount} of ${stagedDiffs.length} files with automatic backups`);
    clearStagedDiffs();

    // Refresh tree
    const treeRes = await fetch(
      `/api/workspace?action=tree&root=${encodeURIComponent(projectRoot)}`
    );
    const treeData = await treeRes.json();
    if (treeData.success) {
      setFileTree(treeData.tree);
    }
    setIsApplying(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#090a0f] text-xs font-mono">
      {/* Multi-File Tab Selector */}
      {stagedDiffs.length > 1 && (
        <div className="flex items-center gap-1 p-2 bg-[#12151e] border-b border-[#242b3d] overflow-x-auto">
          {stagedDiffs.map((diff, idx) => (
            <button
              key={diff.filePath}
              onClick={() => setActiveDiffIndex(idx)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                idx === safeIndex
                  ? "bg-indigo-600 text-white"
                  : "bg-[#1a1f2c] text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{diff.filePath}</span>
              <span className="text-emerald-300 font-bold">+{diff.additions}</span>
            </button>
          ))}
        </div>
      )}

      {/* Diff Header */}
      <div className="p-3 bg-[#12151e] border-b border-[#242b3d] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <Badge variant="outline" className="text-indigo-300 truncate max-w-[160px]">
            {currentDiff.filePath}
          </Badge>
          <span className="text-emerald-400 font-bold">+{currentDiff.additions}</span>
          <span className="text-red-400 font-bold">-{currentDiff.deletions}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => removeStagedDiff(currentDiff.filePath)}
            title="Discard this file"
          >
            <X className="w-3.5 h-3.5" />
          </Button>

          {stagedDiffs.length > 1 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleApplyAll}
              isLoading={isApplying}
              title="Apply all staged files"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apply All ({stagedDiffs.length})</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={() => handleApplySingle(currentDiff)}
            isLoading={isApplying}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply (.backup)</span>
          </Button>
        </div>
      </div>

      {/* Diff Lines Body */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {currentDiff.diffLines.map((line, idx) => {
          let lineBg = "hover:bg-[#1a1f2c]";
          let textColor = "text-slate-400";
          let prefix = " ";

          if (line.type === "add") {
            lineBg = "bg-emerald-500/10 border-l-2 border-emerald-500";
            textColor = "text-emerald-300";
            prefix = "+";
          } else if (line.type === "delete") {
            lineBg = "bg-red-500/10 border-l-2 border-red-500";
            textColor = "text-red-300";
            prefix = "-";
          }

          return (
            <div
              key={idx}
              className={`px-2 py-0.5 rounded-sm flex items-start gap-2 ${lineBg} ${textColor}`}
            >
              <span className="select-none opacity-40 w-4 text-right">{prefix}</span>
              <pre className="whitespace-pre-wrap break-all flex-1">{line.content}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};
