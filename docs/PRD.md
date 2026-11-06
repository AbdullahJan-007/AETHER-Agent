# AETHER Product Requirements Document (PRD — Hybrid v2.0)

## 1. Product Vision
AETHER is a **Hybrid Cloud + User-System AI Principal Engineer & UI/UX Workstation** that empowers developers to build, architect, debug, and review production software anywhere—either hosted globally for free on **Vercel** or running locally in any IDE (**VS Code, Cursor, Windsurf, WebStorm, Zed, Antigravity**). Using a LangChain tool-using agent, user-system persistent chat history, direct browser folder access (`showDirectoryPicker` / folder upload), collapsible ergonomic panels, and a confirm-before-save diff review workflow, AETHER delivers autonomous Staff-level engineering while keeping the user in 100% control of their files and data.

## 2. Target Users & Use Cases
- **Full-Stack & Multi-Stack Engineers**: Building production web, backend, and systems software across TypeScript, React, Next.js, Vue, Python, Go, Rust, SQL/Prisma, and more.
- **UI/UX Product Builders**: Designing accessible (WCAG AA/AAA), high-contrast user interfaces with structured color palettes and visual component previews.
- **Cross-Platform & Cloud Teams**: Accessing AETHER directly from a live Vercel URL while reading/writing their own PC's project folders and keeping their chat history stored privately on their own system.

---

## 3. Agile User Stories & Acceptance Criteria

### Epic 1: Hybrid Workspace Connection (Local Disk + Browser PC Folder)
- **US-1.1**: *As an engineer visiting the hosted Vercel app or running locally, I want to open a folder directly from my PC (or connect a local disk path) so the AI agent can inspect and stage patches on my real project files.*
  - **Acceptance Criteria**:
    - Supports native browser folder selection (`window.showDirectoryPicker`), folder upload fallback (`webkitdirectory`), and starter virtual workspace out of the box on Vercel.
    - All 5 LangChain tools (`list_files`, `read_file`, `search_code`, `stage_patch`, `run_check`) operate identically on `virtualFiles` (Cloud/Browser mode) and Node `fs` (Localhost Disk mode).
    - `.env*` and private key files are strictly refused in both modes.

### Epic 2: Confirm-Before-Save Diff Review & ZIP Export
- **US-2.1**: *As an engineer, I want every proposed file change to include a clear explanation and a line-by-line diff in a review dialog before anything is saved to my PC or downloaded as a ZIP.*
  - **Acceptance Criteria**:
    - `stage_patch` requires a plain-sentence `reason` and never modifies files without confirmation.
    - **Review & Save** displays `NEW` / `EDITED` badges, `+ / -` line counts computed via LCS alignment, checkboxes per file, **Save Selected** (writes to local disk or PC folder handle with `.backup`), **Download Patched ZIP**, **Discard All**, and **Ask AI to Revise**.

### Epic 3: User-System Persistent Conversation History & Optional BYOK
- **US-3.1**: *As an engineer, I want my chat history stored on my own system so my conversations remain private and persist across browser reloads even on the free Vercel deployment.*
  - **Acceptance Criteria**:
    - Conversations persist in browser `localStorage` (`aether:conversations:v1`) on the user's system and sync with `/api/conversations` (`data/conversations/` locally or `/tmp` on Vercel).
    - Users can optionally enter their own Gemini API key in the header settings modal (stored only on their browser) or use the server's configured `GOOGLE_API_KEY`.

### Epic 4: Sunrise Ergonomic UI & Cross-IDE Compatibility
- **US-4.1**: *As an engineer, I want a warm, high-contrast light interface with collapsible left and right panels and zero IDE errors in VS Code, Cursor, or Windsurf.*
  - **Acceptance Criteria**:
    - Sunrise palette (`#fff7ed → #fef2f2 → #f5f3ff`) with the geometric **Prism** logo (`<AetherLogo />`) and zero emoji.
    - Unified `@/*` path imports and `.vscode/settings.json` ensure zero red squiggles in every IDE.
