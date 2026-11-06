import { z } from "zod";
import path from "path";
import { FsAdapter } from "../../workspace/fs-adapter";
import { PathGuard } from "../../security/path-guard";
import { SecretVault } from "../../security/secret-vault";
import { getAgentConfig } from "../config";
import type { AgentToolDef, ToolContext } from "./types";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".7z", ".rar",
  ".pdf", ".exe", ".dll", ".so", ".dylib",
  ".wasm", ".lock",
]);

const schema = z.object({
  query: z.string().describe("Case-insensitive text string to search for across project files"),
  glob: z.string().optional().describe("Optional extension or pattern filter (e.g. '.tsx' or 'src/')"),
});

export const searchCodeTool: AgentToolDef<z.infer<typeof schema>> = {
  name: "search_code",
  description:
    "Search for text or patterns across project files. Returns matching lines with file paths and line numbers.",
  schema,
  describe(args) {
    return `Search codebase for "${args.query}"`;
  },
  async run(args, ctx: ToolContext) {
    if (!args.query || args.query.trim() === "") {
      return "Error: Search query is required.";
    }

    const config = getAgentConfig();
    const maxMatches = config.searchMaxMatches;
    const lowerQuery = args.query.toLowerCase();

    try {
      const tree = await FsAdapter.listTree(ctx.root);
      const matches: string[] = [];

      for (const item of tree) {
        if (ctx.signal?.aborted) {
          throw new DOMException("The operation was aborted.", "AbortError");
        }

        if (item.type !== "file") continue;

        if (PathGuard.isSensitivePath(item.path)) continue;

        const ext = path.extname(item.path).toLowerCase();
        if (BINARY_EXTENSIONS.has(ext)) continue;

        if (args.glob && !item.path.toLowerCase().includes(args.glob.toLowerCase())) {
          continue;
        }

        let content: string;
        try {
          content = await FsAdapter.readFile(item.path, ctx.root);
        } catch {
          continue;
        }

        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes(lowerQuery)) {
            const truncatedLine =
              line.length > 200 ? line.slice(0, 200) + "..." : line;
            matches.push(
              `${item.path}:${i + 1}: ${SecretVault.redactSecrets(truncatedLine.trim())}`
            );
            if (matches.length >= maxMatches) {
              matches.push(`... [Truncated: reached limit of ${maxMatches} matches]`);
              return matches.join("\n");
            }
          }
        }
      }

      if (matches.length === 0) {
        return `No matches found for query: "${args.query}"`;
      }

      return matches.join("\n");
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      const msg = err instanceof Error ? err.message : String(err);
      return `Error searching code: ${msg}`;
    }
  },
};
