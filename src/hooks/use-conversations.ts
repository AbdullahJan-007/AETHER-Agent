"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ConversationRecord,
  ConversationSummary,
} from "@/lib/types/conversation";
import { toast } from "sonner";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummaries = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      }
    } catch {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const selectConversation = useCallback(
    async (id: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/conversations/${id}`);
        const data = await res.json();
        if (data.success && data.conversation) {
          setActiveId(id);
          setActiveConversation(data.conversation);
        } else {
          toast.error("Could not load conversation.");
        }
      } catch (err: unknown) {
        toast.error("Failed to connect to conversation store.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
        const data = await res.json();
        if (data.success && data.conversation) {
          setActiveConversation(data.conversation);
          await fetchSummaries();
        }
      } catch (err: unknown) {
        console.error("Auto-save failed:", err);
      }
    },
    [fetchSummaries]
  );

  const renameConversation = useCallback(
    async (id: string, newTitle: string) => {
      try {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });
        const data = await res.json();
        if (data.success) {
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
          );
          if (activeConversation && activeConversation.id === id) {
            setActiveConversation({ ...activeConversation, title: newTitle });
          }
          toast.success("Conversation renamed");
        }
      } catch {
        toast.error("Failed to rename conversation");
      }
    },
    [activeConversation]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (data.success) {
          setConversations((prev) => prev.filter((c) => c.id !== id));
          if (activeId === id) {
            setActiveId(null);
            setActiveConversation(null);
          }
          toast.success("Conversation deleted");
        }
      } catch {
        toast.error("Failed to delete conversation");
      }
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
