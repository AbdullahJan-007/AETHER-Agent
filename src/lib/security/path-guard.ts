import path from "path";
import fs from "fs";

export interface PathValidationResult {
  safe: boolean;
  canonicalPath: string;
  error?: string;
}

export class PathGuard {
  private static readonly WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

  // OS Critical System Directories that must never be designated as project root
  private static readonly RESTRICTED_SYSTEM_ROOTS = [
    /^[a-zA-Z]:[\\/]?$/i, // Drive roots like C:\ or D:\
    /^[a-zA-Z]:[\\/]windows/i,
    /^[a-zA-Z]:[\\/]program files/i,
    /^[a-zA-Z]:[\\/]program files \(x86\)/i,
    /^[a-zA-Z]:[\\/]system volume information/i,
    /^[a-zA-Z]:[\\/]recovery/i,
    /^\/$/, // Root directory in Unix
    /^\/(etc|usr|var|bin|sbin|proc|sys|dev|root)($|\/)/i,
  ];

  /**
   * Validates that a workspace root is safe and does not target system-critical directories.
   */
  public static validateRoot(rootPath: string): PathValidationResult {
    if (!rootPath || typeof rootPath !== "string") {
      return { safe: false, canonicalPath: "", error: "Root path is required." };
    }

    if (rootPath.includes("\0")) {
      return { safe: false, canonicalPath: "", error: "Invalid path: null byte detected." };
    }

    const resolved = path.resolve(rootPath);

    // Prevent designating entire drive or operating system root as workspace
    for (const pattern of this.RESTRICTED_SYSTEM_ROOTS) {
      if (pattern.test(resolved)) {
        return {
          safe: false,
          canonicalPath: resolved,
          error: `Restricted path: "${resolved}" is a protected operating system directory.`,
        };
      }
    }

    if (!fs.existsSync(resolved)) {
      return {
        safe: false,
        canonicalPath: resolved,
        error: `Directory not found: "${resolved}".`,
      };
    }

    try {
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        return {
          safe: false,
          canonicalPath: resolved,
          error: `Path is not a directory: "${resolved}".`,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Access error";
      return { safe: false, canonicalPath: resolved, error: `Filesystem error: ${msg}` };
    }

    return { safe: true, canonicalPath: resolved };
  }

  /**
   * Validates that targetPath is strictly inside rootPath, preventing directory traversal.
   * Hardened against null bytes, Windows reserved devices, alternate data streams, and symlink escapes.
   */
  public static validatePath(targetPath: string, rootPath: string): PathValidationResult {
    if (!targetPath || !rootPath) {
      return { safe: false, canonicalPath: "", error: "Target path and root path are required." };
    }

    if (targetPath.includes("\0")) {
      return { safe: false, canonicalPath: "", error: "Invalid path characters: null byte detected." };
    }

    // Check for Windows reserved device names in path segments
    const segments = targetPath.replace(/\\/g, "/").split("/");
    for (const segment of segments) {
      if (this.WINDOWS_RESERVED_NAMES.test(segment.trim())) {
        return {
          safe: false,
          canonicalPath: "",
          error: `Forbidden path: "${segment}" is a Windows reserved device name.`,
        };
      }
    }

    // Check for alternate data streams (colon in filename after root drive)
    const cleanedPath = targetPath.replace(/^[a-zA-Z]:/, "");
    if (cleanedPath.includes(":")) {
      return {
        safe: false,
        canonicalPath: "",
        error: "Forbidden path: Alternate Data Streams (colon syntax) are prohibited.",
      };
    }

    const rootCheck = this.validateRoot(rootPath);
    if (!rootCheck.safe) {
      return rootCheck;
    }

    const normalizedRoot = rootCheck.canonicalPath;
    const resolvedTarget = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(normalizedRoot, targetPath);

    // Normalize case on Windows for accurate traversal detection
    const rootForCompare = process.platform === "win32" ? normalizedRoot.toLowerCase() : normalizedRoot;
    const targetForCompare = process.platform === "win32" ? resolvedTarget.toLowerCase() : resolvedTarget;

    const relative = path.relative(rootForCompare, targetForCompare);
    const isOutside = relative.startsWith("..") || path.isAbsolute(relative);

    if (isOutside) {
      return {
        safe: false,
        canonicalPath: resolvedTarget,
        error: `Path traversal detected: "${targetPath}" resolves outside project root "${normalizedRoot}".`,
      };
    }

    return {
      safe: true,
      canonicalPath: resolvedTarget,
    };
  }
}
