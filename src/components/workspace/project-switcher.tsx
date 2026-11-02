"use client";

import React, { useState, useEffect } from "react";
import { Folder, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { useWorkstationStore } from "@/store/workstation-store";
import { toast } from "sonner";

export const ProjectSwitcher: React.FC = () => {
  const { projectRoot, fileTree, isLoadingTree, setProjectRoot, setFileTree, setLoadingTree } =
    useWorkstationStore();
  const [inputPath, setInputPath] = useState(projectRoot);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Load tree on mount or path change
  const loadWorkspace = async (targetPath: string) => {
    if (!targetPath) return;
    setLoadingTree(true);
    try {
      const res = await fetch(`/api/workspace?action=tree&root=${encodeURIComponent(targetPath)}`);
      const data = await res.json();
      if (data.success) {
        setFileTree(data.tree);
        setProjectRoot(targetPath);
        setIsValid(true);
        toast.success(`Connected to workspace (${data.tree.length} files detected)`);
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
    // Initial load
    if (!projectRoot) {
      loadWorkspace(".");
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
      className="p-3 bg-[#12151e] border-b border-[#242b3d] flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
        <input
          type="text"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          placeholder="Path to local repository (e.g. C:/projects/my-client-app)"
          className="bg-[#1a1f2c] border border-[#242b3d] text-slate-200 text-xs rounded-md px-2.5 py-1.5 w-full focus:outline-none focus:border-indigo-500 font-mono transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="secondary" type="submit" isLoading={isLoadingTree}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Connect</span>
        </Button>

        {isValid === true && (
          <Badge variant="success" className="gap-1 hidden sm:inline-flex">
            <CheckCircle2 className="w-3 h-3" />
            <span>{fileTree.length} files</span>
          </Badge>
        )}
        {isValid === false && (
          <Badge variant="destructive" className="gap-1 hidden sm:inline-flex">
            <AlertCircle className="w-3 h-3" />
            <span>Path Error</span>
          </Badge>
        )}
      </div>
    </form>
  );
};
