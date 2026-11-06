# AETHER System Architecture & Technical Specification

## 1. Executive Architecture Summary
AETHER is an on-premise, local-first AI Principal Engineer & UI/UX Workstation engineered for high-assurance development on production repositories. It runs a multi-turn **LangChain tool-using agent** (`@langchain/core` + `@langchain/google-genai` on `gemini-2.5-flash`) that inspects local files, searches code, runs validation checks, and stages file changes with plain-language explanations—all without writing to disk until the user explicitly confirms.

---

## 2. Architectural Layers & Separation of Concerns

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     1. Presentation Layer (Sunrise UI)                       │
│  - Sidebar (Collapsible Ctrl+B, Prism Logo, Today/Yesterday/Older History)   │
│  - WorkstationHeader (Left/Right panel toggles, Gemini badge, Review pill)   │
│  - ProjectSwitcher (Workspace path connection & live file count)             │
│  - MessageList & WorkLog (Humanized tool activity timeline & clean chat)     │
│  - ChatInput (Build / Architect / Debug / Review modes, Paste Error, Attach) │
│  - ReviewDialog (Confirm-before-save modal, NEW/EDITED badges, LCS diffs)    │
│  - Right Panel (Collapsible FileTree + StagedDiffViewer)                     │
│  - TerminalDrawer (Whitelisted command runner + 1-click Auto-Fix)            │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │ HTTP / SSE (Validated by proxy.ts)
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                        2. Local Server & Agent Bridge                        │
│  ┌──────────────────────────┐        ┌────────────────────────────────────┐  │
│  │    /api/agent (SSE)      │        │       /api/workspace (REST)        │  │
│  │  - runAgent() Loop       │        │  - FsAdapter (listTree, readFile)  │  │
│  │  - ChatGoogleGenerativeAI│        │  - PatchEngine (apply + .backup)   │  │
│  │  - RateLimiter (Sliding) │        │  - DiffCalculator (LCS alignment)  │  │
│  │  - 5 Bound Agent Tools   │        │  - PathGuard (Canonical sandbox)   │  │
│  └────────────┬─────────────┘        └─────────────────┬──────────────────┘  │
│               │                                        │                     │
│  ┌────────────▼─────────────┐        ┌─────────────────▼──────────────────┐  │
│  │  /api/conversations      │        │       /api/terminal (REST)         │  │
│  │  - ConversationStore     │        │  - CommandWhitelist                │  │
│  │  - UUID Guard & Atomic IO│        │  - TerminalRunner (win32 safe)     │  │
│  └──────────────────────────┘        └─────────────────┬──────────────────┘  │
└───────────────┼────────────────────────────────────────┼─────────────────────┘
                │                                        │
┌───────────────▼─────────────┐            ┌─────────────▼─────────────────────┐
│      Google Gemini API      │            │     Local Filesystem & Runtime    │
│     (gemini-2.5-flash)      │            │  (Target Repo + data/conversations│
└─────────────────────────────┘            └───────────────────────────────────┘
```

### Module Responsibilities:
- **`src/lib/agent`**:
  - `config.ts`: Environment-driven limits (`AETHER_MAX_STEPS`, `AETHER_RPM`, `AETHER_READ_FILE_MAX_BYTES`, etc.).
  - `rate-limiter.ts`: Process-wide sliding-window rate limiter with `AbortSignal` support.
  - `model.ts`: Instantiates `ChatGoogleGenerativeAI` with server-only `GOOGLE_API_KEY`.
  - `system-prompt.ts`: Principal Engineer & UI/UX Architect directives (multi-stack mastery, zero placeholder policy, WCAG AA/AAA palette & visual preview cards).
  - `tools/`: `list_files`, `read_file`, `search_code`, `stage_patch`, and `run_check` bound as closures over the `PathGuard`-validated project root.
  - `run-agent.ts`: Async generator streaming typed `AgentEvent` objects (`token`, `tool_start`, `tool_end`, `change`, `error`, `done`). Automatically assigns UUIDs to Gemini tool calls lacking IDs.
- **`src/lib/history`**:
  - `conversation-store.ts`: Persists conversations as individual JSON files under `data/conversations/` using atomic temp-file-and-rename writes and strict UUID validation.
- **`src/lib/security`**:
  - `path-guard.ts`: Canonical path resolution, OS root blocklist, Windows reserved device guard, and NTFS ADS protection.
  - `proxy.ts`: Local origin and `Host` header firewall preventing DNS rebinding and cross-site request forgery (`403 Forbidden`).
  - `sanitizer.ts`: Anti-jailbreak untrusted file context delimiters.
  - `secret-vault.ts`: Regex redaction for API keys, tokens, and database URIs.
- **`src/lib/workspace`**:
  - `fs-adapter.ts`: Symlink-safe directory walker and file reader.
  - `diff-calculator.ts`: Longest-Common-Subsequence (LCS) line diff calculator with prefix/suffix trimming.
  - `patch-engine.ts`: Atomic file writer with automatic `.backup` snapshot creation.

---

## 3. Data Flow & Execution Lifecycles

### Autonomous Agent & Confirm-Before-Save Flow:
1. User submits a prompt in `ChatInput` (with selected mode: `build`, `architect`, `debug`, or `review`).
2. `useChatSession` sends `POST /api/agent` with the conversation history and validated `projectRoot`.
3. `proxy.ts` verifies the request originated from `localhost` / `127.0.0.1` and `PathGuard.validateRoot` resolves the canonical workspace path.
4. `runAgent()` iterates up to `AETHER_MAX_STEPS`:
   - Acquires a slot from `RateLimiter`.
   - Streams model tokens and tool calls.
   - Executes requested tools (`list_files`, `read_file`, `search_code`, `stage_patch`, `run_check`), streaming `tool_start` and `tool_end` events to the `WorkLog` UI component.
   - Whenever `stage_patch` is called, computes an LCS diff against the current file on disk, stores the `ProposedChange` (replacing any earlier proposal for the same path), and emits a `change` event.
5. When the run completes:
   - `useConversations` saves the updated conversation record atomically to `data/conversations/<uuid>.json`.
   - If changes were proposed, `ReviewDialog` opens automatically so the user can inspect each file's `NEW`/`EDITED` badge, explanation, and unified diff.
6. When the user clicks **Save Selected Files**, `/api/workspace` (`action: "apply"`) creates a `.backup` copy of each modified file and writes the approved content to disk.
