import { z } from "zod";
import path from "path";
import fs from "fs";
import { PathGuard } from "../../security/path-guard";
import { DiffCalculator } from "../../workspace/diff-calculator";
import { getAgentConfig } from "../config";
import type { AgentToolDef, ProposedChange, ToolContext } from "./types";

const schema = z.object({
  path: z.string().describe("Relative project file path to create or modify"),
  content: z.string().describe("The full replacement contents for the file"),
  reason: z
    .string()
    .describe("One or two sentences explaining why this file is being created or modified"),
});

export const stagePatchTool: AgentToolDef<z.infer<typeof schema>> = {
  name: "stage_patch",
  description:
    "Propose a new file or modification to an existing file. This stages the change for user review and diff inspection without writing anything to disk. Nothing is saved until the user explicitly confirms.",
  schema,
  describe(args) {
    return `Propose changes to ${args.path}: ${args.reason}`;
  },
  async run(args, ctx: ToolContext) {
    if (!args.path || args.path.trim() === "") {
      return "Error: File path is required.";
    }

    const baseName = path.basename(args.path);
    if (/^\.env($|\..*)/i.test(baseName)) {
      return "Error: Creating or modifying .env files is strictly prohibited for security.";
    }

    const validation = PathGuard.validatePath(args.path, ctx.root);
    if (!validation.safe) {
      return `Error: ${validation.error || "Path validation failed."}`;
    }

    const config = getAgentConfig();
    const relPath = path
      .relative(ctx.root, validation.canonicalPath)
      .replace(/\\/g, "/");

    if (
      !ctx.proposedChanges.has(relPath) &&
      ctx.proposedChanges.size >= config.maxProposals
    ) {
      return `Error: Proposal limit of ${config.maxProposals} files reached for this request.`;
    }

    let original = "";
    let isNew = true;

    if (fs.existsSync(validation.canonicalPath)) {
      try {
        original = fs.readFileSync(validation.canonicalPath, "utf-8");
        isNew = false;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return `Error reading existing file to stage diff: ${msg}`;
      }
    }

    const diff = DiffCalculator.calculateDiff(relPath, original, args.content);

    const proposed: ProposedChange = {
      path: relPath,
      isNew,
      reason: args.reason,
      diff,
      content: args.content,
    };

    // Storing in map ensures that calling stage_patch twice for the same path
    // replaces the earlier proposal with the later one.
    ctx.proposedChanges.set(relPath, proposed);
    ctx.onProposedChange?.(proposed);

    return `Staged changes for "${relPath}" (+${diff.additions} / -${diff.deletions}). The file has NOT been written to disk; the user will review and save it explicitly.`;
  },
};
