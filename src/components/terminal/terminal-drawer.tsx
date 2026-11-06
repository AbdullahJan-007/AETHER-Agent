"use client";

import React, { useState } from "react";
import {
  Terminal,
  Play,
  Bug,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useWorkstationStore } from "@/store/workstation-store";
import { toast } from "sonner";

export interface TerminalDrawerProps {
  onFixWithAI?: (errorMessage: string) => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({ onFixWithAI }) => {
  const { terminalLogs, isTerminalRunning, projectRoot, setTerminalRunning, addTerminalLog } =
    useWorkstationStore();
  const [isOpen, setIsOpen] = useState(false);

  const runCommand = async (binary: string, args: string[]) => {
    setIsOpen(true);
    setTerminalRunning(true);
    const cmdStr = `${binary} ${args.join(" ")}`;
    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          binary,
          args,
          cwd: projectRoot || ".",
        }),
      });

      const data = await res.json();
      addTerminalLog({
        command: cmdStr,
        stdout: data.stdout || "",
        stderr: data.stderr || "",
        exitCode: data.exitCode ?? (data.success ? 0 : 1),
      });

      if (data.success) {
        toast.success(`Command passed: ${cmdStr}`);
      } else {
        toast.error(`Command failed: ${cmdStr}`);
      }
    } catch {
      toast.error(`Network error running ${cmdStr}`);
    } finally {
      setTerminalRunning(false);
    }
  };

  const latestLog = terminalLogs[0];

  return (
    <div className="border-t border-stone-200/80 bg-white/85 backdrop-blur-md flex flex-col text-xs select-none shrink-0">
      {/* Drawer Control Bar */}
      <div className="px-3 py-2 flex items-center justify-between bg-stone-50/80 border-b border-stone-200/60">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-orange-500" strokeWidth={1.9} />
          <span className="font-semibold text-stone-800 font-sans">Safe Terminal Runner</span>
          {latestLog && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                latestLog.exitCode === 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {latestLog.exitCode === 0 ? (
                <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
              ) : (
                <XCircle className="w-3 h-3" strokeWidth={2} />
              )}
              Exit: {latestLog.exitCode}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isTerminalRunning}
            onClick={() => runCommand("npm", ["test"])}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-200/90 text-stone-700 font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isTerminalRunning ? (
              <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
            ) : (
              <Play className="w-3 h-3 text-emerald-600" strokeWidth={2} />
            )}
            <span>npm test</span>
          </button>

          <button
            type="button"
            disabled={isTerminalRunning}
            onClick={() => runCommand("npm", ["run", "typecheck"])}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-200/90 text-stone-700 font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-blue-600" strokeWidth={2} />
            <span className="hidden sm:inline">typecheck</span>
          </button>

          <button
            type="button"
            disabled={isTerminalRunning}
            onClick={() => runCommand("npm", ["run", "lint"])}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-200/90 text-stone-700 font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-amber-600" strokeWidth={2} />
            <span className="hidden sm:inline">lint</span>
          </button>

          <button
            type="button"
            disabled={isTerminalRunning}
            onClick={() => runCommand("git", ["status"])}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-200/90 text-stone-700 font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-purple-600" strokeWidth={2} />
            <span className="hidden sm:inline">git status</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg hover:bg-stone-200/70 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            title={isOpen ? "Collapse terminal" : "Expand terminal"}
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Terminal Log Console */}
      {isOpen && (
        <div className="h-40 overflow-y-auto p-3 bg-stone-900 text-stone-200 font-mono text-[11px] space-y-2">
          {latestLog ? (
            <div>
              <div className="flex items-center justify-between text-stone-400 text-[11px] mb-1.5 pb-1.5 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-bold">$ {latestLog.command}</span>
                  <span>{new Date(latestLog.timestamp).toLocaleTimeString()}</span>
                </div>

                {latestLog.exitCode !== 0 && onFixWithAI && (
                  <button
                    type="button"
                    onClick={() =>
                      onFixWithAI(
                        `Command failed: ${latestLog.command}\n\nSTDOUT:\n${latestLog.stdout}\n\nSTDERR:\n${latestLog.stderr}`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-sans font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bug className="w-3 h-3" />
                    <span>Auto-Fix with AETHER</span>
                  </button>
                )}
              </div>

              {latestLog.stdout && (
                <pre className="whitespace-pre-wrap break-all text-stone-200 leading-relaxed">
                  {latestLog.stdout}
                </pre>
              )}

              {latestLog.stderr && (
                <pre className="whitespace-pre-wrap break-all text-rose-400 mt-2 leading-relaxed">
                  {latestLog.stderr}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-stone-400 italic p-4 text-center font-sans">
              No terminal executions yet. Click &ldquo;npm test&rdquo;, &ldquo;typecheck&rdquo;, or &ldquo;git status&rdquo; above to run whitelisted project commands.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
