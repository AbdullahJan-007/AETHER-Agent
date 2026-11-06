# AETHER Enterprise Security Policy & Penetration Audit Report

## 1. Threat Model & Security Posture
AETHER is designed under a **5-Phase Zero-Trust Local Architecture**. Because the workstation connects to real local repositories and runs terminal checks, it enforces strict boundaries against six primary threat vectors:

1. **Workspace Root Escalation & Arbitrary Filesystem Escape (Path Traversal)**
2. **Remote Code Execution via Command Injection (Terminal RCE)**
3. **Child Process Environment & Secret Key Exfiltration**
4. **Adversarial Prompt Injection & LLM Jailbreaking**
5. **Cross-Origin CSRF & DNS Rebinding Attacks Against Localhost**
6. **Unapproved Disk Modification by Autonomous Agent Loops**

---

## 2. Mitigation Architecture & Defenses

| Threat Vector | Severity | Attack Mechanism | Implemented Defense | Tested In |
|---|---|---|---|---|
| **Root Escalation** | Critical | Designating `C:\`, `C:\Windows`, or `/` as workspace root | `PathGuard.validateRoot`: Explicitly blocks drive roots and OS system directories (`Windows`, `Program Files`, `etc`, `usr`, `bin`). | `security.test.ts` |
| **Path Traversal** | Critical | `../../Windows/System32`, absolute path escape, or non-UUID conversation IDs | `PathGuard.validatePath` & `ConversationStore.isValidUUID`: Canonical path resolution asserted inside `PROJECT_ROOT`. Rejects null bytes, Windows reserved names (`CON`, `NUL`), NTFS ADS (`:`), and non-UUID history IDs. | `pentest.test.ts`, `tools.test.ts`, `conversation-store.test.ts` |
| **Dotenv Exposure** | Critical | Agent attempting `read_file(".env")` or `stage_patch(".env.local")` | `readFileTool` & `stagePatchTool`: Explicit basename guard `/^\.env($|\..*)/i` strictly refuses reading or staging any `.env*` file. | `tools.test.ts` |
| **Command Injection** | Critical | `npm test && rm -rf /`, quotes `"`, or `!` expansion in `cmd.exe` | `CommandWhitelist`: Rejects `[;&|<>`$\r\n%^\0"!]`. Only pre-approved binary subcommands allowed (`npm`, `npx`, `git`, `node`). | `pentest.test.ts`, `terminal.test.ts` |
| **Child Env Exfiltration** | High | Project scripts reading `process.env.GOOGLE_API_KEY` | `TerminalRunner.getCleanEnv`: Scrubs `GOOGLE_API_KEY`, `GEMINI_API_KEY`, and secret tokens from spawned child environments. | `terminal.test.ts` |
| **Cross-Origin / DNS Rebinding** | Critical | Malicious webpage sending `POST` to `http://127.0.0.1:3000/api/workspace` or `/api/agent` | `validateLocalRequest` (`proxy.ts`): Enforces local `Host` (`127.0.0.1` / `localhost`), blocks `Sec-Fetch-Site: cross-site`, and rejects non-local `Origin` headers with `403 Forbidden`. | `proxy.test.ts` |
| **Prompt Injection** | High | Hidden instructions in user files ("IGNORE PREVIOUS INSTRUCTIONS") | `Sanitizer.wrapUntrustedContext`: Encloses file content in anti-jailbreak delimiter guards instructing the LLM to treat content as DATA ONLY. | `pentest.test.ts` |
| **Secret Leaks** | High | Accidental echo of Gemini keys, AWS keys, GitHub PATs, JWTs, or DB URIs | `SecretVault.redactSecrets`: Scrubs secrets across file reads, search matches, and terminal outputs before returning to the model or UI. | `pentest.test.ts`, `security.test.ts` |

---

## 3. Automated Test & Penetration Suite Results (61 Tests Passing)

All defenses are continuously verified via Vitest (`npm test`):

- **`src/lib/security/__tests__/pentest.test.ts` (13 tests)** & **`security.test.ts` (9 tests)**
  - Relative double-dot traversal (`../../`), cross-drive escape, null-byte injection, Windows reserved devices, and NTFS Alternate Data Streams: **BLOCKED**
  - Command chaining (`&&`, `;`, `|`), subshells (`` ` ``, `$()`), and unapproved binaries: **BLOCKED**
  - Adversarial prompt overrides: **CONTAINED IN DATA WRAPPER**
  - Live Google Gemini (`AIza...`), OpenAI (`sk-...`), AWS (`AKIA...`), GitHub (`ghp_...`), and DB URI leaks: **REDACTED**
- **`src/lib/agent/__tests__/proxy.test.ts` (5 tests)**
  - Non-local `Host` header (DNS rebinding), `Sec-Fetch-Site: cross-site`, and external `Origin` POST requests: **REJECTED (403 Forbidden)**
- **`src/lib/agent/__tests__/tools.test.ts` (11 tests)**
  - `.env` and `.env.local` read/stage attempts: **REFUSED**
  - `stage_patch` disk write check: **VERIFIED ZERO DISK WRITES**
  - Same-path repeated `stage_patch`: **REPLACES EARLIER PROPOSAL**
- **`src/lib/history/__tests__/conversation-store.test.ts` (4 tests)**
  - Path traversal via conversation ID (`../traversal`): **REJECTED**
  - Atomic temp-file-and-rename persistence: **VERIFIED**

---

## 4. Production Launch Readiness Checklist
- [x] Server binds exclusively to `127.0.0.1` (`next dev -H 127.0.0.1`).
- [x] Server-side secrets isolated in `.env.local` and `data/` excluded from git via `.gitignore`.
- [x] All `/api/*` routes protected by `validateLocalRequest` (`proxy.ts`).
- [x] Agent tools operate in stage-only mode; writes require explicit user confirmation in `ReviewDialog` with automatic `.backup` creation.
- [x] Whitelisted terminal runner with process-tree termination (`taskkill /T /F` on Windows) and abort signal propagation.
