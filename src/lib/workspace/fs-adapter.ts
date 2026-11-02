import fs from "fs";
import path from "path";
import { PathGuard } from "../security/path-guard";
import type { FileNode } from "./diff-calculator";

export type { FileNode };

export class FsAdapter {
  private static readonly MAX_TREE_FILES = 10_000;
  private static readonly MAX_DEPTH = 15;
  private static readonly MAX_FILE_READ_BYTES = 5 * 1024 * 1024; // 5MB

  private static readonly IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    ".superpowers",
    ".turbo",
    ".cache",
    ".idea",
    ".vscode",
  ]);

  /**
   * Scans a workspace directory recursively and returns all non-ignored files.
   * Hardened against symlink escapes, circular loops, and deep-nesting DoS.
   */
  public static async listTree(rootPath: string): Promise<FileNode[]> {
    const rootValidation = PathGuard.validateRoot(rootPath);
    if (!rootValidation.safe) {
      throw new Error(rootValidation.error || "Invalid workspace root.");
    }

    const normalizedRoot = rootValidation.canonicalPath;
    const realRoot = fs.realpathSync(normalizedRoot);
    const results: FileNode[] = [];
    const visitedPaths = new Set<string>();

    const walk = (currentDir: string, currentDepth: number) => {
      if (currentDepth > this.MAX_DEPTH || results.length >= this.MAX_TREE_FILES) {
        return;
      }

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return; // Skip unreadable directories
      }

      for (const entry of entries) {
        if (this.IGNORED_DIRS.has(entry.name) || entry.name.endsWith(".backup")) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);

        // Resolve symlinks and verify they stay within workspace
        let realEntryPath: string;
        try {
          realEntryPath = fs.realpathSync(fullPath);
        } catch {
          continue; // Broken symlink or inaccessible file
        }

        const relativeToReal = path.relative(realRoot, realEntryPath);
        if (relativeToReal.startsWith("..") || path.isAbsolute(relativeToReal)) {
          continue; // Symlink escapes project root — ignore for security
        }

        const relativePath = path.relative(normalizedRoot, fullPath).replace(/\\/g, "/");

        if (entry.isDirectory()) {
          if (visitedPaths.has(realEntryPath)) {
            continue; // Prevent circular symlink loops
          }
          visitedPaths.add(realEntryPath);

          results.push({
            path: relativePath,
            name: entry.name,
            type: "directory",
          });
          walk(fullPath, currentDepth + 1);
        } else if (entry.isFile()) {
          try {
            const stats = fs.statSync(fullPath);
            results.push({
              path: relativePath,
              name: entry.name,
              type: "file",
              size: stats.size,
            });
          } catch {
            // Skip inaccessible file
          }
        }
      }
    };

    walk(normalizedRoot, 0);
    return results;
  }

  /**
   * Safely reads a file from the workspace, validating against path traversal and symlink escapes.
   */
  public static async readFile(filePath: string, rootPath: string): Promise<string> {
    const validation = PathGuard.validatePath(filePath, rootPath);
    if (!validation.safe) {
      throw new Error(validation.error || "Path validation failed");
    }

    if (!fs.existsSync(validation.canonicalPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Verify realpath to guard against symlink target outside workspace
    const realFilePath = fs.realpathSync(validation.canonicalPath);
    const rootCheck = PathGuard.validateRoot(rootPath);
    const realRoot = fs.realpathSync(rootCheck.canonicalPath);
    const relative = path.relative(realRoot, realFilePath);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Security violation: File "${filePath}" points outside project root via symlink.`);
    }

    const stats = fs.statSync(realFilePath);
    if (stats.size > this.MAX_FILE_READ_BYTES) {
      throw new Error(`File exceeds maximum readable size limit of 5MB (${stats.size} bytes).`);
    }

    return fs.readFileSync(realFilePath, "utf-8");
  }
}
