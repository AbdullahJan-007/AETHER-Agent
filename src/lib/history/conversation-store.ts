import fs from "fs";
import path from "path";
import type {
  ConversationRecord,
  ConversationSummary,
} from "../types/conversation";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ConversationStore {
  private static defaultDir = path.resolve(process.cwd(), "data", "conversations");

  public static isValidUUID(id: string): boolean {
    return typeof id === "string" && UUID_REGEX.test(id.trim());
  }

  public static getDir(customDir?: string): string {
    const targetDir = customDir ? path.resolve(customDir) : this.defaultDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  public static listSummaries(customDir?: string): ConversationSummary[] {
    const dir = this.getDir(customDir);
    let files: string[] = [];
    try {
      files = fs.readdirSync(dir);
    } catch {
      return [];
    }

    const summaries: ConversationSummary[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const id = file.slice(0, -5);
      if (!this.isValidUUID(id)) continue;

      try {
        const fullPath = path.join(dir, file);
        const raw = fs.readFileSync(fullPath, "utf-8");
        const parsed = JSON.parse(raw) as ConversationRecord;

        summaries.push({
          id: parsed.id || id,
          title: parsed.title || "Untitled Conversation",
          projectRoot: parsed.projectRoot || "",
          mode: parsed.mode || "build",
          createdAt: parsed.createdAt || new Date().toISOString(),
          updatedAt: parsed.updatedAt || parsed.createdAt || new Date().toISOString(),
          messageCount: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
        });
      } catch {
        // Skip corrupted or unreadable files
      }
    }

    // Sort newest updated first
    summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return summaries;
  }

  public static getConversation(id: string, customDir?: string): ConversationRecord | null {
    if (!this.isValidUUID(id)) {
      throw new Error(`Invalid conversation UUID: "${id}"`);
    }

    const dir = this.getDir(customDir);
    const filePath = path.join(dir, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ConversationRecord;
  }

  public static saveConversation(record: ConversationRecord, customDir?: string): void {
    if (!this.isValidUUID(record.id)) {
      throw new Error(`Invalid conversation UUID: "${record.id}"`);
    }

    const dir = this.getDir(customDir);
    const targetPath = path.join(dir, `${record.id}.json`);
    const tempPath = path.join(dir, `${record.id}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);

    const json = JSON.stringify(record, null, 2);

    // Atomic save: write to temp file then rename into place
    fs.writeFileSync(tempPath, json, "utf-8");
    fs.renameSync(tempPath, targetPath);
  }

  public static renameConversation(id: string, newTitle: string, customDir?: string): boolean {
    const convo = this.getConversation(id, customDir);
    if (!convo) return false;

    convo.title = newTitle.trim() || convo.title;
    convo.updatedAt = new Date().toISOString();
    this.saveConversation(convo, customDir);
    return true;
  }

  public static deleteConversation(id: string, customDir?: string): boolean {
    if (!this.isValidUUID(id)) {
      throw new Error(`Invalid conversation UUID: "${id}"`);
    }

    const dir = this.getDir(customDir);
    const filePath = path.join(dir, `${id}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}
