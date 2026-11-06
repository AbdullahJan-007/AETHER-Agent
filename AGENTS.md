# AGENTS.md — Guidelines for AI Coding Agents Operating on AETHER

## 1. Project Context
AETHER is an on-premise AI Principal Engineer & UI/UX Workstation powered by a LangChain tool-using agent (`@langchain/google-genai` + `@langchain/core` on `gemini-2.5-flash`). It connects directly to local repositories on disk, explores files via sandboxed tools, stages proposed changes with explanations for visual diff review, stores conversations atomically on disk under `data/conversations/`, and runs whitelisted verification checks.

## 2. Core Operational Rules for Autonomous Agents
- **Maintain Modular Architecture**: Never combine components into monolithic files. Keep files below 250–300 lines.
- **Stage-Only File Proposals**: Agent tools (`stage_patch`) must **never** write directly to disk. Disk writes happen strictly when the user clicks Save via `/api/workspace` (`PatchEngine.applyPatch`), which automatically generates `.backup` snapshots.
- **Respect PathGuard & Local Firewall**:
  - Never perform file I/O without resolving and validating canonical paths through `PathGuard`.
  - Every API route under `app/api/*` must call `validateLocalRequest(req)` from `src/lib/security/proxy.ts` to block DNS rebinding and cross-origin CSRF requests.
  - Refuse `.env*` files in both `read_file` and `stage_patch`.
- **Command Safety**: Only execute commands allowed by `CommandWhitelist` (`npm test`, `npm run lint`, `npm run build`, `npm run typecheck`, `git status`, `git diff`).
- **Zero Placeholder / Demo Coding**: Write complete, reliable, scalable, humanized production code across any stack the user requests. Never emit `// TODO` or `// rest of code here`.
- **Preserve Documentation & Tests**: Keep `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PRD.md`, and the Vitest suite (`npm test`) in sync with all code changes.

## 3. Technology Stack Conventions
- Next.js 16 (App Router), React 19, TypeScript strict.
- Tailwind CSS v4 with **Sunrise Ergonomic Light Tokens** (`--bg-gradient-start`, `--surface-card`, `--border-subtle`, `--text-primary`, `--brand-orange`, `--brand-rose`, `--brand-violet`) and the geometric **Prism** logo (`<AetherLogo />`).
- LangChain (`@langchain/core`, `@langchain/google-genai`) and `zod` for structured tool schemas.
- `lucide-react` for consistent 16px (`strokeWidth={1.9}`) iconography (no emoji in UI).
- Vitest for unit, integration, and penetration testing.
