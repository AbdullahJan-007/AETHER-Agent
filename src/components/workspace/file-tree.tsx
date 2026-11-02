"use client";

import React, { useState } from "react";
import { FileCode, FileJson, FileText, Folder, ChevronRight, ChevronDown, Search } from "lucide-react";
import { useWorkstationStore } from "@/store/workstation-store";
import { toast } from "sonner";

export const FileTree: React.FC = () => {
  const { fileTree, projectRoot, selectedFile, setSelectedFile } = useWorkstationStore();
  const [filter, setFilter] = useState("");

  const handleSelectFile = async (path: string) => {
    try {
      const res = await fetch(
        `/api/workspace?action=read&file=${encodeURIComponent(path)}&root=${encodeURIComponent(
          projectRoot
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
      return <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    }
    if (filePath.endsWith(".json")) {
      return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#12151e] border-r border-[#242b3d] select-none text-xs">
      <div className="p-2 border-b border-[#242b3d]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search workspace files..."
            className="w-full bg-[#1a1f2c] text-slate-200 pl-8 pr-2.5 py-1.5 rounded-md border border-[#242b3d] text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredTree.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">No files matching filter</div>
        ) : (
          filteredTree.map((item) => {
            const isSelected = selectedFile === item.path;
            return (
              <button
                key={item.path}
                onClick={() => item.type === "file" && handleSelectFile(item.path)}
                className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                  isSelected
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1f2c]"
                }`}
              >
                {item.type === "directory" ? (
                  <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                ) : (
                  getFileIcon(item.path)
                )}
                <span className="truncate font-mono">{item.path}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
