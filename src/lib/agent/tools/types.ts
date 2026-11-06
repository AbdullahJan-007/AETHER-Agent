import type { z } from "zod";
import type { StagedDiff } from "../../workspace/diff-calculator";

export interface ProposedChange {
  path: string;
  isNew: boolean;
  reason: string;
  diff: StagedDiff;
  content: string;
}

export interface ToolContext {
  root: string;
  signal?: AbortSignal;
  proposedChanges: Map<string, ProposedChange>;
  onProposedChange?: (change: ProposedChange) => void;
}

export interface AgentToolDef<TArgs = any> {
  name: string;
  description: string;
  schema: z.ZodType<TArgs>;
  run: (args: TArgs, ctx: ToolContext) => Promise<string>;
  describe: (args: TArgs) => string;
}
