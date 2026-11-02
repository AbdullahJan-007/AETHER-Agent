"use client";

import React, { useState } from "react";
import { Terminal, Play, Bug, ChevronUp, ChevronDown, CheckCircle2, XCircle } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { useWorkstationStore } from "@/store/workstation-store";
import { toast } from "sonner";

export interface TerminalDrawerProps {
  onFixWithAI?: (errorMessage: string) => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({ onFixWithAI }) => {
  const { terminalLogs, isTerminalRunning, projectRoot, setTerminalRunning, addTerminalLog } =
    useWorkstationStore();
  const [isOpen, setIsOpen] = useState(true);

  const runCommand = async (binary: string, args: string[]) => {
    setTerminalRunning(true);
    const cmdStr = `${binary} ${args.join(" ")}`;
    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          binary,
          args,
          cwd: projectRoot,
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
        toast.success(`Command completed: ${cmdStr}`);
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
    <div className="border-t border-[#242b3d] bg-[#12151e] flex flex-col font-mono text-xs">
      {/* Drawer Control Bar */}
      <div className="p-2.5 flex items-center justify-between bg-[#1a1f2c] border-b border-[#242b3d]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">Safe Terminal Runner</span>
          {latestLog && (
            <Badge variant={latestLog.exitCode === 0 ? "success" : "destructive"}>
              Exit: {latestLog.exitCode}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => runCommand("npm", ["test"])}
            isLoading={isTerminalRunning}
          >
            <Play className="w-3 h-3 text-emerald-400" />
            <span>npm test</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => runCommand("npm", ["run", "lint"])}
            isLoading={isTerminalRunning}
          >
            <Play className="w-3 h-3 text-amber-400" />
            <span>lint</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => runCommand("git", ["status"])}
            isLoading={isTerminalRunning}
          >
            <Play className="w-3 h-3 text-cyan-400" />
            <span>git status</span>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            className="text-slate-400"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Terminal Log Console */}
      {isOpen && (
        <div className="h-44 overflow-y-auto p-3 bg-[#090a0f] text-slate-300 space-y-3">
          {latestLog ? (
            <div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1 pb-1 border-b border-[#1a1f2c]">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold">$ {latestLog.command}</span>
                  <span>{new Date(latestLog.timestamp).toLocaleTimeString()}</span>
                </div>

                {latestLog.exitCode !== 0 && onFixWithAI && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() =>
                      onFixWithAI(
                        `Command failed: ${latestLog.command}\n\nSTDOUT:\n${latestLog.stdout}\n\nSTDERR:\n${latestLog.stderr}`
                      )
                    }
                  >
                    <Bug className="w-3 h-3" />
                    <span>Auto-Fix with AETHER</span>
                  </Button>
                )}
              </div>

              {latestLog.stdout && (
                <pre className="whitespace-pre-wrap break-all text-slate-300 leading-relaxed">
                  {latestLog.stdout}
                </pre>
              )}

              {latestLog.stderr && (
                <pre className="whitespace-pre-wrap break-all text-red-400 mt-2 leading-relaxed">
                  {latestLog.stderr}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-slate-500 italic p-4 text-center">
              No terminal executions yet. Click &ldquo;npm test&rdquo; or &ldquo;lint&rdquo; above to run whitelisted project commands.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
