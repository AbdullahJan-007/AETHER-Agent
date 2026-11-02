export interface DiffLine {
  type: "add" | "delete" | "context";
  content: string;
}

export interface StagedDiff {
  filePath: string;
  hasChanges: boolean;
  additions: number;
  deletions: number;
  diffLines: DiffLine[];
  newContent?: string;
}

export interface FileNode {
  path: string; // Relative to root
  name: string;
  type: "file" | "directory";
  size?: number;
}

export class DiffCalculator {
  /**
   * Generates a line-by-line unified diff between original and new content.
   * Completely pure function: safe to execute in browser or server.
   */
  public static calculateDiff(
    filePath: string,
    originalContent: string,
    newContent: string
  ): StagedDiff {
    const origLines = originalContent.split("\n");
    const newLines = newContent.split("\n");

    const diffLines: DiffLine[] = [];
    let additions = 0;
    let deletions = 0;

    const maxLen = Math.max(origLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      const origLine = origLines[i];
      const newLine = newLines[i];

      if (origLine === newLine) {
        if (origLine !== undefined) {
          diffLines.push({ type: "context", content: origLine });
        }
      } else {
        if (origLine !== undefined) {
          diffLines.push({ type: "delete", content: origLine });
          deletions++;
        }
        if (newLine !== undefined) {
          diffLines.push({ type: "add", content: newLine });
          additions++;
        }
      }
    }

    return {
      filePath,
      hasChanges: additions > 0 || deletions > 0,
      additions,
      deletions,
      diffLines,
      newContent,
    };
  }
}
