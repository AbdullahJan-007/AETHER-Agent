# AETHER System Architecture & Technical Specification (Hybrid v2.0)

## 1. Executive Architecture Summary
AETHER is a **Hybrid Cloud + User-System AI Principal Engineer & UI/UX Workstation** engineered for high-assurance development on production repositories. It runs a multi-turn **LangChain tool-using agent** (`@langchain/core` + `@langchain/google-genai` on `gemini-2.5-flash`) across two seamless execution engines:

1. **Vercel Cloud + User-System Hybrid Mode**:
   - Hosted globally on **Vercel Serverless** (`*.vercel.app`) with zero database or server-storage cost.
   - **User-System Chat History**: Persisted primarily on the user's browser `localStorage` (`aether:conversations:v1`), keeping chat sessions 100% private per user device while syncing with `/tmp/aether-conversations` when available.
   - **User-System Local Folder Access**: Connects directly to the user's PC directory via the File System Access API (`window.showDirectoryPicker`) or multi-file folder upload (`webkitdirectory`), loading files into a `virtualFiles` map (`src/lib/workspace/browser-fs.ts`).
   - **5 Dual-Mode LangChain Tools**: `list_files`, `read_file`, `search_code`, `stage_patch`, and `run_check` execute against `ctx.virtualFiles` in memory on Vercel Serverless, returning staged LCS diffs that write directly back to the user's local PC folder (with `.backup` creation) or export as a `.zip` archive upon confirmation.
2. **Localhost Disk Mode**:
   - Runs locally in any IDE (**VS Code, Cursor, Windsurf, WebStorm, Zed, Antigravity**) via `npm run dev`.
   - Connects directly to local paths via Node `fs/promises` (`FsAdapter`, `PatchEngine`, `TerminalRunner`) and stores conversations atomically under `data/conversations/`.

---

## 2. Architectural Layers & Separation of Concerns

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     1. Presentation Layer (Sunrise UI)                       │
│  - Sidebar (Collapsible Ctrl+B, Prism Logo, Today/Yesterday/Older History)   │
│  - WorkstationHeader (Left/Right toggles, API Key dialog, ZIP export, Review)│
│  - ProjectSwitcher (Hybrid: Open PC Folder / Upload Folder / Disk Path)      │
│  - MessageList & WorkLog (Humanized tool activity timeline & clean chat)     │
│  - ChatInput (Build / Architect / Debug / Review modes, Paste Error, Attach) │
│  - ReviewDialog (Confirm-before-save modal, NEW/EDITED badges, LCS diffs)    │
│  - Right Panel (Collapsible FileTree + StagedDiffViewer)                     │
│  - TerminalDrawer (Whitelisted command runner + 1-click Auto-Fix)            │
└───────────────────┬──────────────────────────────────────┬───────────────────┘
                    │ Browser Local Persistence            │ HTTP / SSE (proxy.ts)
┌───────────────────▼────────────────────┐ ┌───────────────▼───────────────────┐
│   2A. User-System Browser Engine       │ │   2B. Next.js / Vercel Server     │
│  - localStorage Conversation History   │ │  - /api/agent (SSE LangChain Loop)│
│  - browser-fs.ts (showDirectoryPicker, │ │  - Dual-Mode Tools (Disk & Virtual│
│    webkitdirectory, ZIP export, backup)│ │  - /api/workspace (FsAdapter)     │
│  - Optional User Gemini API Key        │ │  - /api/conversations (Disk / tmp)│
└────────────────────────────────────────┘ └───────────────┬───────────────────┘
                                                           │
                                           ┌───────────────▼───────────────────┐
                                           │         Google Gemini API         │
                                           │        (gemini-2.5-flash)         │
                                           └───────────────────────────────────┘
```

### Module Responsibilities:
- **`src/lib/agent`**:
  - `config.ts`: Environment-driven limits (`AETHER_MAX_STEPS`, `AETHER_RPM`, `AETHER_READ_FILE_MAX_BYTES`, etc.).
  - `rate-limiter.ts`: Process-wide sliding-window rate limiter with `AbortSignal` support.
  - `model.ts`: Instantiates `ChatGoogleGenerativeAI` using either the server's `GOOGLE_API_KEY` or an optional user-supplied `apiKey`.
  - `system-prompt.ts`: Principal Engineer & UI/UX Architect directives (multi-stack mastery, zero placeholder policy, WCAG AA/AAA palette & visual preview cards).
  - `tools/`: `list_files`, `read_file`, `search_code`, `stage_patch`, and `run_check` operating seamlessly in both **Disk Mode** (`ctx.root`) and **Virtual Browser Mode** (`ctx.virtualFiles`).
  - `run-agent.ts`: Async generator streaming typed `AgentEvent` objects (`token`, `tool_start`, `tool_end`, `change`, `error`, `done`).
- **`src/lib/workspace`**:
  - `browser-fs.ts`: Browser File System Access API (`showDirectoryPicker`), `<input webkitdirectory>` fallback, `.backup` writer, `.zip` exporter (`jszip` + `file-saver`), and default starter virtual project.
  - `fs-adapter.ts`: Symlink-safe Node.js directory walker and file reader.
  - `diff-calculator.ts`: Longest-Common-Subsequence (LCS) line diff calculator with prefix/suffix trimming.
  - `patch-engine.ts`: Symlink-safe atomic file writer with automatic `.backup` snapshot creation.
- **`src/lib/history`**:
  - `conversation-store.ts`: Persists conversations atomically under `data/conversations/` locally or `os.tmpdir()/aether-conversations` on Vercel Serverless (`process.env.VERCEL`).
- **`src/lib/security`**:
  - `path-guard.ts`: Canonical path resolution, OS root blocklist, Windows reserved device guard, NTFS ADS protection, and `isSensitivePath` `.env` / key / certificate guard.
  - `proxy.ts`: Hybrid Localhost + Vercel Same-Origin firewall (`403 Forbidden` on cross-site CSRF, DNS rebinding, `Origin: null`, or non-JSON `POST` payloads).
  - `sanitizer.ts`: Anti-jailbreak untrusted file context delimiters.
  - `secret-vault.ts`: Regex redaction for API keys, tokens, and database URIs.

---

## 3. Data Flow & Execution Lifecycles

### Autonomous Hybrid Agent & Confirm-Before-Save Flow:
1. User opens a local folder from their PC (via **Open PC Folder** in `ProjectSwitcher` or connects a local disk path) and submits a prompt in `ChatInput`.
2. `useChatSession` sends `POST /api/agent` with the conversation history, `projectRoot`, optional `virtualFiles` snapshot (when in Browser/Cloud mode), and optional `apiKey`.
3. `proxy.ts` verifies the request is same-origin (`localhost`, `127.0.0.1`, `[::1]`, or the active Vercel deployment host).
4. `runAgent()` iterates up to `AETHER_MAX_STEPS`:
   - Executes requested tools (`list_files`, `read_file`, `search_code`, `stage_patch`, `run_check`) against `ctx.virtualFiles` (Cloud/Browser mode) or `ctx.root` (Disk mode).
   - Streams `tool_start`, `tool_end`, and `change` events to the UI.
5. When the run completes:
   - `useConversations` saves the updated conversation record immediately to `localStorage` on the user's system and syncs with `/api/conversations`.
   - `ReviewDialog` opens automatically so the user can inspect each file's `NEW`/`EDITED` badge, explanation, and unified diff.
6. When the user clicks **Save Selected Files**, AETHER writes the approved changes directly to their local PC folder handle (or via `/api/workspace` in Disk mode) with `.backup` protection, or lets them download the patched workspace as a `.zip`.
