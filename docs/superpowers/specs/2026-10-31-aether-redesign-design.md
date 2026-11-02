# Engineering Design Document: AETHER Full-Stack AI Engineer Redesign

**Project**: AETHER — On-Premise Full-Stack AI Developer Workstation  
**Author**: Abdullah Jan  
**Status**: Ready for Human Approval  
**Date**: 2026-10-31  
**Target Repository**: `c:\Users\abiij\Desktop\My Projects\AI Agent\AETHER-Agent-main`

---

## 1. Intent & Context ("The Why")

The existing AETHER project was conceived as an AI coding agent, but in its current state, it suffers from severe architectural decay:

- **Monolithic anti-pattern**: A single 1,894-line file (`app/page.tsx`) couples UI layout, IndexedDB persistence, SSE decoding, ZIP compression, and local state.
- **Scattered scope**: Diluted attention across Flutter, Go, Rust, and Python, causing shallow code generation rather than deep, production-ready output.
- **Zero verification**: No automated test framework (Vitest, Jest, Playwright) exists; quality cannot be mathematically proven.
- **Virtual toy syndrome**: Operates in an isolated browser sandbox relying on manual ZIP exports instead of serving as a genuine on-premise development engine capable of reading, refining, running, and applying changes to real client repositories on disk.

The goal of this redesign is to completely reconstruct AETHER into an enterprise-grade, **on-premise Full-Stack AI Engineer Workstation**, designed specifically for high-velocity, secure full-stack web engineering (Next.js, React, TypeScript, Node.js, REST/GraphQL APIs, SQL/NoSQL databases) powered by Google Gemini API (free tier).

---

## 2. Core Software Engineering Pillars

1. **Separation of Concerns (SoC)**: Strict architectural layering between Presentation Layer, State Layer, Local Workspace Bridge, Terminal Runner, AI Generation Engine, and Security Sandbox.
2. **SOLID & Clean Architecture**: Dependency inversion for LLM providers; single-responsibility modules under 250 lines; open-closed interfaces for tool extensions.
3. **Defense in Depth**: Zero-trust approach to inputs, sandboxed path validation, command whitelisting against shell injection, secret isolation, and anti-jailbreak protocol.
4. **Test-Driven Development (TDD)**: Test infrastructure configured before feature development, with mandatory unit tests (Vitest) and integration tests.
5. **Agile Iteration**: Phased sprint execution with verifiable deliverables and acceptance criteria.

---

## 3. Goals, Non-Goals, and Anti-Goals

### Goals

- Rebuild the application architecture into clean, modular TypeScript modules (<250 lines per file).
- Laser-focus exclusively on modern **Full-Stack Web Development** (Next.js 15/16, React 19, Tailwind CSS, TypeScript, Node/Express/FastAPI backend patterns, PostgreSQL/Prisma/MongoDB).
- Implement a **Local Workspace Bridge API** enabling the agent to read, inspect, create, and patch local client repository files safely on disk.
- Implement a **Safe Terminal Runner Subsystem** allowing whitelisted execution (`npm test`, `npm run lint`, `npm run build`, `git status`, `git diff`) with streaming output and automated bug-fix loops.
- Implement a **Dynamic Workspace Switcher** allowing seamless switching between different client project folders without server restarts.
- Implement an **Interactive Staged Diff Reviewer** with visual color-coded additions/deletions, individual/batch patch application, and automatic `.backup` creation to guarantee zero client data loss.
- Integrate the official Google Gemini SDK (`@google/genai`) with free-tier resilience (token quota management, exponential backoff, rate-limit queuing).
- Provide a modern, Figma & Mobbin-inspired UI/UX with responsive three-tier workspace navigation, live terminal output drawer, live execution checklist, and obsidian theme tokens.
- Implement automated test suites (Vitest + Testing Library) covering core utilities, streaming parsers, and security boundaries.
- Conduct a 4-phase security audit and penetration test (Path Traversal, Command Injection, Prompt Injection, Secret Leaks).

### Non-Goals

- Support for unrelated mobile/native languages (Flutter, Rust CLI, Swift) is out of scope for this full-stack web specialization.
- Multi-tenant cloud hosting or remote SaaS accounts (AETHER remains purely local-first and on-premise).

### Anti-Goals

- **No Monolithic Files**: No file in the codebase shall exceed 350 lines.
- **No Unsafe File or Command Execution**: The agent must never write outside configured project directories or execute un-whitelisted shell commands (e.g., `rm -rf`, curl to external domains).
- **No Blind Overwrites**: Code modifications must always stage in memory with user approval or safe rollback snapshots.
- **No Mock Testing**: Tests must execute real logical assertions on parsers, security filters, command sanitizers, and state reducers.

---

## 4. Evaluated Approaches & Selected Architecture

### Approaches Considered

1. **Approach 1: Local Full-Stack Workstation Engine with Terminal Runner (SELECTED)**
   - *Description*: Next.js App Router running on `localhost:3000` backed by secure Node server endpoints (`/api/workspace`, `/api/terminal`, `/api/chat`, `/api/security`) with direct local filesystem read/write access and a whitelisted child-process terminal runner.
   - *Trade-offs*: Requires local Node.js environment. Delivers the ultimate on-premise experience for real client repositories: reads files, generates fixes, runs tests to verify them, and displays live terminal logs.
2. **Approach 2: Browser-Sandboxed Virtual Studio with Web FileSystem Access**
   - *Description*: Pure in-browser state with `showDirectoryPicker()` and ZIP download.
   - *Trade-offs*: Completely sandboxed, but cannot run local linters, unit tests, or server-side git operations.
3. **Approach 3: Desktop Executable (Tauri / Electron)**
   - *Description*: Native OS window packaging.
   - *Trade-offs*: Heavy boilerplate, slow build iteration, high maintenance burden.

**Decision**: Approach 1 was explicitly selected by the user.

---

## 5. System Architecture & Modules

```
AETHER Architecture Overview
┌──────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  - Project Switcher (Select target repository on disk)       │
│  - Command Pane (Mode, Stack, Plan Checklist)               │
│  - Chat & Reasoning Streamer (<thinking>, <plan>, <code>)   │
│  - Staged Diff Reviewer (Visual Add/Remove, Rollback Safe)  │
│  - Safe Terminal Drawer (Real-time logs for npm/git)        │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP / SSE
┌──────────────────────────────▼───────────────────────────────┐
│                    Local Server Layer                        │
│  ┌───────────────────────┐       ┌────────────────────────┐  │
│  │   /api/chat (SSE)     │       │  /api/workspace (REST) │  │
│  │  - Gemini SDK Bridge  │       │  - Sandboxed FS Reader │  │
│  │  - Prompt Pipeline    │       │  - Staged Patch Writer │  │
│  │  - Security Sanitizer │       │  - Path Traversal Guard│  │
│  └───────────┬───────────┘       └───────────┬────────────┘  │
│              │                               │               │
│  ┌───────────▼───────────┐       ┌───────────▼────────────┐  │
│  │  /api/terminal (REST) │       │   /api/security (REST) │  │
│  │  - Whitelisted Runner │       │   - Secret Vault       │  │
│  │  - Child Process Pool │       │   - In-memory Limiter  │  │
│  └───────────┬───────────┘       └────────────────────────┘  │
└──────────────┼───────────────────────────────┼───────────────┘
               │                               │
┌──────────────▼───────────┐       ┌───────────▼────────────┐
│   Google Gemini API      │       │ Local File System & OS │
│   (Free Tier Flash 2.5)  │       │ (Target Project Root)  │
└──────────────────────────┘       └────────────────────────┘
```

### Module Breakdown

- `src/lib/workspace/`: Sandboxed filesystem scanner, file tree generator, safe file patcher, backup manager.
- `src/lib/terminal/`: Whitelisted command execution (`npm test`, `npm run lint`, `npm run build`, `git status`, `git diff`), process spawning with strict timeouts, streaming output emitter.
- `src/lib/gemini/`: Google GenAI client wrapper, streaming protocol parser, token estimation, retry engine with jitter.
- `src/lib/security/`: Path normalization, command injection prevention, prompt injection guards, secret scrubbers, rate-limiting.
- `src/components/ui/`: Radix-based atomic primitives (Buttons, Inputs, Dialogs, Dropdowns, Badges, Tabs).
- `src/components/chat/`: Message list, streaming bubble, collapsible reasoning trace (`<thinking>`), plan checklist.
- `src/components/workspace/`: Directory tree, tabbed code viewer, interactive staged diff review with one-click apply.
- `src/components/terminal/`: Terminal drawer with live stdout/stderr streams, exit code badges, and "Fix with AETHER" shortcut.
- `src/store/`: Modular state management for active project path, chat thread, staged diffs, and terminal sessions.

---

## 6. UI/UX Design System (Figma & Mobbin Inspired)

### Color Palette (Obsidian & High-Contrast Precision)

- **Background Root**: `#090A0F` (Deep Obsidian Void)
- **Surface Elevation 1**: `#12151E` (Card & Sidebars)
- **Surface Elevation 2**: `#1A1F2C` (Input bars & Code header)
- **Border Subtle**: `#242B3D`
- **Primary Accent**: `#4F46E5` to `#6366F1` (Electric Indigo)
- **Success / Diff Add**: `#10B981` (Emerald)
- **Warning / Thinking**: `#F59E0B` (Amber)
- **Destructive / Diff Remove**: `#EF4444` (Crimson)
- **Text Primary**: `#F8FAFC`
- **Text Secondary**: `#94A3B8`
- **Text Muted**: `#64748B`

### Typography & Ergonomics

- Sans: Geist Sans / Inter for UI typography.
- Mono: Geist Mono / JetBrains Mono for code blocks, terminal logs, and file paths.
- Layout: 3-column responsive layout (Command & Navigation | Chat & Thought Stream | Live Workspace, Diff Inspector & Terminal Drawer). Fully collapsible.

---

## 7. Security Agent & Hardening Specification

### Threat Vectors & Mitigations

1. **Directory Traversal (**`../../etc/passwd` **or** `..\..\Windows`**)**:
   - *Mitigation*: Canonical path verification (`path.resolve()`). Absolute path must strictly match or descend from the actively validated `PROJECT_ROOT`. Rejection of null bytes and symbolic link escapes.
2. **Command Injection (RCE via terminal runner)**:
   - *Mitigation*: Strict command whitelisting. Only pre-approved binary prefixes (`npm`, `npx`, `git`, `node`) and safe arguments are executed. No raw shell string interpolation (`exec` is banned; `spawn` with array arguments only).
3. **Prompt Injection & Model Jailbreaking**:
   - *Mitigation*: Multi-stage content sanitization. Enclosure of all user project files in clear cryptographic delimiters (`### UNTRUSTED CONTEXT`). Dual-prompt isolation between plan and code phases.
4. **Secret & Key Leakage**:
   - *Mitigation*: Server-side key storage (`.env.local`). Client-side scanning for API keys (Google, AWS, GitHub PATs) with automatic redaction in terminal logs and outgoing UI responses.
5. **Denial of Service / Token Exhaustion**:
   - *Mitigation*: Sliding context window (keeps latest turns + running architectural summary), maximum file payload size caps (100KB per file, 1MB total context), and 15 RPM rate-limiting queue for Gemini free tier.

---

## 8. Testing & Quality Assurance Plan

1. **Unit Testing (Vitest)**:
   - `security.test.ts`: Test directory traversal attacks, command injection rejection, secret redaction, and malicious string filtering.
   - `terminal.test.ts`: Verify command whitelist enforcement, timeout termination, and output streaming.
   - `gemini-parser.test.ts`: Verify streaming chunk reconstruction, tag extraction (`<thinking>`, `<plan>`, `<file>`).
   - `workspace-fs.test.ts`: Verify safe file read/write, backup creation, directory tree construction, and ignore patterns (`node_modules`, `.git`).
2. **Integration Testing**:
   - End-to-end API route validation for `/api/chat`, `/api/workspace`, and `/api/terminal`.
3. **Security Penetration Harness**:
   - Automated test suite attempting path escape payloads, command chaining attacks (`; rm -rf`, `&& dir`), prompt injection strings, and oversized payloads.

---

## 9. Agile Sprint Delivery Roadmap

- **Sprint 1: Architecture, Test Foundation & Security Core**
  - Setup Vitest, ESLint, TypeScript strict configuration.
  - Implement and unit-test `src/lib/security` (path validator, command whitelist, secret scrubber, prompt sanitizer).
  - Create project governance rules (`PROJECT_RULES.md`, `AGENTS.md`).
- **Sprint 2: Local Workspace Bridge & Safe Terminal Runner**
  - Implement `/api/workspace` (list directory, read file, staged patch writer, backup manager).
  - Implement `/api/terminal` (safe process spawn for `npm test`, `npm run lint`, `git status`).
  - Write comprehensive tests for filesystem and terminal operations.
- **Sprint 3: Gemini Generative AI Engine & Streaming Parser**
  - Implement modern `@google/genai` integration with full-stack specialized system prompts.
  - Two-stage architecture: Strategy & Planning -> Production Code Generation.
  - Build and test robust streaming parser for `<thinking>`, `<plan>`, and code blocks.
- **Sprint 4: Figma/Mobbin UI/UX Transformation**
  - Rebuild presentation layer into modular atomic components.
  - Implement Project Switcher, Command Pane, Chat & Reasoning Viewer, Staged Diff Reviewer, and Terminal Drawer.
- **Sprint 5: Security Penetration Test & Production Hardening**
  - Execute automated penetration test suite across all 4 threat phases.
  - Polish documentation: PRD, Architecture manual, API reference, Security audit report.

---

## 10. Living Governance & Project Rules

A dedicated `PROJECT_RULES.md` and `AGENTS.md` will be placed in the repository root specifying:

- Code style: TypeScript strict, early returns, no `any`, modular functions under 50 lines.
- Maximum file size: 250 lines (hard limit at 350 lines).
- All new features must have accompanying unit tests.
- Gemini API key must never be logged or transmitted to the client browser.
- Terminal commands must always be validated against the whitelist.
