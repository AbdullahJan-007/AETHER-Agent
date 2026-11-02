# AETHER Product Requirements Document (PRD)

## 1. Product Vision
AETHER is a professional, on-premise Full-Stack AI Engineer Workstation that transforms software development for engineering teams. Operating locally, it connects directly to client repositories, plans architectures, generates complete production files, reviews diffs visually, and runs test suites to guarantee code correctness.

## 2. Target Users & Use Cases
- **Full-Stack Software Engineers**: Building modern web applications with Next.js, React, Node.js, and TypeScript.
- **Consultants & Agencies**: Developing confidential client applications on-premise without exposing code to cloud platforms.
- **Security-Conscious Teams**: Engineering teams requiring strict local sandboxing, path traversal protection, and zero-leakage development.

---

## 3. Agile User Stories & Acceptance Criteria

### Epic 1: Local Workspace Management
- **US-1.1**: *As an engineer, I want to select my local client project directory in the UI, so that AETHER can read and inspect its file structure.*
  - **Acceptance Criteria**:
    - Directory input field validates path existence via `/api/workspace?action=tree`.
    - Recursively lists project files while automatically ignoring `node_modules`, `.git`, `.next`, and `dist`.
    - Displays total file count and connection status badge.

### Epic 2: Intelligent Full-Stack Code Generation
- **US-2.1**: *As an engineer, I want AETHER to produce complete production code files rather than incomplete snippets, so that I can ship features immediately.*
  - **Acceptance Criteria**:
    - Prompts specialize strictly in Next.js 15/16, React 19, Tailwind CSS v4, TypeScript strict, and modern database patterns.
    - Model outputs thinking analysis inside `<thinking>...</thinking>` and execution plans inside `<plan>...</plan>`.
    - Every code file is tagged with ```lang:path format and contains full runnable logic.

### Epic 3: Staged Diff Review & Zero Data Loss
- **US-3.1**: *As an engineer, I want to review code changes in a visual diff viewer before they are written to disk, so that my existing code is never broken accidentally.*
  - **Acceptance Criteria**:
    - Generated files can be staged in the diff viewer with one click.
    - Additions (green) and deletions (red) are visually highlighted line-by-line.
    - Applying changes automatically writes a timestamped `.backup` copy of the original file.

### Epic 4: Safe Terminal Execution & Auto-Debugging
- **US-4.1**: *As an engineer, I want to run tests and linters directly from the UI, so that AETHER can automatically inspect and fix errors.*
  - **Acceptance Criteria**:
    - One-click buttons to run `npm test`, `npm run lint`, and `git status`.
    - Shell injection attacks are rejected by strict argument whitelisting.
    - Terminal console displays live stdout/stderr with execution exit codes.
    - When tests fail, "Auto-Fix with AETHER" feeds the stack trace back into debug mode.

---

## 4. Non-Functional Requirements
- **Performance**: Sub-100ms response time on local filesystem navigation.
- **Rate-Limiting**: 15 requests per minute throttling queue to conform to Google Gemini API free-tier limits.
- **Maintainability**: Modular architecture with every source file capped under 250–350 lines.
- **Reliability**: 100% automated test coverage on core security and parsing engines.
