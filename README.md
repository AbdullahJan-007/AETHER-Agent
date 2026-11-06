# AETHER — Hybrid AI Principal Engineer & UI/UX Workstation

[![Security Audit](https://img.shields.io/badge/Security-5--Phase%20Hardened-emerald)](./docs/SECURITY.md)
[![Architecture](https://img.shields.io/badge/Architecture-Hybrid%20Vercel%20%2B%20Local-orange)](./docs/ARCHITECTURE.md)
[![AI Engine](https://img.shields.io/badge/LangChain-Gemini%202.5%20Flash%20Agent-rose)](https://aistudio.google.com/apikey)
[![Cross-IDE](https://img.shields.io/badge/IDE-VS%20Code%20%7C%20Cursor%20%7C%20Windsurf-blue)](./PROJECT_RULES.md)

**AETHER** is an enterprise-grade, **Hybrid Cloud + Local-System AI Principal Engineer & UI/UX Architect Workstation**. It runs seamlessly both on **Vercel (Free Cloud Hosting)** and locally on **any OS or IDE (VS Code, Cursor, Windsurf, WebStorm, Zed, Antigravity)**.

In **Hybrid Mode**, Vercel hosts the UI and the **LangChain Tool-Using Agent** (`@langchain/google-genai`), while **your own system** stores your conversation history (`localStorage` + local disk sync) and mounts your PC's project folders directly from the browser (`showDirectoryPicker` / folder upload / `.zip` export).

---

## ⚡ Key Highlights & Hybrid Architecture

1. **Dual-Engine Hybrid Workspace (Vercel Cloud + Localhost Disk)**:
   - **Browser PC Folder Mode (Works on Vercel & Any Browser)**: Click **Open PC Folder** to grant browser access to any directory on your computer (or upload a folder). AETHER loads your code into a secure virtual workspace, runs all 5 LangChain agent tools against your files, and writes approved diffs directly back to your PC folder (with `.backup` creation) or exports a `.zip` archive.
   - **Localhost Disk Mode (Works in VS Code / Cursor / CLI)**: Reads and writes directly to your local filesystem via `FsAdapter` and `PatchEngine` and runs whitelisted terminal checks via `TerminalRunner`.
2. **User-System Private Chat History**:
   - Your conversations are saved directly on **your own system** (`localStorage` `aether:conversations:v1` + atomic disk sync under `data/conversations/` locally), ensuring complete privacy across users on shared Vercel deployments.
   - Grouped by *Today*, *Yesterday*, and *Older* with instant search, inline rename, delete confirmation, and `Ctrl + N` shortcut.
3. **5 Sandboxed Dual-Mode LangChain Agent Tools**:
   - `list_files`: Explores workspace directories (on disk or in virtual browser memory) while skipping `node_modules`, `.git`, `.next`, `dist`, and sensitive files.
   - `read_file`: Reads project files with automatic secret redaction (`SecretVault`) and anti-jailbreak delimiters (`Sanitizer`). Strictly refuses `.env*` and private key files.
   - `search_code`: Fast case-insensitive text and symbol search across codebase files.
   - `stage_patch`: Proposes file creations or modifications with a clear 1–2 sentence reason. **Never writes without your confirmation.**
   - `run_check`: Runs whitelisted read-only checks (`test`, `lint`, `typecheck`, `git_status`, `git_diff`) on disk or performs static syntax/security/type verification in virtual browser mode.
4. **World-Class Principal Engineering & UI/UX Mastery**:
   - **Zero Placeholder / Demo Coding**: Strictly engineered to produce complete, humanized, reliable, and scalable production code across **any technology stack** (TypeScript, React, Next.js, Vue, Python, Go, Rust, SQL/Prisma, Docker, etc.).
   - **Elite UI/UX Design & Live Card Previews**: Generates harmonious WCAG AA/AAA color palettes, 4px/8px grid layouts, and structured visual preview cards for every interface section.
5. **Sunrise Ergonomic Light Theme & Collapsible Sidebars**:
   - Warm, high-contrast light palette (`#fff7ed → #fef2f2 → #f5f3ff`) featuring the geometric **Prism** logo (`<AetherLogo />`).
   - **Claude-Style Collapsible Panels**: Toggle the Left Chat History Sidebar (`Ctrl + B`) or the Right Workspace Files/Diffs Panel anytime.
   - **Bring Your Own Key (BYOK) Ready**: Supports server-side `GOOGLE_API_KEY` on Vercel/local, plus an optional in-browser **API Key** modal stored strictly on the user's device.

---

## 🚀 Quick Start Guide (Works in VS Code, Cursor, Windsurf & Browser)

### Option A: Use Hosted on Vercel (Zero Install)
1. Open the live Vercel deployment URL in Chrome, Edge, Brave, or any modern browser.
2. Click **Open PC Folder** (or **Upload Folder**) in the workspace bar to connect a project from your computer, or start immediately with the built-in starter workspace.
3. *(Optional)* Click the **API Key** button in the top header if you want to use your own personal Gemini API key.

### Option B: Run Locally in Any IDE (VS Code / Cursor / Windsurf)
```bash
# 1. Clone and enter the repository
git clone https://github.com/AbdullahJan-007/AETHER-Agent.git
cd AETHER-Agent

# 2. Install dependencies
npm install

# 3. Configure your Gemini API Key
cp .env.example .env.local
# Edit .env.local and set GOOGLE_API_KEY=your_gemini_api_key_here

# 4. Start the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel (Free Tier)

1. Push this repository to GitHub or run `npx vercel --prod`.
2. In your **Vercel Project Settings → Environment Variables**, set:
   - `GOOGLE_API_KEY` = `your_gemini_api_key` *(or let users supply their own key in the UI header)*
3. Deploy! AETHER automatically detects Vercel Serverless (`process.env.VERCEL`), enables Same-Origin CSRF protection in `proxy.ts`, uses browser `localStorage` + `/tmp` for zero-error persistence, and activates **Browser Virtual Workspace Mode**.

---

## 📚 Documentation & Governance

- **[Hybrid Architecture ADR & Spec](./docs/superpowers/specs/2026-11-06-hybrid-vercel-architecture.md)**: Staff Engineer design for Vercel + User-System hybrid execution.
- **[System Architecture](./docs/ARCHITECTURE.md)**: Component layers, dual-mode tools, and data flow.
- **[Security Policy & Audit Report](./docs/SECURITY.md)**: 5-Phase Zero-Trust defenses and penetration test coverage.
- **[Project Rules & Testing Charter](./PROJECT_RULES.md)**: Strict coding rules, cross-IDE standards, and verification gates.
- **[Product Requirements (PRD)](./docs/PRD.md)**: User stories and acceptance criteria.

---

## 🧪 Verification Gates

```bash
# Gate 1: Strict TypeScript & Cross-IDE Alias Check
npm run typecheck

# Gate 2 & 3: Automated Unit, Hybrid Virtual Mode & Security Penetration Suite
npm test

# Gate 4: Production Next.js & Vercel Bundle Verification
npm run build
```
