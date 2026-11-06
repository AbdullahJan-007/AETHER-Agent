"use client";

import React from "react";
import {
  FolderCode,
  FileDiff,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useWorkstationStore } from "@/store/workstation-store";

export interface WorkstationHeaderProps {
  activeRightTab: "files" | "diff";
  onTabChange: (tab: "files" | "diff") => void;
  title?: string;
  onOpenReview?: () => void;
  pendingChangesCount?: number;
  isLeftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
}

export function WorkstationHeader({
  activeRightTab,
  onTabChange,
  title,
  onOpenReview,
  pendingChangesCount = 0,
  isLeftSidebarOpen,
  onToggleLeftSidebar,
  isRightPanelOpen,
  onToggleRightPanel,
}: WorkstationHeaderProps) {
  const { projectRoot } = useWorkstationStore();

  return (
    <header className="h-13 border-b border-stone-200/80 bg-white/80 px-3 sm:px-4 flex items-center justify-between select-none backdrop-blur-md z-10 shrink-0">
      {/* Left controls: Sidebar toggle + Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleLeftSidebar}
          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          title={isLeftSidebarOpen ? "Hide chat history (Ctrl+B)" : "Show chat history (Ctrl+B)"}
          aria-label="Toggle sidebar"
        >
          {isLeftSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" strokeWidth={1.9} />
          ) : (
            <PanelLeftOpen className="w-4 h-4" strokeWidth={1.9} />
          )}
        </button>

        <div className="h-4 w-px bg-stone-200 hidden sm:block" />

        <h1 className="text-xs sm:text-sm font-semibold text-stone-800 truncate font-sans">
          {title || "AETHER Agent Session"}
        </h1>

        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200/70 text-orange-700 text-[11px] font-medium shrink-0">
          <Cpu className="w-3 h-3 text-orange-500" strokeWidth={1.9} />
          <span>gemini-2.5-flash</span>
        </div>
      </div>

      {/* Right controls: Review changes, tabs, right panel toggle */}
      <div className="flex items-center gap-2">
        {pendingChangesCount > 0 && onOpenReview && (
          <button
            type="button"
            onClick={onOpenReview}
            className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Review {pendingChangesCount} Change{pendingChangesCount === 1 ? "" : "s"}</span>
          </button>
        )}

        {isRightPanelOpen && (
          <div className="flex items-center bg-stone-100/90 rounded-xl p-0.5 border border-stone-200/70">
            <button
              type="button"
              onClick={() => onTabChange("files")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeRightTab === "files"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <FolderCode className="w-3.5 h-3.5" strokeWidth={1.9} />
              <span className="hidden sm:inline">Files</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange("diff")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeRightTab === "diff"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <FileDiff className="w-3.5 h-3.5" strokeWidth={1.9} />
              <span className="hidden sm:inline">Diffs</span>
            </button>
          </div>
        )}

        {/* Toggle Right Panel (Files & Diffs) */}
        <button
          type="button"
          onClick={onToggleRightPanel}
          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer ml-1"
          title={isRightPanelOpen ? "Hide workspace panel" : "Show workspace panel"}
          aria-label="Toggle workspace panel"
        >
          {isRightPanelOpen ? (
            <PanelRightClose className="w-4 h-4" strokeWidth={1.9} />
          ) : (
            <PanelRightOpen className="w-4 h-4" strokeWidth={1.9} />
          )}
        </button>
      </div>
    </header>
  );
}
