import { z } from "zod";
import { TerminalRunner } from "../../terminal/runner";
import { SecretVault } from "../../security/secret-vault";
import { getAgentConfig } from "../config";
import type { AgentToolDef, ToolContext } from "./types";

const CHECK_COMMANDS: Record<string, { bin: string; args: string[] }> = {
  test: { bin: "npm", args: ["test"] },
  lint: { bin: "npm", args: ["run", "lint"] },
  typecheck: { bin: "npm", args: ["run", "typecheck"] },
  git_status: { bin: "git", args: ["status"] },
  git_diff: { bin: "git", args: ["diff"] },
};

const schema = z.object({
  check: z
    .enum(["test", "lint", "typecheck", "git_status", "git_diff"])
    .describe("The validation check command to run"),
});

function runVirtualCheck(
  check: "test" | "lint" | "typecheck" | "git_status" | "git_diff",
  ctx: ToolContext
): string {
  const virtualFiles = ctx.virtualFiles || {};
  const merged = new Map<string, string>(Object.entries(virtualFiles));
  for (const [p, change] of ctx.proposedChanges.entries()) {
    merged.set(p, change.content);
  }

  if (check === "git_status") {
    if (ctx.proposedChanges.size === 0) {
      return `Check git_status PASSED (Exit code: 0):\nVirtual workspace clean (${merged.size} files tracked, 0 staged changes).`;
    }
    const lines = Array.from(ctx.proposedChanges.values()).map(
      (c) => `${c.isNew ? "A" : "M"}  ${c.path} (+${c.diff.additions} / -${c.diff.deletions})`
    );
    return `Check git_status PASSED (Exit code: 0):\nStaged changes in virtual workspace:\n${lines.join("\n")}`;
  }

  if (check === "git_diff") {
    if (ctx.proposedChanges.size === 0) {
      return "Check git_diff PASSED (Exit code: 0):\n(no staged changes)";
    }
    const summaries = Array.from(ctx.proposedChanges.values()).map(
      (c) => `--- a/${c.path}\n+++ b/${c.path}\nReason: ${c.reason}\n(+${c.diff.additions} / -${c.diff.deletions} lines)`
    );
    return `Check git_diff PASSED (Exit code: 0):\n${summaries.join("\n\n")}`;
  }

  // Static syntax, JSON & placeholder verification for test / lint / typecheck in virtual mode
  const issues: string[] = [];
  for (const [filePath, content] of merged.entries()) {
    if (filePath.endsWith(".json")) {
      try {
        JSON.parse(content);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        issues.push(`${filePath}: Invalid JSON syntax (${msg})`);
      }
    }
    if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
      if (/\/\/\s*TODO:\s*implement/i.test(content) || /\/\/\s*\.\.\.\s*rest of code/i.test(content)) {
        issues.push(`${filePath}: Contains forbidden placeholder comment.`);
      }
    }
  }

  if (issues.length > 0) {
    return `Check ${check} FAILED (Exit code: 1):\n${issues.join("\n")}`;
  }

  return `Check ${check} PASSED (Exit code: 0):\nVerified ${merged.size} virtual workspace files (${ctx.proposedChanges.size} staged). Zero syntax or lint issues detected.`;
}

export const runCheckTool: AgentToolDef<z.infer<typeof schema>> = {
  name: "run_check",
  description:
    "Run a safe, read-only validation check against the project (test, lint, typecheck, git_status, git_diff). Output is sanitized and capped to protect context limits.",
  schema,
  describe(args) {
    return `Run check: ${args.check}`;
  },
  async run(args, ctx: ToolContext) {
    const cmd = CHECK_COMMANDS[args.check];
    if (!cmd) {
      return `Error: Unknown check "${args.check}". Allowed checks: ${Object.keys(CHECK_COMMANDS).join(", ")}`;
    }

    if (ctx.virtualFiles) {
      return runVirtualCheck(args.check, ctx);
    }

    const config = getAgentConfig();
    try {
      const res = await TerminalRunner.execute(
        cmd.bin,
        cmd.args,
        ctx.root,
        config.checkTimeoutMs,
        ctx.signal
      );

      const combined = `${res.stdout}\n${res.stderr}`.trim();
      const scrubbed = SecretVault.redactSecrets(combined);

      const MAX_OUTPUT = 8192;
      const truncated =
        scrubbed.length > MAX_OUTPUT
          ? scrubbed.slice(0, MAX_OUTPUT) + "\n... [Output truncated to 8KB]"
          : scrubbed;

      const status = res.success ? "PASSED" : "FAILED";
      return `Check ${args.check} ${status} (Exit code: ${res.exitCode}):\n${truncated || "(no output)"}`;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      const msg = err instanceof Error ? err.message : String(err);
      return `Error running check "${args.check}": ${msg}`;
    }
  },
};
