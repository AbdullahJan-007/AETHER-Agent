# AETHER — On-Premise AI Principal Engineer & UI/UX Workstation

[![Security Audit](https://img.shields.io/badge/Security-5--Phase%20Hardened-emerald)](./docs/SECURITY.md)
[![AI Engine](https://img.shields.io/badge/LangChain-Gemini%202.5%20Flash%20Agent-orange)](https://aistudio.google.com/apikey)
[![Design System](https://img.shields.io/badge/UI%2FUX-Sunrise%20Ergonomic%20Light-rose)](./docs/ARCHITECTURE.md)
[![Testing](https://img.shields.io/badge/Testing-Vitest%20%2B%20TDD%20(61%20Passed)-green)](./docs/PRD.md)

**AETHER** is an enterprise-grade, local-first AI Principal Engineer & UI/UX Architect workstation. Running 100% on your own machine (`127.0.0.1`), it connects directly to your local repositories, autonomously explores your codebase using **LangChain tools**, writes complete production-grade code across **any technology stack** (TypeScript, React, Next.js, Vue, Svelte, Node.js, Python, FastAPI, Go, Rust, SQL/Prisma, Docker, and beyond), designs world-class user interfaces with curated color palettes and visual preview cards, stages proposed changes with explanations for line-by-line diff review, and executes validation tests safely.

---

## ⚡ Key Highlights & Architecture

1. **Autonomous LangChain Tool-Using Agent**:
   - Powered by `@langchain/google-genai` and `@langchain/core` (`gemini-2.5-flash`).
   - Instead of single-shot guessing, AETHER inspects your project directory, reads source files, searches symbols, stages multi-file diffs, and verifies work with test suites.
2. **World-Class Principal Engineering & UI/UX Mastery**:
   - **Zero Placeholder / Demo Coding**: Strictly engineered to produce complete, humanized, reliable, and scalable production code—never lazy `// TODO` or `// rest of code` snippets.
   - **Multi-Stack Mastery**: Seamlessly adapts to whatever frontend, backend, database, or infrastructure stack your project uses.
   - **Elite UI/UX Design & Live Card Previews**: Generates harmonious WCAG AA/AAA color palettes, 4px/8px grid layouts, and structured visual preview cards for every interface section.
3. **5 Sandboxed Local Agent Tools**:
   - `list_files`: Explores workspace directories while automatically skipping `node_modules`, `.git`, `.next`, and `dist`.
   - `read_file`: Reads project files with automatic secret redaction (`SecretVault`) and anti-jailbreak delimiters (`Sanitizer`). Strictly refuses `.env*` files.
   - `search_code`: Fast case-insensitive text and symbol search across codebase files.
   - `stage_patch`: Proposes file creations or modifications with a clear 1–2 sentence reason. **Never writes directly to disk.**
   - `run_check`: Runs whitelisted read-only checks (`test`, `lint`, `typecheck`, `git_status`, `git_diff`) with output scrubbing.
4. **Confirm-Before-Save Diff Review Flow**:
   - Proposed changes open in an interactive **Review & Save** dialog showing `NEW` / `EDITED` badges, `+ / -` line counts, the agent's plain-language reason, and expandable unified diffs.
   - Nothing is written to disk until you explicitly click **Save**, which automatically creates a `.backup` snapshot before modifying any existing file.
5. **On-Disk Persistent Conversation History**:
   - Conversations are stored atomically as JSON files under `data/conversations/` (gitignored).
   - Grouped by *Today*, *Yesterday*, and *Older* with instant search, inline rename, delete confirmation, and `Ctrl + N` new chat shortcut.
6. **Sunrise Ergonomic Light Theme & Collapsible Sidebars**:
   - Warm, high-contrast light palette (`#fff7ed → #fef2f2 → #f5f3ff`) featuring the geometric **Prism** logo (`<AetherLogo />`) and Inter / JetBrains Mono typography.
   - **Claude-Style Collapsible Panels**: Toggle the Left Chat History Sidebar (`Ctrl + B`) or the Right Workspace Files/Diffs Panel anytime for distraction-free focus.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20 or higher
- **Google Gemini API Key**: Free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 2. Installation & Startup
```bash
# 1. Navigate to the repository
cd AETHER-Agent-main

# 2. Install dependencies
npm install

# 3. Configure your Gemini API Key
cp .env.example .env.local
# Edit .env.local and set GOOGLE_API_KEY=your_gemini_api_key_here

# 4. Start the local workstation (binds strictly to 127.0.0.1:3000)
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) (or [http://localhost:3000](http://localhost:3000)) in your browser.

---

## ⚙️ Environment Configuration (`.env.local`)

All agent caps are configurable via environment variables with generous local-first defaults:

| Variable | Default | Description |
|---|---|---|
| `GOOGLE_API_KEY` | *(Required)* | Your Google Gemini API key (server-only, never exposed to client) |
| `AETHER_MODEL` | `gemini-2.5-flash` | Gemini model ID |
| `AETHER_MAX_STEPS` | `40` | Maximum tool-calling turns per request |
| `AETHER_MAX_OUTPUT_TOKENS` | `65536` | Maximum output tokens per model turn |
| `AETHER_RPM` | `10` | Sliding-window requests per minute (`0` disables throttling for paid keys) |
| `AETHER_READ_FILE_MAX_BYTES` | `2000000` | Max bytes returned by `read_file` (2 MB) |
| `AETHER_HISTORY_CHAR_BUDGET` | `3000000` | Character budget for conversation history sent to model |
| `AETHER_CHECK_TIMEOUT_MS` | `600000` | Timeout for `run_check` commands (10 minutes) |

---

## 🛡️ 5-Phase Zero-Trust Security Architecture

AETHER enforces strict local security boundaries verified by 61 automated unit & penetration tests:
- **Phase 1 — Path Traversal Defense (`PathGuard`)**: Canonical path resolution prevents directory escapes (`../`), blocks OS system roots (`C:\Windows`, `/etc`), and rejects Windows reserved device names and NTFS Alternate Data Streams.
- **Phase 2 — Terminal RCE Protection (`CommandWhitelist` & `TerminalRunner`)**: Strict binary and subcommand whitelisting blocks shell metacharacters (`;`, `&&`, `|`, `` ` ``, `$`, `"`, `!`) and scrubs API keys from child process environments.
- **Phase 3 — Prompt Jailbreak Isolation (`Sanitizer`)**: Wraps untrusted repository files and logs in cryptographic delimiter guards so embedded instructions are treated strictly as data.
- **Phase 4 — Secret Redaction (`SecretVault`)**: Scrubs Google API keys (`AIza...`), OpenAI/Groq keys, AWS keys, GitHub PATs, JWTs, and database connection URIs before data reaches the model or UI.
- **Phase 5 — Local Origin & DNS Rebinding Firewall (`proxy.ts`)**: Rejects non-local `Host` headers and cross-origin `Origin` / `Sec-Fetch-Site: cross-site` requests with HTTP `403 Forbidden`.

See [docs/SECURITY.md](./docs/SECURITY.md) for the complete threat model and audit report.

---

## 📂 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── agent/route.ts                # SSE streaming LangChain tool-using agent endpoint
│   │   ├── conversations/route.ts        # List & save on-disk conversation records
│   │   ├── conversations/[id]/route.ts   # Get, rename, update & delete conversation by UUID
│   │   ├── workspace/route.ts            # Sandboxed file tree, reader & .backup patch applier
│   │   └── terminal/route.ts             # Whitelisted safe terminal command runner
│   ├── globals.css                       # Sunrise light design tokens & custom scrollbars
│   ├── icon.svg                          # Prism geometric vector app icon
│   ├── layout.tsx                        # Root layout with Inter & JetBrains Mono fonts
│   └── page.tsx                          # Workstation orchestrator with collapsible sidebars
├── public/
│   └── logo.svg                          # Public Prism brand mark SVG
├── src/
│   ├── components/
│   │   ├── chat/                         # MessageList, ChatInput, WorkLog, ThinkingDrawer
│   │   ├── layout/                       # Sidebar (history + search), WorkstationHeader (toggles)
│   │   ├── terminal/                     # TerminalDrawer with Auto-Fix trigger
│   │   ├── ui/                           # AetherLogo, Button, Badge, Tabs, Card primitives
│   │   └── workspace/                    # ProjectSwitcher, FileTree, StagedDiffViewer, ReviewDialog
│   ├── hooks/
│   │   ├── use-chat-session.ts           # SSE client consumer for /api/agent events
│   │   └── use-conversations.ts          # CRUD state hook for on-disk chat history
│   ├── lib/
│   │   ├── agent/                        # config, model, rate-limiter, run-agent, system-prompt, tools/
│   │   ├── history/                      # ConversationStore (atomic JSON persistence + UUID guard)
│   │   ├── security/                     # PathGuard, Sanitizer, SecretVault, proxy.ts
│   │   ├── terminal/                     # CommandWhitelist, TerminalRunner (win32 safe spawn)
│   │   ├── types/                        # Conversation & message TypeScript contracts
│   │   └── workspace/                    # FsAdapter, LCS DiffCalculator, PatchEngine
│   └── store/
│       └── workstation-store.ts          # Reactive workspace state store
```

---

## 🧪 Verification & Testing Commands

```bash
# Run the complete unit & security penetration test suite (61 tests)
npm test

# Verify strict TypeScript compilation
npm run typecheck

# Build optimized production bundle
npm run build
```
