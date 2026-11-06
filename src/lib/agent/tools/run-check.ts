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
