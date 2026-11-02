# AETHER — On-Premise Full-Stack AI Engineer Workstation

[![Security Audit](https://img.shields.io/badge/Security-4--Phase%20Hardened-emerald)](#security--hardening)
[![AI Engine](https://img.shields.io/badge/Gemini-2.5%20Flash%20(Free%20Tier)-indigo)](https://aistudio.google.com/apikey)
[![Architecture](https://img.shields.io/badge/Clean%20Architecture-Modular-blue)](./docs/ARCHITECTURE.md)
[![Testing](https://img.shields.io/badge/Testing-Vitest%20%2B%20TDD-green)](./docs/PRD.md)

**AETHER** is an enterprise-grade, local-first AI coding workstation designed exclusively for **Full-Stack Web Engineering** (Next.js, React 19, TypeScript, Node.js, Tailwind CSS v4, SQL/Prisma). Operating directly on your machine, it connects to your local client and production repositories, streams cognitive reasoning and full production code, provides visual staged diff reviews with automatic rollback backups, and runs project tests safely.

---

## ⚡ What Makes AETHER Completely Redesigned

1. **Direct On-Premise Workspace Engine**: Connects to actual local repositories on your disk. Reads file trees, generates fixes, and writes changes directly with automatic `.backup` rollback protection.
2. **Dedicated Full-Stack Mastery**: Laser-focused on modern web architecture (Next.js 15/16 App Router, React 19, Server Actions, TypeScript strict, Prisma, and PostgreSQL). No shallow multi-language distractions.
3. **Google Gemini Free-Tier Optimization**: Powered by the official `@google/genai` SDK with an automatic 15 RPM throttling queue to prevent quota exhaustion.
4. **Interactive Staged Diff Reviewer**: Code is never blindly written over your work. Inspect green additions and red deletions line-by-line, and apply changes when you are satisfied.
5. **Safe Terminal Runner with Auto-Fix**: Run `npm test`, `npm run lint`, and `git status` directly from the UI. If a test fails, click **"Auto-Fix with AETHER"** to trigger automated root-cause analysis and repair.
6. **Figma & Mobbin Obsidian Dark System**: High-contrast, ergonomic engineering interface inspired by leading developer tooling designs.
7. **Clean Modular Architecture**: Deconstructed from a legacy 1,894-line monolithic file into clean, atomic modules strictly capped under 250 lines.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20 or higher
- **Google Gemini API Key**: Free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 2. Installation
```bash
# Clone or navigate to the repository
cd AETHER-Agent-main

# Install dependencies
npm install

# Configure your free Gemini API Key
echo GOOGLE_API_KEY=your_gemini_api_key_here > .env.local

# Run the local workstation
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 💻 Workflow: Building Real Projects on Your Machine

1. **Connect Local Workspace**: In the top workspace bar, enter the path to your client repository (e.g. `C:/projects/my-client-app`) and click **Connect**.
2. **Select Engineering Mode**:
   - 🔨 **Build**: Generate complete, runnable full-stack features.
   - 🧭 **Architect**: Plan data schemas, API contracts, and system layouts.
   - 🐛 **Debug**: Fix failing tests or pasted stack traces.
   - 🛡️ **Review**: Audit code for security vulnerabilities and performance.
3. **Review & Apply Code**:
   - Generated files appear in the **Staged Diffs** tab.
   - Review additions and deletions.
   - Click **Apply to Disk** — an automatic `.backup` copy of the original file is created before writing.
4. **Verify in Terminal Runner**:
   - Click **npm test** or **lint** in the bottom terminal drawer to run your test suite.
   - If tests fail, click **Auto-Fix with AETHER** to generate a patch.

---

## 🛡️ Security & Hardening

AETHER enforces a zero-trust security sandbox across four phases:
- **Phase 1: Path Traversal Defense**: Canonical path validation prevents directory escapes outside the project root (`PathGuard`).
- **Phase 2: Terminal RCE Protection**: Strict argument whitelisting blocks shell metacharacters (`;`, `&&`, `|`, `` ` ``).
- **Phase 3: Prompt Jailbreak Isolation**: User files and logs are wrapped in anti-injection delimiters (`Sanitizer`).
- **Phase 4: Secret Leak Redaction**: Outgoing streaming events and logs are scrubbed for API tokens (`SecretVault`).

For the full security audit and threat model, see [docs/SECURITY.md](./docs/SECURITY.md).

---

## 📂 Project Architecture

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts         # SSE streaming with @google/genai
│   │   ├── workspace/route.ts    # Sandboxed file tree, reader & patcher
│   │   └── terminal/route.ts     # Whitelisted safe terminal runner
│   ├── globals.css               # Obsidian Figma/Mobbin design tokens
│   ├── layout.tsx                # Next.js root layout & fonts
│   └── page.tsx                  # Clean root orchestrator (<185 lines)
├── src/
│   ├── components/
│   │   ├── chat/                 # MessageList, ThinkingDrawer, PlanChecklist
│   │   ├── layout/               # WorkstationHeader
│   │   ├── terminal/             # TerminalDrawer
│   │   ├── ui/                   # Button, Badge, Tabs, Card primitives
│   │   └── workspace/            # ProjectSwitcher, FileTree, StagedDiffViewer
│   ├── lib/
│   │   ├── gemini/               # StreamParser, PromptBuilder, GeminiClient
│   │   ├── security/             # PathGuard, Sanitizer, SecretVault
│   │   ├── terminal/             # CommandWhitelist, TerminalRunner
│   │   └── workspace/            # FsAdapter, PatchEngine
│   └── store/
│       └── workstation-store.ts  # Centralized React state manager
├── docs/
│   ├── ARCHITECTURE.md           # System design & module contracts
│   ├── SECURITY.md               # 4-phase penetration audit & threat model
│   └── PRD.md                    # Agile user stories & acceptance criteria
├── PROJECT_RULES.md              # Engineering laws & standards
└── AGENTS.md                     # Operational instructions for AI agents
```

---

## 🧪 Testing & Verification

Run the comprehensive unit and penetration test suites:
```bash
npm test
```

Includes tests for:
- Path traversal & null-byte rejection (`security.test.ts`)
- Staged unified diff calculation & `.backup` creation (`workspace.test.ts`)
- Command whitelist & shell injection prevention (`terminal.test.ts`)
- Streaming reasoning `<thinking>` & tag parser (`gemini-parser.test.ts`)
- 4-Phase automated security penetration harness (`pentest.test.ts`)

---

## 📜 Governance & Rules
- [Project Rules (PROJECT_RULES.md)](./PROJECT_RULES.md)
- [Agent Operational Guidelines (AGENTS.md)](./AGENTS.md)
