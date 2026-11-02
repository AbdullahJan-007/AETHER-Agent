import fs from "fs";
import path from "path";
import { PathGuard } from "../security/path-guard";
import { DiffCalculator, StagedDiff, DiffLine } from "./diff-calculator";

export { DiffCalculator };
export type { StagedDiff, DiffLine };

export class PatchEngine {
  /**
   * Delegates diff calculation to pure DiffCalculator.
   */
  public static stagePatch(filePath: string, originalContent: string, newContent: string): StagedDiff {
    return DiffCalculator.calculateDiff(filePath, originalContent, newContent);
  }

  /**
   * Applies the new content to disk safely, creating a .backup file first.
   * SERVER-SIDE ONLY: Requires Node.js fs.
   */
  public static async applyPatch(
    filePath: string,
    newContent: string,
    rootPath: string
  ): Promise<{ success: boolean; backupPath: string; error?: string }> {
    const validation = PathGuard.validatePath(filePath, rootPath);
    if (!validation.safe) {
      return { success: false, backupPath: "", error: validation.error };
    }

    const targetFile = validation.canonicalPath;

    // Ensure parent directory exists
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Backup existing file if present
    let backupPath = "";
    if (fs.existsSync(targetFile)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      backupPath = `${targetFile}.${timestamp}.backup`;
      fs.copyFileSync(targetFile, backupPath);
    }

    // Write new content
    fs.writeFileSync(targetFile, newContent, "utf-8");

    return {
      success: true,
      backupPath,
    };
  }
}
