# AETHER Enterprise Security Policy & Penetration Audit Report

## 1. Threat Model & Security Posture
AETHER is designed under a **5-Phase Zero-Trust Hybrid Architecture** spanning both Localhost Disk Mode and Vercel Cloud Serverless Mode. It enforces strict boundaries against seven primary threat vectors:

1. **Workspace Root Escalation & Arbitrary Filesystem Escape (Path Traversal & Symlink Escape)**
2. **Sensitive Credential & Dotenv Exposure (`.env*`, SSH/PEM Keys, Certs)**
3. **Remote Code Execution via Command Injection (Terminal RCE)**
4. **Child Process Environment & Secret Key Exfiltration**
5. **Adversarial Prompt Injection & LLM Jailbreaking**
6. **Cross-Origin CSRF, Simple-Request (`text/plain`) Bypass & DNS Rebinding**
7. **Multi-Tenant Data Bleed on Serverless Functions**

---

## 2. Mitigation Architecture & Defenses

| Threat Vector | Severity | Attack Mechanism | Implemented Defense | Tested In |
|---|---|---|---|---|
| **Root Escalation** | Critical | Designating `C:\`, `C:\Windows`, or `/` as workspace root | `PathGuard.validateRoot`: Explicitly blocks drive roots and OS system directories (`Windows`, `Program Files`, `etc`, `usr`, `bin`). | `security.test.ts` |
| **Path Traversal & Symlink Escape** | Critical | `../../Windows/System32`, symlink pointing outside repo, or non-UUID conversation IDs | `PathGuard.validatePath`, `PatchEngine.assertSafeTarget`, & `ConversationStore.isValidUUID`: Canonical path + `realpath` resolution asserted inside `PROJECT_ROOT`. | `pentest.test.ts`, `tools.test.ts`, `conversation-store.test.ts` |
| **Sensitive File Exposure** | Critical | Agent or UI reading/staging `.env`, `.env.local`, `id_rsa`, `.pem`, `.key`, `.npmrc` | `PathGuard.isSensitivePath`: Enforced across `FsAdapter`, `PatchEngine`, `browser-fs.ts`, `read_file`, `search_code`, and `stage_patch` in both Disk and Virtual modes. | `tools.test.ts` |
| **Command Injection** | Critical | `npm test && rm -rf /`, quotes `"`, `!` expansion, or arbitrary `-e` scripts | `CommandWhitelist`: Rejects `[;&|<>`$\r\n%^\0"!]`. Only pre-approved read-only subcommands allowed (`npm test`, `npx tsc --noEmit`, `git status`, `node -v`). | `pentest.test.ts`, `terminal.test.ts` |
| **Child Env Exfiltration** | High | Project scripts reading `process.env.GOOGLE_API_KEY` | `TerminalRunner.getCleanEnv`: Scrubs `GOOGLE_API_KEY`, `GEMINI_API_KEY`, and secret tokens from spawned child environments. | `terminal.test.ts` |
| **CSRF & DNS Rebinding** | Critical | Malicious webpage sending `POST` (`text/plain` or `Origin: null`) to localhost or Vercel endpoint | `validateLocalRequest` (`proxy.ts`): Enforces localhost or same-origin Vercel host, blocks `Sec-Fetch-Site: cross-site`, rejects `Origin: null`, and requires `Content-Type: application/json` on state-changing methods. | `proxy.test.ts` |
| **Serverless Tenant Isolation** | High | Shared `/tmp` or cloud DB leaking chat history or API keys across visitors | Hybrid Client Persistence: Chat history (`localStorage`) and custom Gemini API keys remain on the user's browser; `virtualFiles` exist only in ephemeral request memory. | `tools.test.ts`, `conversation-store.test.ts` |
| **Prompt Injection & Secret Leaks** | High | Hidden instructions in files or accidental echo of API keys (`AIza...`, `sk-...`, `ghp_...`) | `Sanitizer.wrapUntrustedContext` + `SecretVault.redactSecrets` applied across both Disk and Virtual tool execution. | `pentest.test.ts`, `security.test.ts` |

---

## 3. Production Launch & Hybrid Readiness Checklist
- [x] Universal TypeScript alias `@/* -> ./src/*` verified across VS Code, Cursor, Windsurf, and CLI builds.
- [x] All `/api/*` routes protected by `validateLocalRequest` (`proxy.ts`) supporting both Localhost (`127.0.0.1`, `localhost`, `[::1]`) and Same-Origin Vercel deployments (`*.vercel.app`).
- [x] Sensitive file guard (`PathGuard.isSensitivePath`) active in both Node Disk Mode and Browser Virtual Mode (`virtualFiles`).
- [x] Agent tools operate in stage-only mode; writes require explicit user confirmation in `ReviewDialog` with automatic `.backup` creation or `.zip` export.
- [x] Serverless-safe fallback to `os.tmpdir()/aether-conversations` when `process.env.VERCEL` is set, paired with primary client `localStorage` persistence.
