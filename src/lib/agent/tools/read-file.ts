import { z } from "zod";
import { FsAdapter } from "../../workspace/fs-adapter";
import { PathGuard } from "../../security/path-guard";
import { SecretVault } from "../../security/secret-vault";
import { Sanitizer } from "../../security/sanitizer";
import { getAgentConfig } from "../config";
import type { AgentToolDef, ToolContext } from "./types";

const schema = z.object({
  path: z.string().describe("Relative file path within the project to read"),
});

export const readFileTool: AgentToolDef<z.infer<typeof schema>> = {
  name: "read_file",
  description:
    "Safely read the text contents of a project file. Automatically checks permissions, strips secrets, and guards against path traversal. Access to .env, private keys, and .git files is refused.",
  schema,
  describe(args) {
    return `Read ${args.path}`;
  },
  async run(args, ctx: ToolContext) {
    if (!args.path || args.path.trim() === "") {
      return "Error: File path is required.";
    }

    if (PathGuard.isSensitivePath(args.path)) {
      return "Error: Access to .env, private key, or .git credential files is strictly prohibited for security.";
    }

    if (ctx.virtualFiles) {
      const normPath = args.path.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
      if (normPath.includes("..") || normPath.includes("\0") || normPath.startsWith("/")) {
        return "Error: Path traversal outside workspace root is strictly prohibited.";
      }
      if (PathGuard.isSensitivePath(normPath)) {
        return "Error: Access to .env, private key, or .git credential files is strictly prohibited for security.";
      }

      const rawContent =
        ctx.proposedChanges.get(normPath)?.content ?? ctx.virtualFiles[normPath];
      if (rawContent === undefined) {
        return `Error reading file: File not found: ${normPath}`;
      }

      const config = getAgentConfig();
      const scrubbed = SecretVault.redactSecrets(rawContent);
      return Sanitizer.wrapUntrustedContext(normPath, scrubbed, config.readFileMaxBytes);
    }

    const validation = PathGuard.validatePath(args.path, ctx.root);
    if (!validation.safe) {
      return `Error: ${validation.error || "Path validation failed."}`;
    }

    try {
      const rawContent = await FsAdapter.readFile(args.path, ctx.root);
      const config = getAgentConfig();

      const scrubbed = SecretVault.redactSecrets(rawContent);
      return Sanitizer.wrapUntrustedContext(args.path, scrubbed, config.readFileMaxBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Error reading file: ${msg}`;
    }
  },
};
