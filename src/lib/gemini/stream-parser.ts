export interface ExtractedFile {
  path: string;
  lang: string;
  content: string;
}

export interface ParsedStreamState {
  raw: string;
  thinking: string;
  isThinking: boolean;
  plan: string;
  cleanText: string;
  extractedFiles: ExtractedFile[];
}

export class StreamParser {
  private buffer = "";

  /**
   * Appends incoming chunk to internal buffer.
   */
  public feed(chunk: string): ParsedStreamState {
    this.buffer += chunk;
    return this.getState();
  }

  /**
   * Parses the current accumulated stream state.
   */
  public getState(): ParsedStreamState {
    let thinking = "";
    let isThinking = false;
    let plan = "";

    // 1. Parse <thinking>
    const thinkingStart = this.buffer.indexOf("<thinking>");
    if (thinkingStart !== -1) {
      const thinkingEnd = this.buffer.indexOf("</thinking>", thinkingStart);
      if (thinkingEnd !== -1) {
        thinking = this.buffer.slice(thinkingStart + "<thinking>".length, thinkingEnd).trim();
        isThinking = false;
      } else {
        thinking = this.buffer.slice(thinkingStart + "<thinking>".length).trim();
        isThinking = true;
      }
    }

    // 2. Parse <plan>
    const planStart = this.buffer.indexOf("<plan>");
    if (planStart !== -1) {
      const planEnd = this.buffer.indexOf("</plan>", planStart);
      if (planEnd !== -1) {
        plan = this.buffer.slice(planStart + "<plan>".length, planEnd).trim();
      } else {
        plan = this.buffer.slice(planStart + "<plan>".length).trim();
      }
    }

    // 3. Clean user-facing text
    let cleanText = this.buffer
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
      .replace(/<thinking>[\s\S]*/g, "")
      .replace(/<plan>[\s\S]*?<\/plan>/g, "")
      .replace(/<plan>[\s\S]*/g, "")
      .trim();

    // 4. Extract tagged code files (```lang:path ... ```)
    const extractedFiles: ExtractedFile[] = [];
    const fileBlockRegex = /```([a-zA-Z0-9_\-\.]+):([^\n]+)\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = fileBlockRegex.exec(this.buffer)) !== null) {
      const lang = match[1].trim();
      const filePath = match[2].trim();
      const content = match[3];
      extractedFiles.push({
        lang,
        path: filePath,
        content,
      });
    }

    return {
      raw: this.buffer,
      thinking,
      isThinking,
      plan,
      cleanText,
      extractedFiles,
    };
  }
}
