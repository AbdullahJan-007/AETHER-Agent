import { z } from "zod";
import path from "path";
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
