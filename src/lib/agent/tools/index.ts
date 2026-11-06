import { tool } from "@langchain/core/tools";
import type { AgentToolDef, ToolContext } from "./types";
import { listFilesTool } from "./list-files";
import { readFileTool } from "./read-file";
import { searchCodeTool } from "./search-code";
import { stagePatchTool } from "./stage-patch";
import { runCheckTool } from "./run-check";

export * from "./types";
export { listFilesTool } from "./list-files";
export { readFileTool } from "./read-file";
export { searchCodeTool } from "./search-code";
export { stagePatchTool } from "./stage-patch";
export { runCheckTool } from "./run-check";

export const allToolDefs: AgentToolDef<any>[] = [
  listFilesTool,
  readFileTool,
  searchCodeTool,
  stagePatchTool,
  runCheckTool,
];

/**
 * Creates LangChain tool instances bound to the given execution context.
 */
export function createLangChainTools(ctx: ToolContext) {
  return allToolDefs.map((def) =>
    tool(async (args: any) => def.run(args, ctx), {
      name: def.name,
      description: def.description,
      schema: def.schema,
    })
  );
}
