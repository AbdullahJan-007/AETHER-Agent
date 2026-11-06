import { describe, it, expect } from "vitest";
import path from "path";
import { AIMessageChunk } from "@langchain/core/messages";
import { runAgent } from "../run-agent";
import { resolveActiveModel } from "../config";
import {
  buildModelFailoverList,
  extractSuggestedModel,
  isRetryableModelError,
} from "../model";
import type { AgentEvent } from "../events";

describe("Agent Loop - runAgent & Self-Healing 503/404 Model Failover", () => {
  const testRoot = path.resolve("./");

  it("executes tool calls, generates UUIDs for calls lacking them, yields events and finishes", async () => {
    let callCount = 0;

    const fakeModel = {
      bindTools() {
        return this;
      },
      async *stream() {
        callCount++;
        if (callCount === 1) {
          const chunk = new AIMessageChunk({
            content: "",
            tool_call_chunks: [],
          });
          (chunk as any).tool_calls = [
            {
              name: "stage_patch",
              args: {
                path: "test-generated.ts",
                content: "export const answer = 42;",
                reason: "Generate solution constant",
              },
              id: "",
            },
          ];
          yield chunk;
        } else {
          yield new AIMessageChunk("All changes have been successfully proposed.");
        }
      },
    };

    const events: AgentEvent[] = [];
    for await (const event of runAgent(
      {
        root: testRoot,
        mode: "build",
        messages: [{ role: "user", content: "Create the answer constant" }],
      },
      fakeModel
    )) {
      events.push(event);
    }

    const types = events.map((e) => e.type);
    expect(types).toContain("tool_start");
    expect(types).toContain("change");
    expect(types).toContain("tool_end");
    expect(types).toContain("token");
    expect(types).toContain("done");

    const toolStart = events.find((e) => e.type === "tool_start") as any;
    expect(toolStart).toBeDefined();
    expect(toolStart.id).toBeTruthy();
    expect(toolStart.id.length).toBeGreaterThan(10);

    const changeEvent = events.find((e) => e.type === "change") as any;
    expect(changeEvent).toBeDefined();
    expect(changeEvent.change.path).toBe("test-generated.ts");

    const doneEvent = events.find((e) => e.type === "done") as any;
    expect(doneEvent.reason).toBe("completed");
  });

  it("handles abort signal properly and stops execution", async () => {
    const controller = new AbortController();
    controller.abort();

    const events: AgentEvent[] = [];
    for await (const event of runAgent({
      root: testRoot,
      mode: "build",
      messages: [{ role: "user", content: "Hello" }],
      signal: controller.signal,
    })) {
      events.push(event);
    }

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: "done", reason: "aborted" });
  });

  it("defaults to ultra-fast gemini-3.5-flash-lite and catches both 404 and 503 High Demand errors", () => {
    expect(resolveActiveModel(undefined)).toBe("gemini-3.5-flash-lite");
    expect(resolveActiveModel("gemini-2.5-flash")).toBe("gemini-3.5-flash-lite");
    expect(resolveActiveModel("models/gemini-2.0-flash")).toBe("gemini-3.5-flash-lite");

    const google404Error = new Error(
      "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse: [404 ] This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements."
    );
    const google503Error = new Error(
      "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse: [503 ] This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."
    );

    expect(isRetryableModelError(google404Error)).toBe(true);
    expect(isRetryableModelError(google503Error)).toBe(true);
    expect(extractSuggestedModel(google404Error)).toBe("gemini-3.8-flash");

    const failover = buildModelFailoverList("gemini-3.8-flash", google503Error);
    expect(failover[0]).toBe("gemini-3.5-flash-lite");
    expect(failover).toContain("gemini-3.1-flash-lite");
  });
});
