# AETHER Full-Stack AI Engineer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the monolithic, virtual-only AETHER prototype into a modular, secure, on-premise Full-Stack AI Developer Workstation with direct local repository management, whitelisted terminal execution, staged diff reviews, and Google Gemini API (free-tier) integration.

**Architecture:** Deconstruct the 1,894-line monolithic UI into atomic components (<250 lines per file) following Clean Architecture and SOLID principles. Implement a local Node.js server bridge (`/api/workspace`, `/api/terminal`, `/api/chat`) protected by canonical path-traversal guards, process isolation, and a streaming XML tag parser.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS, Vitest, `@google/genai` (current official SDK), Lucide React, Sonner.

**Spec:** [docs/superpowers/specs/2026-10-31-aether-redesign-design.md](file:///c:/Users/abiij/Desktop/My%20Projects/AI%20Agent/AETHER-Agent-main/docs/superpowers/specs/2026-10-31-aether-redesign-design.md)

## Global Constraints

- Every file must have a single responsibility and not exceed 350 lines.
- Pure on-premise local execution: all API keys stay in `.env.local` and are never sent to the browser client.
- No direct shell string interpolation (`exec` is banned; `spawn` with array arguments only).
- Zero data loss: all file writes must stage in memory for visual review, and applying writes creates automatic `.backup` files.
- Google Gemini free tier rate limit guard (15 RPM cap with queueing and retry backoff).

## Review Focus

1. **Path Traversal via Symlinks or Encoded Slashes**: `path.resolve` check fails to catch symbolic link targets outside `PROJECT_ROOT` -> Verify canonical path resolution (`fs.realpathSync`) matches `PROJECT_ROOT`.
2. **Command Injection via Shell Metacharacters**: User input or AI payload passes `;`, `&&`, `|`, or backticks to the terminal -> Whitelist enforces exact executable and strict argument regex validation.
3. **Stream Cut-off Handling**: Gemini response cuts off mid-tag (e.g., `<file path="...` without closing tag) -> Parser preserves partial buffer and marks chunk state.
4. **Concurrent Rate-Limit Throttling**: Rapid successive requests trigger 429 quota exhaustion -> Token queue delays outgoing requests to maintain <=15 RPM.
5. **Accidental Overwrite of Modified Files**: Applying a patch overwrites local changes made since generation -> Backup file `.backup` is created immediately before write.

---

### Task 1: Test Infrastructure & Project Governance Rules

**Files:**
- Create: `vitest.config.ts`
- Create: `PROJECT_RULES.md`
- Create: `AGENTS.md`
- Modify: `package.json:5-10`

**Interfaces:**
- Produces: `npm test` command running Vitest across `src/**/__tests__/**/*.test.ts`.
- Governance: Strict rules for file lengths, security checks, and code standards.

- [ ] **Step 1: Write `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Update `package.json` scripts to include `test` and `test:watch`**

Add `"test": "vitest run"` and `"test:watch": "vitest"` to `scripts`.

- [ ] **Step 3: Create `PROJECT_RULES.md` and `AGENTS.md`**

Establish the mandatory architectural laws:
- Strict TypeScript (`noImplicitAny`, strict null checks).
- Maximum 250 lines per file (350 lines hard ceiling).
- Zero mock tests in production validation.
- All on-premise filesystem writes require validation via `PathGuard`.

- [ ] **Step 4: Verify test suite runner functions**

Run: `npx vitest --version`  
Expected: Version output without errors.

---

### Task 2: Security & Sandboxing Subsystem

**Files:**
- Create: `src/lib/security/path-guard.ts`
- Create: `src/lib/security/sanitizer.ts`
- Create: `src/lib/security/secret-vault.ts`
- Test: `src/lib/security/__tests__/security.test.ts`

**Interfaces:**
- Produces:
  - `PathGuard.validatePath(targetPath: string, rootPath: string): { safe: boolean; canonicalPath: string; error?: string }`
  - `Sanitizer.wrapUntrustedContext(fileName: string, content: string): string`
  - `SecretVault.redactSecrets(input: string): string`
  - `SecretVault.containsSecret(input: string): boolean`

- [ ] **Step 1: Write failing security tests (`security.test.ts`)**

```typescript
import { describe, it, expect } from "vitest";
import { PathGuard } from "../path-guard";
import { Sanitizer } from "../sanitizer";
import { SecretVault } from "../secret-vault";

describe("Security Subsystem", () => {
  it("rejects path traversal attempts outside project root", () => {
    const root = "C:/projects/my-app";
    const attack = "../../../Windows/System32";
    const result = PathGuard.validatePath(attack, root);
    expect(result.safe).toBe(false);
    expect(result.error).toContain("Path traversal detected");
  });

  it("redacts Google and OpenAI secret keys", () => {
    const raw = "AIzaSyD-dummyGoogleKeyHere1234567890 sk-123456789012345678901234567890123456789012345678";
    const redacted = SecretVault.redactSecrets(raw);
    expect(redacted).not.toContain("AIzaSyD");
    expect(redacted).toContain("[REDACTED-SECRET]");
  });

  it("wraps untrusted file data with anti-jailbreak delimiters", () => {
    const wrapped = Sanitizer.wrapUntrustedContext("test.js", "console.log('hello');");
    expect(wrapped).toContain("### UNTRUSTED USER-PROVIDED FILE: test.js");
    expect(wrapped).toContain("DATA ONLY");
  });
});
```

- [ ] **Step 2: Implement `PathGuard` in `src/lib/security/path-guard.ts`**

Canonicalizes paths using `path.resolve` and verifies that the resolved path starts with the normalized root path.

- [ ] **Step 3: Implement `Sanitizer` in `src/lib/security/sanitizer.ts`**

Strips non-printable control characters and wraps file content with explicit anti-jailbreak boundaries.

- [ ] **Step 4: Implement `SecretVault` in `src/lib/security/secret-vault.ts`**

Regex-based secret detection and redaction for Google, AWS, GitHub, and bearer tokens.

- [ ] **Step 5: Run tests and verify all pass**

Run: `npx vitest run src/lib/security/__tests__/security.test.ts`  
Expected: PASS (3/3 tests passing).

---

### Task 3: Local Workspace Bridge & File I/O Engine

**Files:**
- Create: `src/lib/workspace/fs-adapter.ts`
- Create: `src/lib/workspace/patch-engine.ts`
- Create: `app/api/workspace/route.ts`
- Test: `src/lib/workspace/__tests__/workspace.test.ts`

**Interfaces:**
- Consumes: `PathGuard` from `src/lib/security/path-guard.ts`.
- Produces:
  - `FsAdapter.listTree(rootPath: string): Promise<FileNode[]>`
  - `FsAdapter.readFile(filePath: string, rootPath: string): Promise<string>`
  - `PatchEngine.stagePatch(filePath: string, newContent: string): StagedDiff`
  - `PatchEngine.applyPatch(filePath: string, newContent: string, rootPath: string): Promise<{ success: boolean; backupPath: string }>`

- [ ] **Step 1: Write failing workspace tests (`workspace.test.ts`)**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PatchEngine } from "../patch-engine";
import fs from "fs";
import path from "path";

describe("Workspace Bridge Engine", () => {
  const tempDir = path.resolve("./test-tmp-workspace");

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, "sample.txt"), "Original content");
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("stages a unified diff between original and new content", () => {
    const diff = PatchEngine.stagePatch("sample.txt", "Original content", "Updated content");
    expect(diff.hasChanges).toBe(true);
    expect(diff.additions).toBeGreaterThan(0);
  });

  it("creates a .backup file before applying file modifications", async () => {
    const file = path.join(tempDir, "sample.txt");
    const result = await PatchEngine.applyPatch(file, "New written content", tempDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.backupPath)).toBe(true);
    expect(fs.readFileSync(result.backupPath, "utf-8")).toBe("Original content");
  });
});
```

- [ ] **Step 2: Implement `FsAdapter` in `src/lib/workspace/fs-adapter.ts`**

Recursive directory walker ignoring `node_modules`, `.git`, `.next`, `dist`, and hidden files.

- [ ] **Step 3: Implement `PatchEngine` in `src/lib/workspace/patch-engine.ts`**

Line-by-line diff calculator, staged patch state generator, and atomic file writer with automatic `.backup` timestamped backups.

- [ ] **Step 4: Implement Next.js route `app/api/workspace/route.ts`**

Handles `GET ?action=tree&root=...`, `GET ?action=read&file=...`, and `POST { action: 'apply', file, content, root }`.

- [ ] **Step 5: Run tests and verify all pass**

Run: `npx vitest run src/lib/workspace/__tests__/workspace.test.ts`  
Expected: PASS.

---

### Task 4: Safe Terminal Runner Subsystem

**Files:**
- Create: `src/lib/terminal/command-whitelist.ts`
- Create: `src/lib/terminal/runner.ts`
- Create: `app/api/terminal/route.ts`
- Test: `src/lib/terminal/__tests__/terminal.test.ts`

**Interfaces:**
- Consumes: `PathGuard` from `src/lib/security/path-guard.ts`.
- Produces:
  - `CommandWhitelist.isAllowed(command: string, args: string[]): boolean`
  - `TerminalRunner.execute(command: string, args: string[], cwd: string): Promise<TerminalResult>`

- [ ] **Step 1: Write failing terminal tests (`terminal.test.ts`)**

```typescript
import { describe, it, expect } from "vitest";
import { CommandWhitelist } from "../command-whitelist";
import { TerminalRunner } from "../runner";

describe("Safe Terminal Runner", () => {
  it("allows safe whitelisted npm and git commands", () => {
    expect(CommandWhitelist.isAllowed("npm", ["test"])).toBe(true);
    expect(CommandWhitelist.isAllowed("npm", ["run", "lint"])).toBe(true);
    expect(CommandWhitelist.isAllowed("git", ["status"])).toBe(true);
  });

  it("strictly rejects dangerous or chained shell commands", () => {
    expect(CommandWhitelist.isAllowed("npm", ["test", ";", "rm", "-rf", "/"])).toBe(false);
    expect(CommandWhitelist.isAllowed("curl", ["http://malicious.com"])).toBe(false);
    expect(CommandWhitelist.isAllowed("bash", ["-c", "dir"])).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `CommandWhitelist` in `src/lib/terminal/command-whitelist.ts`**

Whitelists only binary executables `npm`, `npx`, `git`, and `node` with pre-defined subcommands (`test`, `lint`, `build`, `status`, `diff`). Rejects argument strings containing `;`, `&`, `|`, `<`, `>`, or backticks.

- [ ] **Step 3: Implement `TerminalRunner` in `src/lib/terminal/runner.ts`**

Uses `child_process.spawn` with explicit argument arrays, 30-second timeout enforcement, and captured stdout/stderr.

- [ ] **Step 4: Implement Next.js route `app/api/terminal/route.ts`**

POST endpoint executing requested command in the validated target directory and returning stdout, stderr, and exit code.

- [ ] **Step 5: Run tests and verify all pass**

Run: `npx vitest run src/lib/terminal/__tests__/terminal.test.ts`  
Expected: PASS.

---

### Task 5: Gemini Generative AI Engine & Streaming Tag Parser

**Files:**
- Create: `src/lib/gemini/client.ts`
- Create: `src/lib/gemini/prompt-builder.ts`
- Create: `src/lib/gemini/stream-parser.ts`
- Modify: `app/api/chat/route.ts`
- Test: `src/lib/gemini/__tests__/gemini-parser.test.ts`

**Interfaces:**
- Consumes: `@google/genai` SDK, `Sanitizer`, `SecretVault`.
- Produces:
  - `StreamParser.feedChunk(chunk: string): ParsedStreamState`
  - `PromptBuilder.buildFullStackSystemPrompt(mode: string, contextFiles: AttachedFile[]): string`
  - `GeminiClient.streamChat(messages: Message[], options: GenerationOptions): AsyncIterable<string>`

- [ ] **Step 1: Write failing stream parser tests (`gemini-parser.test.ts`)**

```typescript
import { describe, it, expect } from "vitest";
import { StreamParser } from "../stream-parser";

describe("Gemini Stream Parser", () => {
  it("correctly extracts <thinking> trace from streaming stream", () => {
    const parser = new StreamParser();
    parser.feed("<thinking>Analyzing architecture and component boundaries");
    expect(parser.getState().thinking).toBe("Analyzing architecture and component boundaries");
    expect(parser.getState().isThinking).toBe(true);
    
    parser.feed("</thinking>\n<plan>1. Create API route</plan>");
    expect(parser.getState().isThinking).toBe(false);
    expect(parser.getState().plan).toBe("1. Create API route");
  });

  it("extracts code files tagged with ```lang:path syntax", () => {
    const parser = new StreamParser();
    const raw = "Here is the code:\n```typescript:src/app/api/hello.ts\nexport function GET() {}\n```";
    parser.feed(raw);
    const files = parser.getState().extractedFiles;
    expect(files.length).toBe(1);
    expect(files[0].path).toBe("src/app/api/hello.ts");
    expect(files[0].content.trim()).toBe("export function GET() {}");
  });
});
```

- [ ] **Step 2: Implement `StreamParser` in `src/lib/gemini/stream-parser.ts`**

Stateful streaming accumulator that handles chunk boundaries, isolates `<thinking>...</thinking>`, `<plan>...</plan>`, and captures multi-file code blocks tagged with `path`.

- [ ] **Step 3: Implement `PromptBuilder` in `src/lib/gemini/prompt-builder.ts`**

Generates system prompts focused exclusively on modern Full-Stack engineering (Next.js 15/16, React 19, Tailwind, TypeScript, Prisma/SQL, Node.js). Injects project files with `Sanitizer`.

- [ ] **Step 4: Implement `GeminiClient` in `src/lib/gemini/client.ts`**

Initializes GoogleGenAI with `process.env.GOOGLE_API_KEY`, wraps calls in exponential retry backoff, and tracks 15 RPM rate limits.

- [ ] **Step 5: Refactor `app/api/chat/route.ts`**

Replace monolithic logic with calls to `PromptBuilder`, `GeminiClient`, and SSE streaming response.

- [ ] **Step 6: Run tests and verify all pass**

Run: `npx vitest run src/lib/gemini/__tests__/gemini-parser.test.ts`  
Expected: PASS.

---

### Task 6: UI Design System & Atomic Primitives

**Files:**
- Modify: `app/globals.css`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/card.tsx`

**Interfaces:**
- Produces:
  - Standardized Obsidian Design Tokens: `--bg-root`, `--surface-1`, `--surface-2`, `--border-subtle`, `--accent-primary`.
  - Accessible, styled atomic components for buttons, badges, tabs, and cards.

- [ ] **Step 1: Update `app/globals.css` with Figma/Mobbin Obsidian tokens**

Define CSS variables for deep obsidian dark mode, electric indigo accents, and clean scrollbar styling.

- [ ] **Step 2: Implement `src/components/ui/button.tsx`**

Variants: `primary`, `secondary`, `destructive`, `outline`, `ghost`, with size scales and loading spinner state.

- [ ] **Step 3: Implement `src/components/ui/badge.tsx`**

Variants: `default`, `success` (diff add), `warning` (thinking), `destructive` (diff remove), `outline`.

- [ ] **Step 4: Implement `src/components/ui/tabs.tsx` and `card.tsx`**

Accessible tab switcher and elevated card surface components.

- [ ] **Step 5: Verify Tailwind CSS builds without compilation errors**

Run: `npx next lint`  
Expected: PASS with zero styling syntax errors.

---

### Task 7: Workspace, Staged Diff & Terminal UI Components

**Files:**
- Create: `src/components/workspace/project-switcher.tsx`
- Create: `src/components/workspace/file-tree.tsx`
- Create: `src/components/workspace/staged-diff-viewer.tsx`
- Create: `src/components/terminal/terminal-drawer.tsx`
- Create: `src/store/workstation-store.ts`

**Interfaces:**
- Consumes: Workspace API (`/api/workspace`), Terminal API (`/api/terminal`).
- Produces:
  - `ProjectSwitcher`: Directory selector input with validation indicator.
  - `FileTree`: Interactive directory browser with file click triggers.
  - `StagedDiffViewer`: Side-by-side / unified color-coded diff inspector with "Apply All" and "Reject" actions.
  - `TerminalDrawer`: Collapsible command execution tray with preset buttons (`Run Tests`, `Run Lint`, `Git Status`) and live console log stream.

- [ ] **Step 1: Implement `src/store/workstation-store.ts`**

Centralized lightweight React state for: `activeProjectRoot`, `fileTree`, `selectedFile`, `stagedDiffs`, `terminalLogs`, `isStreaming`.

- [ ] **Step 2: Implement `src/components/workspace/project-switcher.tsx`**

Input field allowing the user to set/change active local project directory with instant validation check against `/api/workspace?action=tree`.

- [ ] **Step 3: Implement `src/components/workspace/file-tree.tsx`**

Collapsible folder hierarchy with file-type icons (TypeScript, React, CSS, JSON, Markdown).

- [ ] **Step 4: Implement `src/components/workspace/staged-diff-viewer.tsx`**

Visual diff component highlighting green additions and red deletions, with "Apply to File" button that triggers atomic write with `.backup` creation.

- [ ] **Step 5: Implement `src/components/terminal/terminal-drawer.tsx`**

Drawer interface with tabs for Test Output, Lint Output, and Custom Safe Commands. Includes "Auto-Fix with AETHER" button when test errors are detected.

---

### Task 8: Chat & Reasoning Streamer UI Components

**Files:**
- Create: `src/components/chat/message-list.tsx`
- Create: `src/components/chat/thinking-drawer.tsx`
- Create: `src/components/chat/plan-checklist.tsx`
- Create: `src/components/chat/chat-input.tsx`

**Interfaces:**
- Consumes: Gemini stream state (`StreamParser`).
- Produces:
  - `MessageList`: Renders user prompts and AI responses with markdown code syntax highlighting.
  - `ThinkingDrawer`: Collapsible accordion displaying real-time cognitive trace (`<thinking>`).
  - `PlanChecklist`: Interactive checklist showing implementation plan progress (`<plan>`).
  - `ChatInput`: Prompt textarea with mode selection (`Architect`, `Debug`, `Build`, `Review`) and file attach chips.

- [ ] **Step 1: Implement `src/components/chat/thinking-drawer.tsx`**

Collapsible amber-accented reasoning box with pulsating indicator while model is actively thinking.

- [ ] **Step 2: Implement `src/components/chat/plan-checklist.tsx`**

Parses plan items and displays clean task cards with completion checkmarks.

- [ ] **Step 3: Implement `src/components/chat/chat-input.tsx`**

Auto-expanding textarea with Send button, Stop Generation trigger, and quick full-stack prompt chips.

- [ ] **Step 4: Implement `src/components/chat/message-list.tsx`**

Scroll-locked message feed with user avatars, assistant responses, and code-block copy buttons.

---

### Task 9: Assemble Main Workstation Page

**Files:**
- Rewrite: `app/page.tsx`
- Create: `src/components/layout/workstation-header.tsx`

**Interfaces:**
- Replaces: The old 1,894-line monolithic `app/page.tsx`.
- Produces: Clean, modular root page under 180 lines coordinating Header, Command Column, Chat Column, and Workspace/Terminal Column.

- [ ] **Step 1: Implement `src/components/layout/workstation-header.tsx`**

Top navigation containing AETHER brand mark, Active Project indicator badge, Gemini Free-Tier status pill, and Settings button.

- [ ] **Step 2: Reconstruct `app/page.tsx`**

Compose `WorkstationHeader`, 3-column responsive grid (`ChatPane`, `WorkspacePane`, `TerminalDrawer`). All child components imported from isolated modules.

- [ ] **Step 3: Verify complete local compilation**

Run: `npx next build`  
Expected: Successful production build with zero TypeScript or Lint errors.

---

### Task 10: Security Penetration Testing & Documentation Polish

**Files:**
- Create: `src/lib/security/__tests__/pentest.test.ts`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/SECURITY.md`
- Create: `docs/PRD.md`
- Update: `README.md`

**Interfaces:**
- Produces: Complete architectural documentation, threat model, security audit report, and automated penetration test suite.

- [ ] **Step 1: Implement Phase 1-4 Penetration Test Suite (`pentest.test.ts`)**

Automated verification of:
1. Path Traversal attacks (`..%2f..%2f`, null bytes, absolute paths outside root).
2. Shell injection payloads (`npm test && dir`, `git status | calc`).
3. Model jailbreak payloads (DAN prompt, instructions to leak system prompts).
4. Secret leak redaction (Google API keys, SSH keys, AWS credentials).

- [ ] **Step 2: Run penetration test harness**

Run: `npx vitest run src/lib/security/__tests__/pentest.test.ts`  
Expected: PASS (All attack vectors blocked and mitigated).

- [ ] **Step 3: Author `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PRD.md`**

Provide comprehensive enterprise documentation covering system design, API contracts, threat analysis, and agile release notes.

- [ ] **Step 4: Update `README.md` with complete On-Premise Quick Start guide**

Clear instructions for installing, configuring `.env.local` with Gemini free tier key, selecting client project folders, and running tests.
