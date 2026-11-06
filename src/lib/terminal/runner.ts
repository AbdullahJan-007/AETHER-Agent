import { spawn } from "child_process";
import { CommandWhitelist } from "./command-whitelist";
import { PathGuard } from "../security/path-guard";

export interface TerminalResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class TerminalRunner {
  private static readonly TIMEOUT_MS = 30_000;
  private static readonly MAX_OUTPUT_CHARS = 500_000; // 500KB cap to prevent buffer explosion

  /**
   * Cleanses environment variables to prevent leaking server-side API keys to child processes.
   */
  private static getCleanEnv(): NodeJS.ProcessEnv {
    const blockedKeys = new Set([
      "GOOGLE_API_KEY",
      "GEMINI_API_KEY",
      "OPENAI_API_KEY",
      "ANTHROPIC_API_KEY",
      "GROQ_API_KEY",
      "AWS_SECRET_ACCESS_KEY",
      "GITHUB_TOKEN",
      "GH_TOKEN",
    ]);

    const clean: Record<string, string | undefined> = { CI: "true" };

    for (const [key, value] of Object.entries(process.env)) {
      if (!blockedKeys.has(key)) {
        clean[key] = value;
      }
    }

    return clean as NodeJS.ProcessEnv;
  }

  /**
   * Executes a safe, whitelisted command inside the designated working directory.
   * @param timeoutMs Optional override; agent checks (full test suites, builds) pass a longer budget.
   * @param signal Optional abort signal; aborting kills the whole process tree.
   */
  public static async execute(
    binary: string,
    args: string[],
    cwd: string,
    timeoutMs: number = TerminalRunner.TIMEOUT_MS,
    signal?: AbortSignal
  ): Promise<TerminalResult> {
    if (!CommandWhitelist.isAllowed(binary, args)) {
      return {
        success: false,
        stdout: "",
        stderr: `Command not permitted by AETHER security policy: "${binary} ${args.join(" ")}"`,
        exitCode: 1,
      };
    }

    const pathCheck = PathGuard.validateRoot(cwd);
    if (!pathCheck.safe) {
      return {
        success: false,
        stdout: "",
        stderr: `Working directory validation failed: ${pathCheck.error}`,
        exitCode: 1,
      };
    }

    // Windows resolves npm/npx as .cmd batch files. Since Node 18.20 / 20.12
    // (CVE-2024-27980) spawning a .cmd with shell:false throws EINVAL, so those
    // run through cmd.exe. That is safe here because CommandWhitelist has already
    // rejected every shell metacharacter, quote and expansion sequence.
    const isWinBatch = process.platform === "win32" && (binary === "npm" || binary === "npx");
    const executable = isWinBatch ? `${binary}.cmd` : binary;

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let exited = false;

      const child = spawn(executable, args, {
        cwd: pathCheck.canonicalPath,
        shell: isWinBatch,
        windowsHide: true,
        env: this.getCleanEnv(),
      });

      const killTree = () => {
        try {
          if (process.platform === "win32" && child.pid) {
            // On Windows, taskkill kills the entire process tree including cmd wrappers
            spawn("taskkill", ["/pid", child.pid.toString(), "/T", "/F"], { windowsHide: true });
          } else {
            child.kill("SIGKILL");
          }
        } catch {
          // Ignore kill errors
        }
      };

      const onAbort = () => {
        if (exited) return;
        exited = true;
        clearTimeout(timer);
        killTree();
        resolve({ success: false, stdout, stderr: `${stderr}\n[Cancelled by user]`, exitCode: 130 });
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      const timer = setTimeout(() => {
        if (!exited) {
          exited = true;
          signal?.removeEventListener("abort", onAbort);
          killTree();
          stderr += `\n[AETHER Execution timeout: command exceeded ${Math.round(timeoutMs / 1000)} seconds]`;
          resolve({
            success: false,
            stdout,
            stderr,
            exitCode: 124, // Standard timeout exit code
          });
        }
      }, timeoutMs);

      child.stdout?.on("data", (data) => {
        if (stdout.length < this.MAX_OUTPUT_CHARS) {
          stdout += data.toString();
        } else if (!stdout.endsWith("[OUTPUT TRUNCATED DUE TO SIZE LIMIT]\n")) {
          stdout += "\n[OUTPUT TRUNCATED DUE TO SIZE LIMIT]\n";
        }
      });

      child.stderr?.on("data", (data) => {
        if (stderr.length < this.MAX_OUTPUT_CHARS) {
          stderr += data.toString();
        } else if (!stderr.endsWith("[OUTPUT TRUNCATED DUE TO SIZE LIMIT]\n")) {
          stderr += "\n[OUTPUT TRUNCATED DUE TO SIZE LIMIT]\n";
        }
      });

      child.on("close", (code) => {
        if (!exited) {
          exited = true;
          clearTimeout(timer);
          resolve({
            success: code === 0,
            stdout,
            stderr,
            exitCode: code ?? 1,
          });
        }
      });

      child.on("error", (err) => {
        if (!exited) {
          exited = true;
          clearTimeout(timer);
          resolve({
            success: false,
            stdout,
            stderr: `${stderr}\n${err.message}`,
            exitCode: 1,
          });
        }
      });
    });
  }
}
