export class CommandWhitelist {
  // Disallow shell operators, command substitutions, Windows variable expansions, and caret escaping
  private static readonly DANGEROUS_CHARS = /[;&|<>`$\r\n%^\0]/;

  private static readonly ALLOWED_RULES: Record<string, Set<string>> = {
    npm: new Set(["test", "run", "lint", "build", "typecheck"]),
    npx: new Set(["vitest", "eslint", "tsc", "next"]),
    git: new Set(["status", "diff", "log", "branch", "rev-parse"]),
    node: new Set(["--version", "-v"]),
  };

  /**
   * Validates whether binary and argument list meet strict security criteria.
   */
  public static isAllowed(binary: string, args: string[]): boolean {
    const bin = binary.toLowerCase().trim();

    if (!this.ALLOWED_RULES[bin]) {
      return false;
    }

    // Check for any dangerous shell metacharacters in any argument
    for (const arg of args) {
      if (this.DANGEROUS_CHARS.test(arg)) {
        return false;
      }
    }

    // Verify binary-specific rules
    if (bin === "npm") {
      const firstArg = args[0]?.toLowerCase();
      if (!firstArg) return false;
      if (firstArg === "test") return true;
      if (firstArg === "run") {
        const subCmd = args[1]?.toLowerCase();
        return ["lint", "build", "test", "typecheck"].includes(subCmd);
      }
      return false;
    }

    if (bin === "npx") {
      const runner = args[0]?.toLowerCase();
      return !!runner && this.ALLOWED_RULES.npx.has(runner);
    }

    if (bin === "git") {
      const sub = args[0]?.toLowerCase();
      if (!sub || !this.ALLOWED_RULES.git.has(sub)) return false;
      // Block git flags that could execute external hooks or scripts
      for (const arg of args) {
        if (arg.startsWith("--upload-pack") || arg.startsWith("--exec-path") || arg.startsWith("-c")) {
          return false;
        }
      }
      return true;
    }

    if (bin === "node") {
      const flag = args[0]?.toLowerCase();
      return !!flag && this.ALLOWED_RULES.node.has(flag);
    }

    return false;
  }
}
