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

/** Above this many cells the LCS table is skipped in favour of a block replace. */
const MAX_LCS_CELLS = 4_000_000;

export class DiffCalculator {
  /**
   * Line-level diff between original and new content.
   *
   * Uses a longest-common-subsequence alignment so inserting one line
   * reports one addition, not a cascade of changes below it. Common
   * prefix/suffix are trimmed first, which keeps typical edits cheap.
   * Pure function: safe in the browser and on the server.
   */
  public static calculateDiff(
    filePath: string,
    originalContent: string,
    newContent: string
  ): StagedDiff {
    const a = originalContent === "" ? [] : originalContent.split("\n");
    const b = newContent === "" ? [] : newContent.split("\n");

    let start = 0;
    while (start < a.length && start < b.length && a[start] === b[start]) start++;

    let endA = a.length;
    let endB = b.length;
    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
      endA--;
      endB--;
    }

    const diffLines: DiffLine[] = [];
    for (let i = 0; i < start; i++) diffLines.push({ type: "context", content: a[i] });

    const middle = this.alignMiddle(a.slice(start, endA), b.slice(start, endB));
    diffLines.push(...middle);

    for (let i = endA; i < a.length; i++) diffLines.push({ type: "context", content: a[i] });

    let additions = 0;
    let deletions = 0;
    for (const line of middle) {
      if (line.type === "add") additions++;
      else if (line.type === "delete") deletions++;
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

  private static alignMiddle(a: string[], b: string[]): DiffLine[] {
    const n = a.length;
    const m = b.length;
    if (n === 0) return b.map((content) => ({ type: "add", content }));
    if (m === 0) return a.map((content) => ({ type: "delete", content }));

    if ((n + 1) * (m + 1) > MAX_LCS_CELLS) {
      return [
        ...a.map((content): DiffLine => ({ type: "delete", content })),
        ...b.map((content): DiffLine => ({ type: "add", content })),
      ];
    }

    // lcs[i][j] = LCS length of a[i..] and b[j..], stored row-major.
    const width = m + 1;
    const lcs = new Int32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * width + j] =
          a[i] === b[j]
            ? lcs[(i + 1) * width + j + 1] + 1
            : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
      }
    }

    const out: DiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        out.push({ type: "context", content: a[i] });
        i++;
        j++;
      } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
        out.push({ type: "delete", content: a[i] });
        i++;
      } else {
        out.push({ type: "add", content: b[j] });
        j++;
      }
    }
    while (i < n) out.push({ type: "delete", content: a[i++] });
    while (j < m) out.push({ type: "add", content: b[j++] });
    return out;
  }
}
