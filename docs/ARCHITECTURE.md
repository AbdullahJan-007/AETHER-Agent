# AETHER System Architecture & Technical Specification

## 1. Executive Architecture Summary
AETHER is an on-premise, local-first Full-Stack AI Engineer Workstation engineered for high-assurance development on production client repositories. It utilizes Google Gemini API (free tier) through the official `@google/genai` SDK and coordinates local file inspection, staged diff reviews, and safe terminal execution without sending proprietary source code or private API keys to any third-party cloud service.

---

## 2. Architectural Layers & Separation of Concerns

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. Presentation Layer                           │
│  - WorkstationHeader (Project indicator, Gemini status)                │
│  - ProjectSwitcher (Dynamic directory selection & validation)          │
│  - MessageList (Reasoning trace, plan checklist, code staging triggers)│
│  - ChatInput (Mode switcher: Architect / Build / Debug / Review)       │
│  - FileTree (Hierarchical workspace navigator with ignore filters)     │
│  - StagedDiffViewer (Color-coded unified diff review & .backup writer) │
│  - TerminalDrawer (Safe child-process runner for npm and git)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / SSE
┌───────────────────────────────────▼────────────────────────────────────┐
│                        2. Local Server Bridge                          │
│  ┌───────────────────────┐       ┌──────────────────────────────────┐  │
│  │   /api/chat (SSE)     │       │     /api/workspace (REST)        │  │
│  │  - PromptBuilder      │       │  - FsAdapter (listTree, readFile)│  │
│  │  - GeminiClient       │       │  - PatchEngine (stage, apply)    │  │
│  │  - 15 RPM Rate Limiter│       │  - PathGuard (Canonical resolve) │  │
│  └───────────┬───────────┘       └──────────────────┬───────────────┘  │
│              │                                      │                  │
│  ┌───────────▼───────────┐                          │                  │
│  │  /api/terminal (REST) │                          │                  │
│  │  - CommandWhitelist   │                          │                  │
│  │  - TerminalRunner     │                          │                  │
│  └───────────┬───────────┘                          │                  │
└──────────────┼──────────────────────────────────────┼──────────────────┘
               │                                      │
┌──────────────▼───────────┐              ┌───────────▼──────────────────┐
│   Google Gemini API      │              │  Local Filesystem & Runtime  │
│   (Free Tier Flash 2.5)  │              │  (Target Client Repository)  │
└──────────────────────────┘              └──────────────────────────────┘
```

### Module Responsibilities:
- **`src/lib/security`**: Zero-trust enforcement. Path canonicalization, shell character sanitization, anti-jailbreak wrappers, and regex-based credential scrubbers.
- **`src/lib/workspace`**: Local filesystem abstraction. Recursive tree listing with standard ignore filters (`node_modules`, `.git`, `.next`, `dist`), atomic file patching, and automatic `.backup` timestamped snapshots.
- **`src/lib/terminal`**: Sandboxed child-process runner. Strictly validates binary executables (`npm`, `npx`, `git`, `node`) against approved subcommands with a 30-second hard kill timer.
- **`src/lib/gemini`**: Integration layer for `@google/genai`. Formats full-stack specialized system prompts and streams structured `<thinking>`, `<plan>`, and code tags.
- **`src/components/ui`**: Atomic UI primitives adhering to the Figma & Mobbin Obsidian Dark design system.

---

## 3. Data Flow & Execution Lifecycles

### Code Generation & Staged Patch Flow:
1. User provides a prompt or attached error log in `ChatInput`.
2. `app/api/chat/route.ts` injects local project context files wrapped with `Sanitizer.wrapUntrustedContext`.
3. `GeminiClient` streams the response using Server-Sent Events (SSE).
4. `StreamParser` isolates cognitive reasoning (`<thinking>`), plan checklists (`<plan>`), and complete tagged files (` ```lang:path `).
5. User clicks **"Stage in Diff"** on generated code files.
6. `StagedDiffViewer` visually highlights additions and deletions.
7. Upon clicking **"Apply to Disk"**, `PatchEngine.applyPatch`:
   - Validates the target path via `PathGuard`.
   - Generates an immediate `.backup` snapshot.
   - Writes the new content to disk.
   - Refreshes the active `FileTree`.

### Safe Terminal Execution Flow:
1. User clicks `npm test`, `lint`, or `git status` in `TerminalDrawer`.
2. `/api/terminal` validates binary and arguments via `CommandWhitelist`.
3. `TerminalRunner` spawns process with `shell: false` and a 30-second timeout.
4. Outputs are scrubbed of any potential API keys by `SecretVault` and displayed in the terminal console.
5. If errors occur, clicking **"Auto-Fix with AETHER"** passes the stack trace directly into the agent for automated debugging.
