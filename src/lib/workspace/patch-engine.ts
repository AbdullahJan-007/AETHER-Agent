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
   * Hardened against symlink escapes and sensitive file overwrites (.env, .git, keys).
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
    const rootCheck = PathGuard.validateRoot(rootPath);
    if (!rootCheck.safe) {
      return { success: false, backupPath: "", error: rootCheck.error };
    }

    const relToRoot = path.relative(rootCheck.canonicalPath, targetFile);
    if (PathGuard.isSensitivePath(relToRoot)) {
      return {
        success: false,
        backupPath: "",
        error: `Security violation: Modifying sensitive or protected file "${relToRoot}" is strictly prohibited.`,
      };
    }

    // Verify realpath of existing ancestor/target to block symlink escapes outside root
    try {
      const realRoot = fs.realpathSync(rootCheck.canonicalPath);
      const rootCmp = process.platform === "win32" ? realRoot.toLowerCase() : realRoot;

      let probe = targetFile;
      while (!fs.existsSync(probe)) {
        const parent = path.dirname(probe);
        if (parent === probe) break;
        probe = parent;
      }

      if (fs.existsSync(probe)) {
        const lstat = fs.lstatSync(probe);
        if (lstat.isSymbolicLink()) {
          return {
            success: false,
            backupPath: "",
            error: `Security violation: Refusing to write through symbolic link "${filePath}".`,
          };
        }
        const realProbe = fs.realpathSync(probe);
        const probeCmp = process.platform === "win32" ? realProbe.toLowerCase() : realProbe;
        const relReal = path.relative(rootCmp, probeCmp);
        if (relReal.startsWith("..") || path.isAbsolute(relReal)) {
          return {
            success: false,
            backupPath: "",
            error: `Security violation: Target path "${filePath}" escapes workspace root via symlink.`,
          };
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, backupPath: "", error: `Symlink check failed: ${msg}` };
    }

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

    // Write new content atomically via temp file
    const tempFile = `${targetFile}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, newContent, "utf-8");
    fs.renameSync(tempFile, targetFile);

    return {
      success: true,
      backupPath,
    };
  }
}
