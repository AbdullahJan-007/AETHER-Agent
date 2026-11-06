"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ConversationRecord,
  ConversationSummary,
} from "@/lib/types/conversation";
import { toast } from "sonner";

const LOCAL_STORAGE_KEY = "aether:conversations:v1";

function readBrowserConversations(): Record<string, ConversationRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBrowserConversations(map: Record<string, ConversationRecord>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

function toSummary(record: ConversationRecord): ConversationSummary {
  return {
    id: record.id,
    title: record.title || "Untitled Conversation",
    projectRoot: record.projectRoot || ".",
    mode: record.mode || "build",
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
    messageCount: Array.isArray(record.messages) ? record.messages.length : 0,
  };
}

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummaries = useCallback(async () => {
    const localMap = readBrowserConversations();
    const merged = new Map<string, ConversationSummary>();

    for (const rec of Object.values(localMap)) {
      if (rec && rec.id) {
        merged.set(rec.id, toSummary(rec));
      }
    }

    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        for (const srv of data.conversations as ConversationSummary[]) {
          const existing = merged.get(srv.id);
          if (
            !existing ||
            new Date(srv.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
          ) {
            merged.set(srv.id, srv);
          }
        }
      }
    } catch {
      // Offline or serverless fallback: rely on browser localStorage
    }

    const sorted = Array.from(merged.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setConversations(sorted);
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const selectConversation = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const localMap = readBrowserConversations();
      const localRecord = localMap[id];

      if (localRecord) {
        setActiveId(id);
        setActiveConversation(localRecord);
      }

      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.success && data.conversation) {
        const srvRecord = data.conversation as ConversationRecord;
        if (
          !localRecord ||
          new Date(srvRecord.updatedAt).getTime() >= new Date(localRecord.updatedAt).getTime()
        ) {
          setActiveId(id);
          setActiveConversation(srvRecord);
          localMap[id] = srvRecord;
          writeBrowserConversations(localMap);
        }
      } else if (!localRecord) {
        toast.error("Could not load conversation.");
      }
    } catch {
      const localMap = readBrowserConversations();
      if (localMap[id]) {
        setActiveId(id);
        setActiveConversation(localMap[id]);
      } else {
        toast.error("Failed to load conversation.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const newChat = useCallback(
    (projectRoot: string, mode: "build" | "architect" | "debug" | "review" = "build") => {
      const newId = crypto.randomUUID();
      const now = new Date().toISOString();
      const empty: ConversationRecord = {
        id: newId,
        title: "New conversation",
        projectRoot,
        mode,
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      setActiveId(newId);
      setActiveConversation(empty);
    },
    []
  );

  const saveConversation = useCallback(
    async (record: ConversationRecord) => {
      // 1. Always persist immediately to the user's browser system (localStorage)
      const localMap = readBrowserConversations();
      localMap[record.id] = record;
      writeBrowserConversations(localMap);
      setActiveConversation(record);

      // 2. Sync to server disk / tmp store in background
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const data = await res.json();
        if (data.success && data.conversation) {
          localMap[record.id] = data.conversation;
          writeBrowserConversations(localMap);
          setActiveConversation(data.conversation);
        }
      } catch {
        // Keep browser localStorage copy if server is unreachable
      } finally {
        await fetchSummaries();
      }
    },
    [fetchSummaries]
  );

  const renameConversation = useCallback(
    async (id: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;

      const localMap = readBrowserConversations();
      if (localMap[id]) {
        localMap[id] = {
          ...localMap[id],
          title: trimmed,
          updatedAt: new Date().toISOString(),
        };
        writeBrowserConversations(localMap);
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: trimmed } : c))
      );
      if (activeConversation && activeConversation.id === id) {
        setActiveConversation({ ...activeConversation, title: trimmed });
      }

      try {
        await fetch(`/api/conversations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: trimmed }),
        });
      } catch {
        // Already updated in localStorage
      }
      toast.success("Conversation renamed");
    },
    [activeConversation]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const localMap = readBrowserConversations();
      if (localMap[id]) {
        delete localMap[id];
        writeBrowserConversations(localMap);
      }

      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setActiveConversation(null);
      }

      try {
        await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
        });
      } catch {
        // Already deleted from localStorage
      }
      toast.success("Conversation deleted");
    },
    [activeId]
  );

  return {
    conversations,
    activeId,
    activeConversation,
    setActiveConversation,
    loading,
    selectConversation,
    newChat,
    saveConversation,
    renameConversation,
    deleteConversation,
    reloadSummaries: fetchSummaries,
  };
}
