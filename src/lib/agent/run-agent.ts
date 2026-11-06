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
  isRetryableModelError,
  throttleModelRequest,
} from "./model";
import { allToolDefs, createLangChainTools } from "./tools";
import type { ProposedChange, ToolContext } from "./tools/types";

const FIRST_CHUNK_TIMEOUT_MS = 12_000;

async function nextWithTimeout<T>(
  iterator: AsyncIterator<T>,
  timeoutMs: number
): Promise<IteratorResult<T>> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      iterator.next(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("TTFT_TIMEOUT: Model took too long to respond (503 high demand)")),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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

  let systemPrompt = buildAgentSystemPrompt(opts.mode, opts.attachedFiles);
  if (opts.virtualFiles) {
    const fileKeys = Object.keys(opts.virtualFiles).slice(0, 80);
    if (fileKeys.length > 0) {
      systemPrompt += `\n\n## WORKSPACE FILES ALREADY INDEXED (${fileKeys.length} files)\n${fileKeys
        .map((f) => `- ${f}`)
        .join("\n")}\nYou already have the file list above—do not call list_files unless you need to inspect a specific subdirectory. For simple greetings or conceptual questions, reply directly without calling tools.`;
    }
  }

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

  /**
   * Opens the model stream AND pulls the first chunk inside the try/catch block.
   * Because @langchain/google-genai only performs the HTTP fetch on the first
   * iterator.next() call, pulling the first chunk here guarantees that 503 High Demand,
   * 404 Not Found, 429 Rate Limit, or slow TTFT errors are caught and failed over
   * transparently to healthy models (gemini-3.5-flash-lite -> gemini-3.1-flash-lite).
   */
  async function openVerifiedStream(): Promise<AsyncIterable<any>> {
    if (injectedModel) {
      return await model.stream(conversationMessages, { signal: opts.signal });
    }

    const candidates = [
      activeModelId,
      ...buildModelFailoverList(activeModelId),
    ];

    let lastErr: unknown = null;

    for (const candidateModelId of candidates) {
      if (opts.signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      try {
        const candidateBase = createAgentModel(opts.apiKey, candidateModelId);
        const candidateBound = candidateBase.bindTools
          ? candidateBase.bindTools(tools)
          : candidateBase;

        const rawStream = await candidateBound.stream(conversationMessages, {
          signal: opts.signal,
        });
        const iterator = rawStream[Symbol.asyncIterator]();

        // Pull first chunk to trigger actual HTTP fetch & verify 200 OK status
        const firstResult = await nextWithTimeout(iterator, FIRST_CHUNK_TIMEOUT_MS);

        activeModelId = candidateModelId;
        model = candidateBound;

        return {
          async *[Symbol.asyncIterator]() {
            if (!firstResult.done) {
              yield firstResult.value;
            }
            while (true) {
              const next = await iterator.next();
              if (next.done) break;
              yield next.value;
            }
          },
        };
      } catch (err: unknown) {
        lastErr = err;
        if (!isRetryableModelError(err)) {
          throw err;
        }
        // Otherwise immediately try next candidate model in list
      }
    }

    throw lastErr || new Error("All Gemini models are currently unavailable.");
  }

  try {
    for (let step = 0; step < config.maxSteps; step++) {
      if (opts.signal?.aborted) {
        yield { type: "done", reason: "aborted" };
        return;
      }

      await throttleModelRequest(opts.signal);

      let fullChunk: AIMessageChunk | null = null;
      const stream = await openVerifiedStream();

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
