import { z } from "zod";
import { FsAdapter } from "../../workspace/fs-adapter";
import { PathGuard } from "../../security/path-guard";
import type { AgentToolDef, ToolContext } from "./types";

const schema = z.object({
  dir: z
    .string()
    .optional()
    .describe("Optional relative sub-directory within the workspace to list files from"),
});

export const listFilesTool: AgentToolDef<z.infer<typeof schema>> = {
  name: "list_files",
  description:
    "List files and directories within the workspace. Automatically skips ignored folders like node_modules and .git.",
  schema,
  describe(args) {
    return args.dir ? `List files in ${args.dir}` : "List project files";
  },
  async run(args, ctx: ToolContext) {
    if (ctx.virtualFiles) {
      const prefix = args.dir
        ? args.dir.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/\/+$/, "")
        : "";
      if (prefix.includes("..") || prefix.includes("\0")) {
        return "Error: Path traversal is not permitted.";
      }

      const dirs = new Set<string>();
      const lines: string[] = [];
      const sorted = Object.keys(ctx.virtualFiles).sort();

      for (const rawPath of sorted) {
        const clean = rawPath.replace(/\\/g, "/").replace(/^\.?\//, "");
        if (PathGuard.isSensitivePath(clean)) continue;
        if (prefix && !clean.startsWith(`${prefix}/`) && clean !== prefix) continue;

        const parts = clean.split("/");
        for (let i = 1; i < parts.length; i++) {
          const dirPath = parts.slice(0, i).join("/");
          if ((!prefix || dirPath.startsWith(prefix)) && !dirs.has(dirPath)) {
            dirs.add(dirPath);
            lines.push(`[DIR] ${dirPath}`);
          }
        }
        const bytes = Buffer.byteLength(ctx.virtualFiles[rawPath] ?? "", "utf-8");
        lines.push(`[FILE] ${clean} (${bytes} bytes)`);
      }

      return lines.length > 0 ? lines.slice(0, 500).join("\n") : "No files found in directory.";
    }

    let targetDir = ctx.root;
    if (args.dir && args.dir.trim() !== "") {
      const check = PathGuard.validatePath(args.dir, ctx.root);
      if (!check.safe) {
        return `Error: ${check.error || "Invalid directory path."}`;
      }
      targetDir = check.canonicalPath;
    }

    try {
      const tree = await FsAdapter.listTree(targetDir);
      if (tree.length === 0) {
        return "No files found in directory.";
      }

      const MAX_ENTRIES = 500;
      const count = tree.length;
      const subset = tree.slice(0, MAX_ENTRIES);

      const lines = subset.map((item) => {
        const typeMarker = item.type === "directory" ? "[DIR]" : "[FILE]";
        const sizeInfo = item.size !== undefined ? ` (${item.size} bytes)` : "";
        return `${typeMarker} ${item.path}${sizeInfo}`;
      });

      if (count > MAX_ENTRIES) {
        lines.push(`... [Truncated: showing ${MAX_ENTRIES} of ${count} items]`);
      }

      return lines.join("\n");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Error listing files: ${msg}`;
    }
  },
};
