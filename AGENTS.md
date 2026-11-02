# AGENTS.md — Guidelines for AI Coding Agents Operating on AETHER

## 1. Project Context
AETHER is a local-first, on-premise Full-Stack AI Developer Workstation powered by Google Gemini API (free tier). It allows developers to connect directly to local repositories on disk, inspect architectures, stage and review code changes with unified diffs, and execute safe test/lint commands.

## 2. Core Operational Rules for Autonomous Agents
- **Maintain Modular Architecture**: Never combine components into monolithic files. Keep files below 250 lines.
- **Respect PathGuard**: Never perform file I/O operations without resolving and checking canonical paths through `PathGuard`.
- **Command Safety**: Only execute commands allowed by `CommandWhitelist` (`npm test`, `npm run lint`, `npm run build`, `git status`, `git diff`). Never execute arbitrary shell strings or external networking commands.
- **Zero Data Loss**: Always use `PatchEngine.applyPatch` which automatically generates `.backup` copies before writing changes.
- **Preserve Documentation Integrity**: Update `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and test suites alongside features.

## 3. Technology Stack Conventions
- Next.js 16 (App Router), React 19, TypeScript strict.
- Tailwind CSS with Obsidian Design Tokens (`--bg-root`, `--surface-1`, `--surface-2`, `--border-subtle`, `--accent-primary`).
- `@google/genai` (current official Google Gemini SDK).
- Vitest for unit & integration testing.
