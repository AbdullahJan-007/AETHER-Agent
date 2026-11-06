import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { ConversationStore } from "../conversation-store";
import type { ConversationRecord } from "../../types/conversation";

describe("ConversationStore", () => {
  const tempDir = path.resolve("./test-tmp-conversations");

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("validates UUIDs and strictly rejects path traversal strings", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(ConversationStore.isValidUUID(validUuid)).toBe(true);

    expect(ConversationStore.isValidUUID("../traversal")).toBe(false);
    expect(ConversationStore.isValidUUID("not-a-uuid")).toBe(false);
    expect(ConversationStore.isValidUUID("")).toBe(false);
    expect(ConversationStore.isValidUUID("123e4567-e89b-12d3-a456-426614174000/evil")).toBe(false);
  });

  it("atomically saves and retrieves a conversation record", () => {
    const id = "a0000000-0000-4000-8000-000000000001";
    const record: ConversationRecord = {
      id,
      title: "Test Chat",
      projectRoot: "/tmp/project",
      mode: "build",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: "m-1",
          role: "user",
          content: "Hello Aether",
        },
      ],
    };

    ConversationStore.saveConversation(record, tempDir);

    const retrieved = ConversationStore.getConversation(id, tempDir);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe("Test Chat");
    expect(retrieved?.messages).toHaveLength(1);
    expect(retrieved?.messages[0].content).toBe("Hello Aether");
  });

  it("lists conversation summaries ordered by updatedAt descending", () => {
    const id1 = "a0000000-0000-4000-8000-000000000001";
    const id2 = "b0000000-0000-4000-8000-000000000002";

    const older: ConversationRecord = {
      id: id1,
      title: "Older Chat",
      projectRoot: "/tmp/project",
      mode: "architect",
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-01T10:00:00.000Z",
      messages: [],
    };

    const newer: ConversationRecord = {
      id: id2,
      title: "Newer Chat",
      projectRoot: "/tmp/project",
      mode: "build",
      createdAt: "2026-11-02T10:00:00.000Z",
      updatedAt: "2026-11-02T10:00:00.000Z",
      messages: [],
    };

    ConversationStore.saveConversation(older, tempDir);
    ConversationStore.saveConversation(newer, tempDir);

    const summaries = ConversationStore.listSummaries(tempDir);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].id).toBe(id2); // Newer first
    expect(summaries[1].id).toBe(id1);
  });

  it("renames and deletes conversations", () => {
    const id = "c0000000-0000-4000-8000-000000000003";
    const record: ConversationRecord = {
      id,
      title: "Initial Title",
      projectRoot: "/tmp/project",
      mode: "debug",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    ConversationStore.saveConversation(record, tempDir);
    expect(ConversationStore.renameConversation(id, "Renamed Title", tempDir)).toBe(true);

    const renamed = ConversationStore.getConversation(id, tempDir);
    expect(renamed?.title).toBe("Renamed Title");

    expect(ConversationStore.deleteConversation(id, tempDir)).toBe(true);
    expect(ConversationStore.getConversation(id, tempDir)).toBeNull();
  });
});
