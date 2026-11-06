# AETHER Product Requirements Document (PRD)

## 1. Product Vision
AETHER is an on-premise AI Principal Engineer & UI/UX Workstation that empowers developers to build, architect, debug, and review production software directly on their local machine. Using a LangChain tool-using agent, persistent on-disk chat history, collapsible ergonomic panels, and a confirm-before-save diff review workflow, AETHER delivers autonomous engineering while keeping the user in 100% control of every disk write.

## 2. Target Users & Use Cases
- **Full-Stack & Multi-Stack Engineers**: Building production web, backend, and systems software across TypeScript, React, Next.js, Vue, Python, Go, Rust, SQL/Prisma, and more.
- **UI/UX Product Builders**: Designing accessible (WCAG AA/AAA), high-contrast user interfaces with structured color palettes and visual component previews.
- **Security-Conscious Teams & Consultants**: Operating on confidential client repositories locally (`127.0.0.1`) with zero cloud code storage and strict secret redaction.

---

## 3. Agile User Stories & Acceptance Criteria

### Epic 1: Autonomous LangChain Tool Exploration
- **US-1.1**: *As an engineer, I want the AI agent to autonomously list directories, search code, and read relevant files in my connected workspace so I don't have to attach every file manually.*
  - **Acceptance Criteria**:
    - Agent has access to `list_files`, `read_file`, `search_code`, `stage_patch`, and `run_check`.
    - Live tool progress is displayed in a humanized **Work Log** inside each assistant message.
    - `.env*` files are strictly refused by `read_file` and `stage_patch`.

### Epic 2: Confirm-Before-Save Diff Review with Explanations
- **US-2.1**: *As an engineer, I want every proposed file change to include a clear explanation and a line-by-line diff in a review dialog before anything is saved to disk.*
  - **Acceptance Criteria**:
    - `stage_patch` requires a plain-sentence `reason` and never writes to disk.
    - Calling `stage_patch` multiple times for the same file path replaces the earlier proposal.
    - The **Review & Save** modal displays `NEW` / `EDITED` badges, `+ / -` line counts computed via LCS alignment, checkboxes per file, and **Save Selected**, **Discard All**, and **Ask AI to Revise** actions.
    - Saving creates a `.backup` copy before overwriting any existing file.

### Epic 3: On-Disk Persistent Conversation History
- **US-3.1**: *As an engineer, I want my chat sessions saved on disk so they survive browser restarts and clears.*
  - **Acceptance Criteria**:
    - Conversations are saved atomically as JSON files under `data/conversations/<uuid>.json`.
    - Left sidebar groups conversations into *Today*, *Yesterday*, and *Older* with search, inline rename, delete confirmation, and `Ctrl + N` shortcut.

### Epic 4: Sunrise Ergonomic UI & Collapsible Workspace Panels
- **US-4.1**: *As an engineer, I want a warm, high-contrast light interface with collapsible left and right panels so I can focus on chat or code inspection on demand.*
  - **Acceptance Criteria**:
    - Sunrise palette (`#fff7ed → #fef2f2 → #f5f3ff`) with the geometric **Prism** logo (`<AetherLogo />`) and zero emoji.
    - Top-left header button (and `Ctrl + B`) toggles the Chat History Sidebar.
    - Top-right header button toggles the Workspace Files/Diffs Panel.

---

## 4. Non-Functional Requirements
- **Zero Placeholder Code**: System prompt enforces complete, production-ready code with zero `// TODO` or demo shortcuts.
- **Configurable Local Quotas**: Rate limiting (`AETHER_RPM`), step limits (`AETHER_MAX_STEPS`), and file budgets are configurable via `.env.local`.
- **Maintainability**: Modular files kept under 250–300 lines with strict TypeScript compilation (`npm run typecheck`).
- **Verification**: 61 automated unit and security tests across 11 test suites (`npm test`).
