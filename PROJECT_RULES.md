# AETHER Engineering Project Rules

## 1. Architectural Philosophy & Principles
- **Clean Architecture**: Separation of concerns across Presentation, State, Domain, and Infrastructure.
- **SOLID Design**: Single-responsibility modules, open for extension, dependency inversion for external providers.
- **Strict Full-Stack Specialization**: Focused solely on modern Full-Stack web engineering (Next.js, React, Node.js, TypeScript, PostgreSQL, Prisma, Tailwind CSS).
- **On-Premise Security First**: Pure local execution. Secrets must never leave the local environment or be emitted in responses/logs.

## 2. File Organization & Size Limits
- **Max File Size**: 250 lines (hard ceiling at 350 lines). Files exceeding 250 lines must be decomposed.
- **Directory Structure**:
  - `src/lib/security/`: Path guards, input sanitizers, secret redaction, rate limits.
  - `src/lib/workspace/`: Sandboxed filesystem operations, patch generation, backups.
  - `src/lib/terminal/`: Whitelisted command execution and process runners.
  - `src/lib/gemini/`: Google GenAI SDK integration and streaming tag parsers.
  - `src/components/ui/`: Atomic UI components (Buttons, Badges, Tabs, Dialogs).
  - `src/components/workspace/`: File tree, staged diff viewer, project switcher.
  - `src/components/chat/`: Message stream, reasoning trace (`<thinking>`), plan checklist.
  - `src/components/terminal/`: Terminal drawer and output monitors.
  - `src/store/`: Centralized state management.

## 3. Coding & TypeScript Standards
- **TypeScript Strict**: `noImplicitAny`, strict null checks, exhaustive type definitions. No `any` type casting.
- **Early Returns**: Flatten conditional nesting; return early on errors or guard clauses.
- **Defensive Error Handling**: Catch and classify engine errors. Never swallow exceptions silently.
- **No Direct Shell Interpolation**: All process execution must use argument arrays with strict whitelist validation.

## 4. Testing & Verification Gates (TDD)
- **Iron Law of TDD**: No production logic without a failing test first.
- Unit tests (`vitest run`) must cover parsers, security filters, command validation, and patch mechanics.
- Penetration tests must verify path traversal protection, command injection resistance, and secret scrubbing.
