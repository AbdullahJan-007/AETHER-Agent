"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  FolderOpen,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useWorkstationStore } from "@/store/workstation-store";
import {
  DEFAULT_STARTER_FILES,
  pickBrowserDirectory,
  readUploadedFiles,
  downloadVirtualWorkspaceZip,
} from "@/lib/workspace/browser-fs";
import { toast } from "sonner";

function isLocalhostBrowser(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

export function ProjectSwitcher() {
  const {
    projectRoot,
    workspaceMode,
    virtualFiles,
    isLoadingTree,
    setProjectRoot,
    setWorkspaceMode,
    setBrowserWorkspace,
    setFileTree,
    setLoadingTree,
  } = useWorkstationStore();

  const [inputPath, setInputPath] = useState(projectRoot);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const loadDiskWorkspace = async (targetPath: string, silent = false) => {
    const queryPath = targetPath && targetPath.trim() !== "" ? targetPath.trim() : ".";
    setLoadingTree(true);
    try {
      const res = await fetch(`/api/workspace?action=tree&root=${encodeURIComponent(queryPath)}`);
      const data = await res.json();
      if (data.success) {
        const resolvedRoot = data.canonicalRoot || queryPath;
        setWorkspaceMode("disk");
        setFileTree(data.tree);
        setProjectRoot(resolvedRoot);
        setInputPath(resolvedRoot);
        setIsValid(true);
        if (!silent) {
          toast.success(`Connected to local disk workspace (${data.tree.length} files)`);
        }
      } else {
        setIsValid(false);
        if (!silent) toast.error(data.error || "Failed to load project directory");
      }
    } catch {
      setIsValid(false);
      if (!silent) toast.error("Network error while connecting to local workspace");
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    if (!projectRoot) {
      if (isLocalhostBrowser()) {
        loadDiskWorkspace(".", true);
      } else {
        setBrowserWorkspace("aether-cloud-starter", DEFAULT_STARTER_FILES, null);
        setInputPath("aether-cloud-starter (Browser Workspace)");
        setIsValid(true);
      }
    } else {
      setInputPath(
        workspaceMode === "browser" ? `${projectRoot} (PC Folder)` : projectRoot
      );
    }
  }, [projectRoot, workspaceMode]);

  const handleOpenPcFolder = async () => {
    try {
      setLoadingTree(true);
      const { folderName, dirHandle, files } = await pickBrowserDirectory();
      setBrowserWorkspace(folderName, files, dirHandle);
      setInputPath(`${folderName} (PC Folder)`);
      setIsValid(true);
      toast.success(
        `Mounted "${folderName}" from your PC (${Object.keys(files).length} files ready)`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("abort")) {
        toast.info("Opening folder upload selector...");
        uploadInputRef.current?.click();
      }
    } finally {
      setLoadingTree(false);
    }
  };

  const handleUploadFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setLoadingTree(true);
    try {
      const { folderName, files } = await readUploadedFiles(fileList);
      setBrowserWorkspace(folderName, files, null);
      setInputPath(`${folderName} (Uploaded Folder)`);
      setIsValid(true);
      toast.success(`Loaded "${folderName}" (${Object.keys(files).length} files)`);
    } catch {
      toast.error("Failed to read uploaded folder");
    } finally {
      setLoadingTree(false);
      e.target.value = "";
    }
  };

  const handleDownloadZip = async () => {
    try {
      await downloadVirtualWorkspaceZip(projectRoot || "aether-workspace", virtualFiles);
      toast.success("Downloaded workspace ZIP archive");
    } catch {
      toast.error("Failed to export ZIP archive");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLocalhostBrowser()) {
      handleOpenPcFolder();
      return;
    }
    loadDiskWorkspace(inputPath);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-2.5 bg-white/60 border-b border-stone-200/70 flex flex-wrap items-center justify-between gap-2 select-none text-xs shrink-0"
    >
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Folder className="w-4 h-4 text-orange-500 shrink-0" strokeWidth={1.9} />
        <input
          type="text"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          placeholder="Enter local disk path or click Open PC Folder..."
          className="flex-1 bg-stone-50/80 text-stone-800 text-xs px-2.5 py-1.5 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono placeholder:text-stone-400 placeholder:font-sans"
        />
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is standard across modern browsers
        webkitdirectory="true"
        className="hidden"
        onChange={handleUploadFolder}
      />

      <div className="flex items-center gap-1.5 shrink-0">
        {isValid === true && (
          <span className="hidden md:flex items-center gap-1 text-[11px] text-emerald-600 font-medium px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80">
            <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
            <span>{workspaceMode === "browser" ? "PC Folder" : "Local Disk"}</span>
          </span>
        )}

        {isValid === false && (
          <span className="hidden md:flex items-center gap-1 text-[11px] text-rose-600 font-medium px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200/80">
            <AlertCircle className="w-3 h-3" strokeWidth={2} />
            <span>Invalid</span>
          </span>
        )}

        <button
          type="button"
          onClick={handleOpenPcFolder}
          disabled={isLoadingTree}
          title="Mount a folder directly from your PC (works on Vercel & any browser)"
          className="px-2.5 py-1.5 text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/80 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-orange-600" strokeWidth={2} />
          <span>Open PC Folder</span>
        </button>

        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          disabled={isLoadingTree}
          title="Upload folder files from your computer"
          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl border border-stone-200/80 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" strokeWidth={2} />
        </button>

        {workspaceMode === "browser" && (
          <button
            type="button"
            onClick={handleDownloadZip}
            title="Download workspace as .zip"
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl border border-stone-200/80 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}

        {isLocalhostBrowser() && (
          <button
            type="submit"
            disabled={isLoadingTree}
            className="px-3 py-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3 h-3 ${isLoadingTree ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
            <span>Connect</span>
          </button>
        )}
      </div>
    </form>
  );
}
