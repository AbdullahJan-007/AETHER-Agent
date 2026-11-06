"use client";

import React, { useState, useEffect } from "react";
import { Folder, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useWorkstationStore } from "@/store/workstation-store";
import { toast } from "sonner";

export function ProjectSwitcher() {
  const { projectRoot, isLoadingTree, setProjectRoot, setFileTree, setLoadingTree } =
    useWorkstationStore();
  const [inputPath, setInputPath] = useState(projectRoot);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const loadWorkspace = async (targetPath: string, silent = false) => {
    const queryPath = targetPath && targetPath.trim() !== "" ? targetPath.trim() : ".";
    setLoadingTree(true);
    try {
      const res = await fetch(`/api/workspace?action=tree&root=${encodeURIComponent(queryPath)}`);
      const data = await res.json();
      if (data.success) {
        const resolvedRoot = data.canonicalRoot || queryPath;
        setFileTree(data.tree);
        setProjectRoot(resolvedRoot);
        setInputPath(resolvedRoot);
        setIsValid(true);
        if (!silent) {
          toast.success(`Connected to workspace (${data.tree.length} files detected)`);
        }
      } else {
        setIsValid(false);
        toast.error(data.error || "Failed to load project directory");
      }
    } catch {
      setIsValid(false);
      toast.error("Network error while connecting to local workspace");
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    if (!projectRoot) {
      loadWorkspace(".", true);
    } else {
      setInputPath(projectRoot);
    }
  }, [projectRoot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadWorkspace(inputPath);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2.5 bg-white/60 border-b border-stone-200/70 flex items-center justify-between gap-2.5 select-none text-xs shrink-0"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Folder className="w-4 h-4 text-orange-500 shrink-0" strokeWidth={1.9} />
        <input
          type="text"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          placeholder="Enter local project path (e.g. C:/projects/my-app)..."
          className="flex-1 bg-stone-50/80 text-stone-800 text-xs px-2.5 py-1.5 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono placeholder:text-stone-400 placeholder:font-sans"
        />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isValid === true && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80">
            <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
            <span className="hidden sm:inline">Connected</span>
          </span>
        )}

        {isValid === false && (
          <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/80">
            <AlertCircle className="w-3 h-3" strokeWidth={2} />
            <span className="hidden sm:inline">Invalid Path</span>
          </span>
        )}

        <button
          type="submit"
          disabled={isLoadingTree}
          className="px-3 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw
            className={`w-3 h-3 ${isLoadingTree ? "animate-spin" : ""}`}
            strokeWidth={2}
          />
          <span>{isLoadingTree ? "Connecting..." : "Connect"}</span>
        </button>
      </div>
    </form>
  );
}
