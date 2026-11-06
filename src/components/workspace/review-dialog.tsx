"use client";

import React, { useState } from "react";
import {
  CheckSquare,
  Square,
  Save,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Download,
} from "lucide-react";
import type { ProposedChange } from "@/lib/agent/tools/types";
import { useWorkstationStore } from "@/store/workstation-store";
import {
  applyChangesToBrowserDirectory,
  downloadVirtualWorkspaceZip,
} from "@/lib/workspace/browser-fs";
import { toast } from "sonner";

interface ReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ProposedChange[];
  projectRoot: string;
  onSaved: (savedPaths: string[]) => void;
  onDiscard: () => void;
  onAskRevision: (feedback: string) => void;
}

export function ReviewDialog({
  isOpen,
  onClose,
  changes,
  projectRoot,
  onSaved,
  onDiscard,
  onAskRevision,
}: ReviewDialogProps) {
  const { workspaceMode, virtualFiles, dirHandle, updateVirtualFiles } =
    useWorkstationStore();
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(
    () => new Set(changes.map((c) => c.path))
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  React.useEffect(() => {
    setSelectedPaths(new Set(changes.map((c) => c.path)));
  }, [changes]);

  if (!isOpen || changes.length === 0) return null;

  const totalAdditions = changes.reduce((sum, c) => sum + (c.diff?.additions || 0), 0);
  const totalDeletions = changes.reduce((sum, c) => sum + (c.diff?.deletions || 0), 0);

  const toggleSelect = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedPaths(next);
  };

  const toggleSelectAll = () => {
    if (selectedPaths.size === changes.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(changes.map((c) => c.path)));
    }
  };

  const toggleExpand = (path: string) => {
    const next = new Set(expandedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedPaths(next);
  };

  const handleSave = async () => {
    const toSave = changes.filter((c) => selectedPaths.has(c.path));
    if (toSave.length === 0) {
      toast.error("Select at least one file to save.");
      return;
    }

    setIsSaving(true);
    const savedPaths: string[] = [];

    try {
      if (workspaceMode === "browser") {
        const updates: Record<string, string> = {};
        for (const item of toSave) {
          updates[item.path] = item.content;
          savedPaths.push(item.path);
        }
        updateVirtualFiles(updates);

        if (dirHandle) {
          await applyChangesToBrowserDirectory(
            dirHandle,
            toSave.map((item) => ({
              filePath: item.path,
              proposedContent: item.content,
            }))
          );
          toast.success(
            `Saved ${savedPaths.length} file${savedPaths.length === 1 ? "" : "s"} directly to your PC folder (with .backup)`
          );
        } else {
          toast.success(
            `Applied ${savedPaths.length} file${savedPaths.length === 1 ? "" : "s"} in workspace. Click Download ZIP anytime to export.`
          );
        }

        onSaved(savedPaths);
        onClose();
        return;
      }

      for (const item of toSave) {
        const res = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "apply",
            file: item.path,
            content: item.content,
            root: projectRoot,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Failed to save ${item.path}`);
        }
        savedPaths.push(item.path);
      }

      toast.success(
        `Saved ${savedPaths.length} file${savedPaths.length === 1 ? "" : "s"} safely (with .backup protection)`
      );
      onSaved(savedPaths);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Error saving changes: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPatchedZip = async () => {
    const toSave = changes.filter((c) => selectedPaths.has(c.path));
    const updates: Record<string, string> = {};
    for (const item of toSave) {
      updates[item.path] = item.content;
    }
    const merged = { ...virtualFiles, ...updates };
    updateVirtualFiles(updates);
    await downloadVirtualWorkspaceZip(projectRoot || "aether-workspace", merged);
    toast.success("Downloaded patched workspace ZIP");
  };

  const handleSendRevision = () => {
    if (!revisionFeedback.trim()) return;
    onAskRevision(revisionFeedback.trim());
    setRevisionFeedback("");
    setShowRevisionInput(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600" />

        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-start justify-between bg-stone-50/60">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-500" strokeWidth={1.9} />
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                Review & Save Proposed Changes
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              No files are modified until you confirm. Inspect proposed changes below.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              +{totalAdditions}
            </span>
            <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200">
              -{totalDeletions}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 hover:text-stone-800 font-medium cursor-pointer"
            >
              {selectedPaths.size === changes.length ? (
                <CheckSquare className="w-4 h-4 text-orange-500" strokeWidth={1.9} />
              ) : (
                <Square className="w-4 h-4 text-stone-400" strokeWidth={1.9} />
              )}
              {selectedPaths.size === changes.length ? "Deselect all" : "Select all"}
            </button>
            <span>{changes.length} files proposed</span>
          </div>

          {changes.map((c) => {
            const isSelected = selectedPaths.has(c.path);
            const isExpanded = expandedPaths.has(c.path);

            return (
              <div
                key={c.path}
                className={`border rounded-xl transition-colors ${
                  isSelected ? "border-orange-200 bg-orange-50/20" : "border-stone-200 bg-white"
                }`}
              >
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelect(c.path)}
                      className="cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-orange-500" strokeWidth={1.9} />
                      ) : (
                        <Square className="w-4 h-4 text-stone-300" strokeWidth={1.9} />
                      )}
                    </button>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        c.isNew
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {c.isNew ? "NEW" : "EDITED"}
                    </span>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-stone-800 truncate font-mono">
                        {c.path}
                      </div>
                      <div className="text-[11px] text-stone-500 truncate mt-0.5">
                        {c.reason}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-emerald-600">
                      +{c.diff?.additions || 0}
                    </span>
                    <span className="text-[11px] font-mono text-rose-600">
                      -{c.diff?.deletions || 0}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleExpand(c.path)}
                      className="p-1 hover:bg-stone-100 rounded text-stone-500 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" strokeWidth={1.9} />
                      ) : (
                        <ChevronRight className="w-4 h-4" strokeWidth={1.9} />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && c.diff?.diffLines && (
                  <div className="p-3 bg-stone-900 rounded-b-xl font-mono text-[11px] text-stone-200 overflow-x-auto max-h-60 border-t border-stone-100">
                    {c.diff.diffLines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`px-2 py-0.5 whitespace-pre ${
                          line.type === "add"
                            ? "bg-emerald-950/70 text-emerald-300"
                            : line.type === "delete"
                            ? "bg-rose-950/70 text-rose-300"
                            : "text-stone-400"
                        }`}
                      >
                        <span className="inline-block w-4 opacity-50">
                          {line.type === "add" ? "+" : line.type === "delete" ? "-" : " "}
                        </span>
                        {line.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {showRevisionInput && (
            <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Feedback for AETHER:
              </label>
              <textarea
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="Explain what needs to be changed or refined..."
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                rows={2}
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRevisionInput(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendRevision}
                  className="px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white rounded-lg cursor-pointer"
                >
                  Send Revision Request
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDiscard}
              className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.9} />
              Discard All
            </button>

            {!showRevisionInput && (
              <button
                type="button"
                onClick={() => setShowRevisionInput(true)}
                className="px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.9} />
                Ask AI to Revise
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {workspaceMode === "browser" && (
              <button
                type="button"
                onClick={handleDownloadPatchedZip}
                className="px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 border border-stone-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.9} />
                Download ZIP
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              disabled={isSaving || selectedPaths.size === 0}
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5" strokeWidth={1.9} />
              {isSaving
                ? "Saving..."
                : `Save ${selectedPaths.size} File${selectedPaths.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
