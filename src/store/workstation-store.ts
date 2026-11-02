"use client";

import { useState, useEffect, useCallback } from "react";
import type { FileNode, StagedDiff } from "@/lib/workspace/diff-calculator";

export interface TerminalLogEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timestamp: number;
}

export interface WorkstationState {
  projectRoot: string;
  fileTree: FileNode[];
  selectedFile: string | null;
  selectedFileContent: string | null;
  stagedDiffs: StagedDiff[];
  terminalLogs: TerminalLogEntry[];
  isTerminalRunning: boolean;
  isLoadingTree: boolean;
}

// Global subscribers for lightweight reactivity across components
type Listener = () => void;
const listeners = new Set<Listener>();

let state: WorkstationState = {
  projectRoot: "",
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
