# AGENTS.md — Mandatory Operational Protocol for AI Agents

## 1. System Identity
AETHER is a **Hybrid Cloud + Local AI Principal Engineer & UI/UX Workstation** built with Next.js 16, React 19, TypeScript strict, Tailwind CSS v4 (Sunrise Light Theme), and LangChain (`@langchain/core`, `@langchain/google-genai`). It runs seamlessly on **Vercel Serverless** and on **Localhost across every IDE (VS Code, Cursor, Windsurf, WebStorm, Antigravity)** and OS (Windows, macOS, Linux).

## 2. Non-Negotiable Engineering Rules
1. **Follow `PROJECT_RULES.md`**: Read `PROJECT_RULES.md` before modifying any file. Keep every file under 250–300 lines.
2. **Import Alias Standard**: Always use `@/...` (which maps to `./src/*`). Never use `@/src/...`.
3. **Dual-Mode Tool Compatibility**: Every agent tool in `src/lib/agent/tools/` must support both `ctx.virtualFiles` (Browser Local Folder / Cloud Virtual Workspace) and `ctx.root` (Node `FsAdapter` disk mode).
4. **Zero Unapproved Writes**: `stage_patch` only stages `ProposedChange` diffs. Actual writes happen exclusively via user confirmation in `ReviewDialog` (writing to the user's PC folder via `FileSystemDirectoryHandle`, downloading as `.zip`, or calling `/api/workspace` in localhost mode).
5. **Security & Verification**: Never bypass `PathGuard`, `CommandWhitelist`, `SecretVault`, `Sanitizer`, or `validateLocalRequest` (`proxy.ts`). Always run `npm run typecheck` and `npm test` after every change.
