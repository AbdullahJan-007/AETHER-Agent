export class CommandWhitelist {
  // Disallow shell operators, command substitutions, Windows variable expansions, caret escaping and quotes.
  // Quotes and "!" are blocked because Windows runs npm/npx through cmd.exe (see TerminalRunner).
  private static readonly DANGEROUS_CHARS = /[;&|<>`$\r\n%^\0"!]/;

  private static readonly ALLOWED_RULES: Record<string, Set<string>> = {
    npm: new Set(["test", "run", "lint", "build", "typecheck"]),
    npx: new Set(["vitest", "eslint", "tsc", "next"]),
    git: new Set(["status", "diff", "log", "branch", "rev-parse"]),
    node: new Set(["--version", "-v"]),
  };

  private static readonly BLOCKED_FLAGS = [
    "--upload-pack",
    "--exec-path",
    "--script-shell",
    "--onload-script",
    "--init-module",
    "--prefix",
    "--call",
    "--package",
    "--shell-auto-fallback",
    "--inspect",
    "--inspect-brk",
    "--eval",
    "--require",
    "--import",
  ];

  /**
   * Validates whether binary and argument list meet strict security criteria.
   */
  public static isAllowed(binary: string, args: string[]): boolean {
    if (!binary || typeof binary !== "string" || !Array.isArray(args)) {
      return false;
    }

    if (args.length > 16) {
      return false;
    }

    const bin = binary.toLowerCase().trim();

    if (!this.ALLOWED_RULES[bin]) {
      return false;
    }

    // Check for any dangerous shell metacharacters or forbidden execution flags in any argument
    for (const arg of args) {
      if (typeof arg !== "string" || this.DANGEROUS_CHARS.test(arg)) {
        return false;
      }
      const lowerArg = arg.toLowerCase().trim();
      for (const flag of this.BLOCKED_FLAGS) {
        if (lowerArg === flag || lowerArg.startsWith(`${flag}=`)) {
          return false;
        }
      }
    }

    // Verify binary-specific rules
    if (bin === "npm") {
      const firstArg = args[0]?.toLowerCase();
      if (!firstArg) return false;
      if (firstArg === "test" && args.length === 1) return true;
      if (firstArg === "run") {
        const subCmd = args[1]?.toLowerCase();
        return args.length === 2 && ["lint", "build", "test", "typecheck"].includes(subCmd);
      }
      return false;
    }

    if (bin === "npx") {
      const runner = args[0]?.toLowerCase();
      if (!runner || !this.ALLOWED_RULES.npx.has(runner)) return false;
      // Disallow arbitrary config/code execution flags on npx runners
      for (const arg of args.slice(1)) {
        if (arg === "-c" || arg === "-e" || arg === "-p" || arg === "-y" || arg === "--yes") {
          return false;
        }
      }
      return true;
    }

    if (bin === "git") {
      const sub = args[0]?.toLowerCase();
      if (!sub || !this.ALLOWED_RULES.git.has(sub)) return false;
      for (const arg of args) {
        if (arg.startsWith("-c")) {
          return false;
        }
      }
      return true;
    }

    if (bin === "node") {
      const flag = args[0]?.toLowerCase();
      return args.length === 1 && !!flag && this.ALLOWED_RULES.node.has(flag);
    }

    return false;
  }
}
