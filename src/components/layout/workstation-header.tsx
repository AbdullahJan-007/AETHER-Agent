"use client";

import React from "react";
import { Sparkles, Terminal, FileDiff, FolderCode } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { useWorkstationStore } from "@/store/workstation-store";

export interface WorkstationHeaderProps {
  activeRightTab: "files" | "diff";
  onTabChange: (tab: "files" | "diff") => void;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({
  activeRightTab,
  onTabChange,
}) => {
  const { projectRoot, stagedDiffs } = useWorkstationStore();

  return (
    <header className="h-14 border-b border-[#242b3d] bg-[#12151e] px-4 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-white">AETHER</span>
              <Badge variant="default" className="text-[10px] px-1.5 py-0">v2026.1</Badge>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">On-Premise Full-Stack AI Engineer</p>
          </div>
        </div>

        {projectRoot && (
          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-[#242b3d] text-xs text-slate-400 font-mono">
            <span className="text-slate-500">Workspace:</span>
            <span className="text-slate-300 truncate max-w-xs">{projectRoot}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#1a1f2c] rounded-lg p-0.5 border border-[#242b3d]">
          <button
            onClick={() => onTabChange("files")}
            className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              activeRightTab === "files"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderCode className="w-3.5 h-3.5" />
            <span>Files</span>
          </button>

          <button
            onClick={() => onTabChange("diff")}
            className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-colors ${
              activeRightTab === "diff"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileDiff className="w-3.5 h-3.5" />
            <span>Staged Diffs</span>
            {stagedDiffs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
                {stagedDiffs.length}
              </span>
            )}
          </button>
        </div>

        <Badge variant="success" className="gap-1 hidden sm:inline-flex text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Gemini Free Tier</span>
        </Badge>
      </div>
    </header>
  );
};
