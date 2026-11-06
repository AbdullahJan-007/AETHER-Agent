"use client";

import { useState, useEffect } from "react";
import type { FileNode, StagedDiff } from "@/lib/workspace/diff-calculator";
import { buildVirtualFileTree } from "@/lib/workspace/browser-fs";

export interface TerminalLogEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: number;
}

export type WorkspaceMode = "disk" | "browser";

export interface WorkstationState {
  projectRoot: string;
  workspaceMode: WorkspaceMode;
  virtualFiles: Record<string, string>;
  dirHandle: unknown | null;
  userApiKey: string;
  fileTree: FileNode[];
  selectedFile: string | null;
  selectedFileContent: string | null;
  stagedDiffs: StagedDiff[];
  terminalLogs: TerminalLogEntry[];
  isTerminalRunning: boolean;
  isLoadingTree: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

const API_KEY_STORAGE = "aether:user_api_key:v1";

function loadStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

let state: WorkstationState = {
  projectRoot: "",
  workspaceMode: "disk",
  virtualFiles: {},
  dirHandle: null,
  userApiKey: "",
  fileTree: [],
  selectedFile: null,
  selectedFileContent: null,
  stagedDiffs: [],
  terminalLogs: [],
  isTerminalRunning: false,
  isLoadingTree: false,
};

function notify() {
  listeners.forEach((l) => l());
}

export const workstationStore = {
  getState: () => state,

  setProjectRoot: (root: string) => {
    state = { ...state, projectRoot: root };
    notify();
  },

  setWorkspaceMode: (mode: WorkspaceMode) => {
    state = { ...state, workspaceMode: mode };
    notify();
  },

  setBrowserWorkspace: (
    folderName: string,
    files: Record<string, string>,
    dirHandle: unknown | null = null
  ) => {
    const tree = buildVirtualFileTree(files);
    state = {
      ...state,
      projectRoot: folderName,
      workspaceMode: "browser",
      virtualFiles: files,
      dirHandle,
      fileTree: tree,
      selectedFile: null,
      selectedFileContent: null,
    };
    notify();
  },

  updateVirtualFiles: (updates: Record<string, string>) => {
    const merged = { ...state.virtualFiles, ...updates };
    const tree = buildVirtualFileTree(merged);
    state = {
      ...state,
      virtualFiles: merged,
      fileTree: tree,
    };
    notify();
  },

  setUserApiKey: (key: string) => {
    const trimmed = key.trim();
    state = { ...state, userApiKey: trimmed };
    if (typeof window !== "undefined") {
      try {
        if (trimmed) {
          window.localStorage.setItem(API_KEY_STORAGE, trimmed);
        } else {
          window.localStorage.removeItem(API_KEY_STORAGE);
        }
      } catch {
        // Ignore storage error
      }
    }
    notify();
  },

  setFileTree: (tree: FileNode[]) => {
    state = { ...state, fileTree: tree };
    notify();
  },

  setSelectedFile: (file: string | null, content: string | null = null) => {
    state = { ...state, selectedFile: file, selectedFileContent: content };
    notify();
  },

  addStagedDiff: (diff: StagedDiff) => {
    const existing = state.stagedDiffs.filter((d) => d.filePath !== diff.filePath);
    state = { ...state, stagedDiffs: [...existing, diff] };
    notify();
  },

  removeStagedDiff: (filePath: string) => {
    state = {
      ...state,
      stagedDiffs: state.stagedDiffs.filter((d) => d.filePath !== filePath),
    };
    notify();
  },

  clearStagedDiffs: () => {
    state = { ...state, stagedDiffs: [] };
    notify();
  },

  addTerminalLog: (entry: Omit<TerminalLogEntry, "id" | "timestamp">) => {
    const newLog: TerminalLogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    state = { ...state, terminalLogs: [newLog, ...state.terminalLogs] };
    notify();
  },

  setTerminalRunning: (running: boolean) => {
    state = { ...state, isTerminalRunning: running };
    notify();
  },

  setLoadingTree: (loading: boolean) => {
    state = { ...state, isLoadingTree: loading };
    notify();
  },
};

export function useWorkstationStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const storedKey = loadStoredApiKey();
    if (storedKey && !state.userApiKey) {
      state = { ...state, userApiKey: storedKey };
      setTick((t) => t + 1);
    }
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...state,
    ...workstationStore,
  };
}
