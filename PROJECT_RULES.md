# AETHER — Master Engineering & Security Rules (Staff Standard)

> **MANDATORY COMPLIANCE**: Every contributor and AI agent operating on this repository must strictly enforce all rules defined in this document. Zero exceptions, zero shortcuts, zero placeholder code.

---

## 1. Cross-IDE & Cross-System Portability Rules (Universal Compatibility)

1. **Unified Path Alias (`@/*` → `./src/*` Only)**:
   - Both `tsconfig.json` and `vitest.config.ts` map `@/*` strictly to `./src/*`.
   - **FORBIDDEN**: Never write `@/src/...` in any import statement. Always write `@/lib/...`, `@/components/...`, `@/hooks/...`, `@/store/...`.
   - This guarantees 100% compatibility across **VS Code, Cursor, Windsurf, WebStorm, Zed, and Antigravity** TypeScript language servers without red squiggly lines.
2. **Strict Client/Server Boundary Isolation**:
   - **FORBIDDEN in `"use client"` files**: Never call `process.cwd()`, `fs`, `child_process`, or Node-only APIs inside React client components or hooks.
   - All path normalization on the client must use pure POSIX forward-slash strings (`path.replace(/\\/g, "/")`).
3. **Hybrid Cloud + Local Execution Support**:
   - Every workspace feature and agent tool must work identically in:
     1. **Browser Local Folder Mode (Vercel Hosted + User PC)**: Operating on `virtualFiles` synced from the user's local folder via `window.showDirectoryPicker()` or folder upload, and saving back to the user's PC via `FileSystemDirectoryHandle`.
     2. **Cloud Virtual Sandbox Mode**: Operating on in-memory `virtualFiles` with 1-click `.zip` export (`jszip` + `file-saver`) so even mobile/tablet/Safari users have full functionality.
     3. **Localhost Node Disk Mode (`npm run dev`)**: Operating on the local disk via `FsAdapter` and `PatchEngine` with `.backup` rollback files.
4. **User-System Data Ownership (Chat History & Keys)**:
   - Chat history is always persisted on the **user's own system** (`localStorage` key `aether:conversations:v1`) and synced to `/api/conversations` (`data/conversations/` locally, `/tmp/aether-conversations` on serverless) so data never leaks across users on Vercel and never crashes on read-only serverless disks.

---

## 2. File Organization & Size Limits

- **Max File Size**: Soft cap at **250 lines**, hard ceiling at **300 lines**. Any module approaching 300 lines must be decomposed into atomic submodules.
- **Canonical Directory Structure**:
  - `src/lib/agent/`: LangChain agent loop (`run-agent.ts`), model factory (`model.ts`), `rate-limiter.ts`, `config.ts`, `system-prompt.ts`, and `tools/` (`list_files`, `read_file`, `search_code`, `stage_patch`, `run_check`).
  - `src/lib/workspace/`: `fs-adapter.ts` (Node disk), `browser-fs.ts` (Browser File System Access API + folder upload + ZIP export), `diff-calculator.ts` (pure LCS alignment), `patch-engine.ts` (atomic `.backup` writer).
  - `src/lib/history/`: `conversation-store.ts` (serverless-safe atomic JSON store with UUID validation).
  - `src/lib/security/`: `path-guard.ts`, `proxy.ts` (Same-Origin + Localhost CSRF firewall), `sanitizer.ts`, `secret-vault.ts`.
  - `src/lib/terminal/`: `command-whitelist.ts`, `runner.ts`.
  - `src/components/`: `layout/`, `chat/`, `workspace/`, `terminal/`, `ui/`.
  - `src/hooks/`: `use-chat-session.ts`, `use-conversations.ts`.
  - `src/store/`: `workstation-store.ts`.

---

## 3. Strict Security Invariants (Zero-Trust Gate)

1. **Stage-Only Agent Tools**:
   - Agent tools (`stage_patch`) must **never** mutate disk or browser `FileSystemDirectoryHandle` state directly. Writes occur only after explicit user confirmation in `ReviewDialog`.
2. **Sensitive File Blocking (`PathGuard.isSensitivePath`)**:
   - Reading, searching, staging, or applying patches to `.env*`, `.git/*`, `.ssh/*`, `.npmrc`, `.pypirc`, `.netrc`, `id_rsa`, `id_ed25519`, `*.pem`, `*.key`, `*.pfx`, `*.p12` is strictly prohibited in both disk and virtual modes.
3. **Same-Origin & CSRF Firewall (`proxy.ts`)**:
   - Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) must reject `Sec-Fetch-Site: cross-site`, `Origin: null`, cross-origin `Origin !== Host`, and simple CORS `Content-Type` (`text/plain`, `application/x-www-form-urlencoded`, `multipart/form-data`) with HTTP `403 Forbidden`.
4. **Command Execution Whitelist (`CommandWhitelist`)**:
   - Shell metacharacters (`[;&|<>`$\r\n%^\0"!]`) and dangerous runner flags (`-c`, `-e`, `--eval`, `--call`, `--script-shell`, `--prefix`, `--inspect`, `--require`, `--import`) are unconditionally blocked.

---

## 4. Strict Testing & Verification Gates (Iron Law of TDD)

Every change must pass all 4 automated verification gates before commit or deployment:

1. **Gate 1 — Strict TypeScript Compilation**:
   - `npm run typecheck` (`tsc --noEmit`) must exit with **0 errors**.
2. **Gate 2 — Unit & Hybrid Mode Test Suite**:
   - `npm test` (`vitest run`) must verify:
     - All 5 Agent Tools in **both** Node Disk Mode and Virtual File System (`virtualFiles`) Mode.
     - LCS Diff accuracy, RateLimiter sliding window & abort handling, and StreamParser state machines.
     - ConversationStore UUID validation, atomic save, and serverless `/tmp` fallback.
3. **Gate 3 — Red-Team Penetration & Security Suite**:
   - Path traversal (`../`), null-byte injection, Windows reserved devices (`CON`, `NUL`), NTFS Alternate Data Streams (`:`), symlink escape blocks, `.env`/`.git`/private-key blocks, command injection attempts, prompt jailbreak wrappers, secret scrubbing, and `proxy.ts` CSRF/DNS-rebinding blocks.
4. **Gate 4 — Production Build Verification**:
   - `npm run build` (`next build`) must compile all static and dynamic routes cleanly with zero warnings or bundle leaks.
