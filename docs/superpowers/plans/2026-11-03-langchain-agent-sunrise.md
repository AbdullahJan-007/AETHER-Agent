# AETHER LangChain Agent + Sunrise Redesign: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans (Native). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the single-shot Gemini call with a LangChain tool-using agent. Add on-disk chat history, a confirm-before-save review flow and the Sunrise light UI with the Prism logo.

**Architecture:** A server-only agent loop in `src/lib/agent/` uses `@langchain/google-genai` with `bindTools` and streams typed events over SSE from `/api/agent`. Tools are closures over a root that `PathGuard` has already validated, and they never write to disk. `stage_patch` produces `ProposedChange`s that the user saves through `/api/workspace`. Conversations are stored as JSON under `data/conversations/`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, `@langchain/core` 1.x, `@langchain/google-genai` 1.x, `zod` 3.25, Tailwind v4, `lucide-react`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-02-langchain-agent-design.md`

## Global Constraints
- On-premise only. The server binds to `127.0.0.1`, and `/api/*` rejects non-local Host headers and cross-origin requests.
- No limits beyond the model's own. Every cap is set in `.env.local`, with generous defaults (user request, 2026-11-03):
  `AETHER_MAX_STEPS=40`, `AETHER_MAX_OUTPUT_TOKENS=65536`, `AETHER_RPM=10` (`0` = off, for paid keys),
  `AETHER_READ_FILE_MAX_BYTES=2000000`, `AETHER_HISTORY_CHAR_BUDGET=3000000`, `AETHER_CHECK_TIMEOUT_MS=600000`.
- No emoji in the UI. Icons come from `lucide-react`. Copy is humanized.
- Each file stays under 300 lines. `GOOGLE_API_KEY` is read only on the server.
- Nothing is written to a project without an explicit Save click.

## Review Focus
1. Gemini returns tool calls without ids → the loop assigns UUIDs before it appends the AI message.
2. A malicious page POSTs `text/plain` to `localhost:3000/api/workspace` → `proxy.ts` returns 403.
3. `stage_patch` called twice for the same path → the later proposal replaces the earlier one.
4. Stop pressed mid-tool → the abort signal is honoured, and the run ends with `done{reason:"aborted"}`.
5. Windows `npm.cmd` spawn with `shell:false` fails (EINVAL on Node ≥ 18.20) → `TerminalRunner` uses a shell on win32, with metacharacters already rejected.

## Tasks
- [x] **T1 Foundations.** Dependencies in `package.json`. `src/lib/agent/config.ts` (env-driven limits). `rate-limiter.ts`. LCS diff in `diff-calculator.ts`. `Sanitizer.wrapUntrustedContext(name, content, maxChars?)`. `TerminalRunner.execute(bin, args, cwd, timeoutMs?)` with the win32 fix. Tests: rate limiter, diff insertion counts.
- [x] **T2 Tools.** `src/lib/agent/tools/*`: `list_files`, `read_file`, `search_code`, `stage_patch`, `run_check`, each as an `AgentToolDef { name, description, schema, run(args, ctx), describe(args) }`. Tests in a temp dir: traversal refused, `.env` refused, stage never writes, same-path replacement.
- [x] **T3 Agent loop + route.** `events.ts` (types), `system-prompt.ts`, `model.ts`, `run-agent.ts` (`async function* runAgent(opts): AsyncGenerator<AgentEvent>`), `app/api/agent/route.ts`, `proxy.ts`. Test: the loop with a scripted fake model emits step_start → step_end → change → token → done.
- [x] **T4 History.** `src/lib/types/conversation.ts`, `src/lib/history/conversation-store.ts`, `app/api/conversations/route.ts`, `app/api/conversations/[id]/route.ts`. Tests: UUID validation, atomic save, list order.
- [x] **T5 UI.** Sunrise tokens in `globals.css`, Inter/JetBrains fonts, `<AetherLogo/>` plus `public/logo.svg` and `app/icon.svg`. Sidebar, chat header, message list, work log, composer, review dialog, right panel (files / changes / terminal). Hooks `use-chat-session`, `use-conversations`. New `app/page.tsx`.
- [x] **T6 Cleanup + docs.** Retire `/api/chat` and `GeminiClient`. Update `.env.example`, README and `.gitignore` (`data/`). Give the user verification commands (`npm install`, `npm test`, `npm run build`, `npm run dev`).
