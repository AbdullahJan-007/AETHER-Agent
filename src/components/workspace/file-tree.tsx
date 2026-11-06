"use client";

import React, { useState } from "react";
import { FileCode, FileJson, FileText, Folder, Search } from "lucide-react";
import { useWorkstationStore } from "@/store/workstation-store";
import { toast } from "sonner";

export function FileTree() {
  const {
    fileTree,
    projectRoot,
    workspaceMode,
    virtualFiles,
    selectedFile,
    setSelectedFile,
  } = useWorkstationStore();
  const [filter, setFilter] = useState("");

  const handleSelectFile = async (path: string) => {
    if (workspaceMode === "browser") {
      const content = virtualFiles[path];
      if (content !== undefined) {
        setSelectedFile(path, content);
      } else {
        toast.error("File not found in virtual workspace");
      }
      return;
    }

    try {
      const res = await fetch(
        `/api/workspace?action=read&file=${encodeURIComponent(path)}&root=${encodeURIComponent(
          projectRoot || "."
        )}`
      );
      const data = await res.json();
      if (data.success) {
        setSelectedFile(path, data.content);
      } else {
        toast.error(data.error || "Failed to read file");
      }
    } catch {
      toast.error("Network error while reading file");
    }
  };

  const filteredTree = fileTree.filter((node) =>
    node.path.toLowerCase().includes(filter.toLowerCase())
  );

  const getFileIcon = (filePath: string) => {
    if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      return <FileCode className="w-3.5 h-3.5 text-blue-500 shrink-0" strokeWidth={1.9} />;
    }
    if (filePath.endsWith(".json")) {
      return <FileJson className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={1.9} />;
    }
    return <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" strokeWidth={1.9} />;
  };

  return (
    <div className="flex flex-col h-full bg-white/70 select-none text-xs">
      <div className="p-2.5 border-b border-stone-200/70">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" strokeWidth={1.9} />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-stone-50 text-stone-800 pl-8 pr-2.5 py-1.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-orange-500 placeholder:text-stone-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredTree.length === 0 ? (
          <div className="p-6 text-center text-stone-400 text-xs">
            {fileTree.length === 0 ? "No files detected. Connect a workspace." : "No matching files."}
          </div>
        ) : (
          filteredTree.map((item) => {
            const isSelected = selectedFile === item.path;
            const isDir = item.type === "directory";

            return (
              <div
                key={item.path}
                onClick={() => !isDir && handleSelectFile(item.path)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors font-mono text-[11px] cursor-pointer ${
                  isSelected
                    ? "bg-orange-50 text-orange-950 font-semibold border border-orange-200/80"
                    : "text-stone-700 hover:bg-stone-100/80"
                } ${isDir ? "font-semibold text-stone-900" : ""}`}
              >
                {isDir ? (
                  <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={1.9} />
                ) : (
                  getFileIcon(item.path)
                )}
                <span className="truncate">{item.path}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
