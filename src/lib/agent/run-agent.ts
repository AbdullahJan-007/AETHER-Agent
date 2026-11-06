import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { AgentEvent, AgentRunOptions } from "./events";
import { getAgentConfig } from "./config";
import { buildAgentSystemPrompt } from "./system-prompt";
import {
  buildModelFailoverList,
  createAgentModel,
  discoverAvailableModels,
  isModelNotFoundError,
  throttleModelRequest,
} from "./model";
import { allToolDefs, createLangChainTools } from "./tools";
import type { ProposedChange, ToolContext } from "./tools/types";

export async function* runAgent(
  opts: AgentRunOptions,
  injectedModel?: any
): AsyncGenerator<AgentEvent, void, unknown> {
  const config = getAgentConfig();

  if (opts.signal?.aborted) {
    yield { type: "done", reason: "aborted" };
    return;
  }

  const queuedEvents: AgentEvent[] = [];
  const proposedChanges = new Map<string, ProposedChange>();

  const ctx: ToolContext = {
    root: opts.root,
    virtualFiles: opts.virtualFiles,
    signal: opts.signal,
    proposedChanges,
    onProposedChange: (change) => {
      queuedEvents.push({ type: "change", change });
    },
  };

  const tools = createLangChainTools(ctx);
  const toolDefsByName = new Map(allToolDefs.map((t) => [t.name, t]));

  let activeModelId = config.model;
  let model: any;
  try {
    const baseModel = injectedModel || createAgentModel(opts.apiKey, activeModelId);
    model = baseModel.bindTools ? baseModel.bindTools(tools) : baseModel;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    yield { type: "error", message: msg };
    yield { type: "done", reason: "error" };
    return;
  }

  const systemPrompt = buildAgentSystemPrompt(opts.mode, opts.attachedFiles);
  const conversationMessages: BaseMessage[] = [new SystemMessage(systemPrompt)];

  const rawHistory = opts.messages || [];
  let budget = config.historyCharBudget;
  const historyToInclude: Array<{ role: string; content: string }> = [];

  for (let i = rawHistory.length - 1; i >= 0; i--) {
    const msg = rawHistory[i];
    const len = msg.content ? msg.content.length : 0;
    if (budget - len < 0 && historyToInclude.length > 0) break;
    historyToInclude.unshift(msg);
    budget -= len;
  }

  for (const m of historyToInclude) {
    if (m.role === "user") {
      conversationMessages.push(new HumanMessage(m.content));
    } else if (m.role === "assistant") {
      conversationMessages.push(new AIMessage(m.content));
    } else if (m.role === "system") {
      conversationMessages.push(new SystemMessage(m.content));
    }
  }

  async function openStreamWithFailover(): Promise<AsyncIterable<any>> {
    try {
      return await model.stream(conversationMessages, { signal: opts.signal });
    } catch (primaryErr: unknown) {
      if (injectedModel || !isModelNotFoundError(primaryErr)) {
        throw primaryErr;
      }

      // Self-healing Staff Engineer failover: extract Google's recommended model + query available models
      const discovered = await discoverAvailableModels(opts.apiKey);
      const failoverCandidates = buildModelFailoverList(
        activeModelId,
        primaryErr,
        discovered
      );

      let lastErr: unknown = primaryErr;
      for (const candidateModelId of failoverCandidates) {
        if (opts.signal?.aborted) throw primaryErr;
        try {
          const fallbackBase = createAgentModel(opts.apiKey, candidateModelId);
          const candidateBound = fallbackBase.bindTools
            ? fallbackBase.bindTools(tools)
            : fallbackBase;
          const stream = await candidateBound.stream(conversationMessages, {
            signal: opts.signal,
          });
          activeModelId = candidateModelId;
          model = candidateBound;
          return stream;
        } catch (retryErr: unknown) {
          lastErr = retryErr;
          if (!isModelNotFoundError(retryErr)) {
            throw retryErr;
          }
        }
      }
      throw lastErr;
    }
  }

  try {
    for (let step = 0; step < config.maxSteps; step++) {
      if (opts.signal?.aborted) {
        yield { type: "done", reason: "aborted" };
        return;
      }

      await throttleModelRequest(opts.signal);

      let fullChunk: AIMessageChunk | null = null;
      const stream = await openStreamWithFailover();

      for await (const chunk of stream) {
        if (opts.signal?.aborted) {
          yield { type: "done", reason: "aborted" };
          return;
        }

        fullChunk = fullChunk ? fullChunk.concat(chunk) : chunk;

        if (typeof chunk.content === "string" && chunk.content.length > 0) {
          yield { type: "token", text: chunk.content };
        } else if (Array.isArray(chunk.content)) {
          for (const part of chunk.content) {
            if (typeof part === "string" && part.length > 0) {
              yield { type: "token", text: part };
            } else if (part && typeof part === "object" && "text" in part) {
              yield { type: "token", text: (part as any).text };
            }
          }
        }
      }

      const aiResponse = fullChunk ?? new AIMessageChunk("");
      const rawCalls = (aiResponse as any).tool_calls || [];

      if (!rawCalls || rawCalls.length === 0) {
        while (queuedEvents.length > 0) {
          yield queuedEvents.shift()!;
        }
        yield { type: "done", reason: "completed" };
        return;
      }

      for (const call of rawCalls) {
        if (!call.id || call.id.trim() === "") {
          call.id = crypto.randomUUID();
        }
      }

      conversationMessages.push(aiResponse);

      for (const call of rawCalls) {
        if (opts.signal?.aborted) {
          yield { type: "done", reason: "aborted" };
          return;
        }

        const toolDef = toolDefsByName.get(call.name);
        const summary = toolDef ? toolDef.describe(call.args) : `Run ${call.name}`;

        yield {
          type: "tool_start",
          id: call.id,
          name: call.name,
          input: call.args,
          summary,
        };

        let ok = true;
        let output = "";
        try {
          if (toolDef) {
            output = await toolDef.run(call.args, ctx);
          } else {
            ok = false;
            output = `Error: Tool "${call.name}" is not recognized.`;
          }
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === "AbortError") {
            yield { type: "done", reason: "aborted" };
            return;
          }
          ok = false;
          output = `Error: ${err instanceof Error ? err.message : String(err)}`;
        }

        while (queuedEvents.length > 0) {
          yield queuedEvents.shift()!;
        }

        yield {
          type: "tool_end",
          id: call.id,
          name: call.name,
          ok,
          summary,
          output,
        };

        conversationMessages.push(
          new ToolMessage({
            content: output,
            tool_call_id: call.id,
            name: call.name,
          })
        );
      }
    }

    while (queuedEvents.length > 0) {
      yield queuedEvents.shift()!;
    }
    yield { type: "done", reason: "max_steps" };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      yield { type: "done", reason: "aborted" };
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    yield { type: "error", message: msg };
    yield { type: "done", reason: "error" };
  }
}
