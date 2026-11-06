"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  FolderGit2,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { AetherLogo } from "@/src/components/ui/aether-logo";
import type { ConversationSummary } from "@/src/lib/types/conversation";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  currentProject: string;
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  currentProject,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  // Keyboard shortcut Ctrl+N for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat]);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  const today: ConversationSummary[] = [];
  const yesterday: ConversationSummary[] = [];
  const older: ConversationSummary[] = [];

  for (const item of filtered) {
    const t = new Date(item.updatedAt).getTime();
    if (t >= todayStart) today.push(item);
    else if (t >= yesterdayStart) yesterday.push(item);
    else older.push(item);
  }

  const startEditing = (id: string, current: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(current);
  };

  const saveEditing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      onDeleteConversation(id);
    }
  };

  const renderGroup = (label: string, items: ConversationSummary[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
          {label}
        </div>
        <div className="space-y-1 mt-1">
          {items.map((item) => {
            const isActive = item.id === activeId;
            const isEditing = item.id === editingId;

            return (
              <div
                key={item.id}
                onClick={() => onSelectConversation(item.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive
                    ? "bg-white shadow-xs border border-orange-200 text-stone-900 font-semibold"
                    : "text-stone-600 hover:bg-stone-100/70 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0 mr-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-orange-500" : "text-stone-400"
                    }`}
                    strokeWidth={1.9}
                  />

                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white px-1 py-0.5 border border-orange-300 rounded text-xs focus:outline-hidden"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{item.title}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => saveEditing(item.id, e)}
                        className="p-1 hover:bg-emerald-50 rounded text-emerald-600"
                      >
                        <Check className="w-3 h-3" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="p-1 hover:bg-stone-200 rounded text-stone-500"
                      >
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </>
                  ) : (
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => startEditing(item.id, item.title, e)}
                        className="p-1 hover:bg-stone-200 rounded text-stone-400 hover:text-stone-700"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" strokeWidth={1.9} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1 hover:bg-rose-100 rounded text-stone-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" strokeWidth={1.9} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-64 sm:w-72 h-full flex flex-col bg-stone-50/80 border-r border-stone-200/80 backdrop-blur-md select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-stone-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AetherLogo size={28} />
          <div>
            <span className="text-base font-extrabold tracking-widest text-stone-900 font-sans">
              AETHER
            </span>
            <span className="block text-[10px] text-orange-600 font-medium tracking-wide uppercase">
              Sunrise v0.2
            </span>
          </div>
        </div>
      </div>

      {/* Action / Search */}
      <div className="p-3 space-y-2">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white text-xs font-semibold shadow-xs flex items-center justify-between transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" strokeWidth={2} />
            New Chat
          </span>
          <kbd className="px-1.5 py-0.5 bg-black/15 rounded text-[10px] font-mono">Ctrl N</kbd>
        </button>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" strokeWidth={1.9} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/80 border border-stone-200 focus:outline-hidden focus:ring-1 focus:ring-orange-500 placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-400">
            {search ? "No matching conversations" : "No chats yet"}
          </div>
        ) : (
          <>
            {renderGroup("Today", today)}
            {renderGroup("Yesterday", yesterday)}
            {renderGroup("Older", older)}
          </>
        )}
      </div>

      {/* Project Footnote */}
      <div className="p-3 border-t border-stone-200/60 bg-white/50 text-xs">
        <div className="flex items-center gap-2 text-stone-600 truncate">
          <FolderGit2 className="w-4 h-4 text-orange-500 shrink-0" strokeWidth={1.9} />
          <span className="truncate font-mono text-[11px]" title={currentProject}>
            {currentProject.split(/[\\/]/).pop() || "No project connected"}
          </span>
        </div>
      </div>
    </aside>
  );
}
