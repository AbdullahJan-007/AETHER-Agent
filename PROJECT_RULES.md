# AETHER Engineering Project Rules

## 1. Architectural Philosophy & Principles
- **Clean Architecture**: Strict separation of concerns across Presentation (`src/components/`, `src/hooks/`), Application/Agent (`src/lib/agent/`), Domain/Storage (`src/lib/workspace/`, `src/lib/history/`), and Security Infrastructure (`src/lib/security/`, `src/lib/terminal/`).
- **World-Class Principal Engineering & UI/UX Standard**:
  - **Multi-Stack Mastery**: Support any language, framework, or architecture the user chooses with idiomatic, production-ready, fault-tolerant code.
  - **Zero Placeholder Policy**: Never generate partial snippets, `// TODO` placeholders, or superficial demo code.
  - **UI/UX Excellence**: Maintain harmonious WCAG AA/AAA color palettes, 4px/8px grid spacing, collapsible workspace panels, and structured visual preview cards.
- **On-Premise Security First**: Bind strictly to `127.0.0.1`, enforce local origin verification (`proxy.ts`), scrub secrets (`SecretVault`), and never write to disk without explicit user confirmation.

## 2. File Organization & Size Limits
- **Max File Size**: 250–300 lines. Files exceeding 300 lines must be decomposed into focused submodules.
- **Directory Structure**:
  - `src/lib/agent/`: LangChain agent loop (`run-agent.ts`), model factory (`model.ts`), sliding-window `rate-limiter.ts`, `config.ts`, `system-prompt.ts`, and `tools/` (`list_files`, `read_file`, `search_code`, `stage_patch`, `run_check`).
  - `src/lib/history/`: On-disk atomic JSON conversation persistence (`ConversationStore`) with strict UUID validation.
  - `src/lib/security/`: `PathGuard`, `Sanitizer`, `SecretVault`, and local request firewall `proxy.ts`.
  - `src/lib/workspace/`: Sandboxed filesystem operations (`FsAdapter`), LCS `DiffCalculator`, and `.backup` `PatchEngine`.
  - `src/lib/terminal/`: `CommandWhitelist` and cross-platform `TerminalRunner` (with Windows `cmd.exe` safe batch handling and process-tree kill).
  - `src/components/layout/`: Collapsible `Sidebar` (conversation history, search, date grouping) and `WorkstationHeader` (panel toggles, mode/model indicators).
  - `src/components/chat/`: `MessageList`, `ChatInput`, `WorkLog` (humanized tool timeline), `ThinkingDrawer`, `PlanChecklist`.
  - `src/components/workspace/`: `ProjectSwitcher`, `FileTree`, `StagedDiffViewer`, `ReviewDialog` (confirm-before-save modal).
  - `src/components/ui/`: `<AetherLogo />` (Prism SVG), `Button`, `Badge`, `Card`, `Tabs`.
  - `src/hooks/`: `use-chat-session.ts` and `use-conversations.ts`.

## 3. Coding & TypeScript Standards
- **TypeScript Strict**: `tsc --noEmit` must pass with zero errors.
- **Early Returns & Defensive Error Handling**: Flatten conditional nesting and handle process, filesystem, and abort errors explicitly.
- **No Direct Shell Interpolation**: All process execution must validate binary and arguments through `CommandWhitelist`.

## 4. Testing & Verification Gates (TDD)
- Unit and security tests (`npm test`) must cover:
  - Path traversal, symlink escape, `.env` refusal, and secret redaction.
  - Cross-origin CSRF and DNS rebinding rejection (`proxy.test.ts`).
  - LCS diff calculation and sliding-window rate limiting.
  - Agent tool sandboxing and scripted multi-turn agent loop execution.
  - Atomic conversation storage and UUID validation.
