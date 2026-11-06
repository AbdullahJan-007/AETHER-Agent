"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar, WorkstationHeader } from "@/components/layout";
import {
  ProjectSwitcher,
  FileTree,
  StagedDiffViewer,
  ReviewDialog,
} from "@/components/workspace";
import { TerminalDrawer } from "@/components/terminal";
import { MessageList, ChatInput } from "@/components/chat";
import { useWorkstationStore, workstationStore } from "@/store/workstation-store";
import { useConversations } from "@/hooks/use-conversations";
import { useChatSession } from "@/hooks/use-chat-session";
import type { AgentMode } from "@/lib/agent/system-prompt";
import type { ProposedChange } from "@/lib/agent/tools/types";
import { toast } from "sonner";

export default function WorkstationPage() {
  const {
    projectRoot,
    workspaceMode,
    virtualFiles,
    userApiKey,
    selectedFile,
    selectedFileContent,
    addStagedDiff,
    clearStagedDiffs,
    setFileTree,
    setSelectedFile,
  } = useWorkstationStore();
  const [activeMode, setActiveMode] = useState<AgentMode>("build");
  const [rightTab, setRightTab] = useState<"files" | "diff">("files");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [activeProposals, setActiveProposals] = useState<ProposedChange[]>([]);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  const {
    conversations,
    activeId,
    activeConversation,
    setActiveConversation,
    selectConversation,
    newChat,
    saveConversation,
    renameConversation,
    deleteConversation,
  } = useConversations();

  const { isStreaming, proposedChanges, setProposedChanges, sendMessage, stop } =
    useChatSession();

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      selectConversation(conversations[0].id);
    } else if (!activeId && conversations.length === 0) {
      newChat(projectRoot || ".", "build");
    }
  }, [activeId, conversations, selectConversation, newChat, projectRoot]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsLeftSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (proposedChanges.length > 0) {
      setActiveProposals(proposedChanges);
      for (const p of proposedChanges) {
        addStagedDiff(p.diff);
      }
    }
  }, [proposedChanges, addStagedDiff]);

  const refreshWorkspaceTree = useCallback(
    async (savedPaths: string[] = []) => {
      if (workspaceMode === "browser") {
        if (selectedFile && savedPaths.includes(selectedFile)) {
          const latest = workstationStore.getState().virtualFiles[selectedFile];
          if (latest !== undefined) {
            setSelectedFile(selectedFile, latest);
          }
        }
        return;
      }

      const targetRoot = projectRoot || ".";
      try {
        const res = await fetch(
          `/api/workspace?action=tree&root=${encodeURIComponent(targetRoot)}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.tree)) {
          setFileTree(data.tree);
        }

        if (selectedFile && savedPaths.includes(selectedFile)) {
          const readRes = await fetch(
            `/api/workspace?action=read&file=${encodeURIComponent(
              selectedFile
            )}&root=${encodeURIComponent(targetRoot)}`
          );
          const readData = await readRes.json();
          if (readData.success) {
            setSelectedFile(selectedFile, readData.content);
          }
        }
      } catch {
        // Ignore background refresh error
      }
    },
    [workspaceMode, projectRoot, selectedFile, setFileTree, setSelectedFile]
  );

  const currentMessages = activeConversation?.messages || [];

  const handleSendMessage = (
    text: string,
    mode: AgentMode,
    attachments: Array<{ name: string; content: string }>
  ) => {
    const root = projectRoot || ".";

    sendMessage({
      content: text,
      root,
      mode,
      existingMessages: currentMessages,
      attachedFiles: attachments.map((a) => ({ path: a.name, content: a.content })),
      virtualFiles: workspaceMode === "browser" ? virtualFiles : undefined,
      apiKey: userApiKey || undefined,
      onUpdate: (updatedMessages) => {
        if (activeConversation) {
          setActiveConversation({
            ...activeConversation,
            projectRoot: root,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
          });
        }
      },
      onFinished: (finishedMessages, proposals) => {
        if (activeConversation) {
          const updated = {
            ...activeConversation,
            projectRoot: root,
            messages: finishedMessages,
            updatedAt: new Date().toISOString(),
          };
          setActiveConversation(updated);
          saveConversation(updated);
        }

        if (proposals.length > 0) {
          setActiveProposals(proposals);
          setIsReviewOpen(true);
        }
      },
    });
  };

  const handleOpenReview = (changes?: ProposedChange[]) => {
    if (changes && changes.length > 0) {
      setActiveProposals(changes);
    }
    setIsReviewOpen(true);
  };

  const handleSaved = (savedPaths: string[]) => {
    setProposedChanges([]);
    setActiveProposals([]);
    clearStagedDiffs();
    refreshWorkspaceTree(savedPaths);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent select-none text-stone-900 font-sans">
      {isLeftSidebarOpen && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelectConversation={selectConversation}
          onNewChat={() => newChat(projectRoot || ".", activeMode)}
          onRenameConversation={renameConversation}
          onDeleteConversation={deleteConversation}
          currentProject={projectRoot}
        />
      )}

      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <WorkstationHeader
          activeRightTab={rightTab}
          onTabChange={setRightTab}
          title={activeConversation?.title}
          onOpenReview={() => handleOpenReview(activeProposals)}
          pendingChangesCount={activeProposals.length}
          isLeftSidebarOpen={isLeftSidebarOpen}
          onToggleLeftSidebar={() => setIsLeftSidebarOpen((prev) => !prev)}
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
        />

        <div className="flex flex-1 overflow-hidden">
          <main className="flex flex-col flex-1 min-w-0 border-r border-stone-200/80 bg-white/40 backdrop-blur-xs">
            <ProjectSwitcher />

            <MessageList
              messages={currentMessages}
              isStreaming={isStreaming}
              onOpenReview={handleOpenReview}
            />

            <ChatInput
              onSendMessage={handleSendMessage}
              onStopGeneration={stop}
              isGenerating={isStreaming}
              activeMode={activeMode}
              onModeChange={setActiveMode}
            />

            <TerminalDrawer
              onFixWithAI={(errLog) => handleSendMessage(errLog, "debug", [])}
            />
          </main>

          {isRightPanelOpen && (
            <aside className="flex flex-col w-80 sm:w-96 shrink-0 bg-white/80 border-stone-200/80">
              {rightTab === "files" ? (
                <div className="flex flex-col h-full">
                  <FileTree />
                  {selectedFile && selectedFileContent !== null && (
                    <div className="border-t border-stone-200 p-3 max-h-56 overflow-y-auto bg-stone-900 font-mono text-xs text-stone-200">
                      <div className="text-stone-400 font-semibold mb-1 truncate">
                        {selectedFile}
                      </div>
                      <pre className="whitespace-pre-wrap">{selectedFileContent}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <StagedDiffViewer />
              )}
            </aside>
          )}
        </div>
      </div>

      <ReviewDialog
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        changes={activeProposals}
        projectRoot={projectRoot || "."}
        onSaved={handleSaved}
        onDiscard={() => {
          setActiveProposals([]);
          setProposedChanges([]);
          clearStagedDiffs();
          setIsReviewOpen(false);
          toast.info("Proposed changes discarded.");
        }}
        onAskRevision={(feedback) => {
          handleSendMessage(feedback, "build", []);
        }}
      />
    </div>
  );
}
