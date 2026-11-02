# AETHER Enterprise Security Policy & Penetration Audit Report

## 1. Threat Model & Security Posture
AETHER is designed under a **Zero-Trust Local Architecture**. Because the application operates on production client codebases with full-stack capabilities, it enforces strict boundaries against five primary threat vectors:

1. **Workspace Root Escalation & Arbitrary Filesystem Escape (Path Traversal)**
2. **Remote Code Execution via Command Injection (Terminal RCE)**
3. **Child Process Environment & Secret Key Exfiltration**
4. **Adversarial Prompt Injection & LLM Jailbreaking**
5. **Denial of Service (DoS) via Recursive Symlinks or Token Exhaustion**

---

## 2. Mitigation Architecture & Defenses

| Threat Vector | Severity | Attack Mechanism | Implemented Defense | Tested In |
|---|---|---|---|---|
| **Root Escalation** | Critical | Designating `C:\`, `C:\Windows`, or `/` as workspace root | `PathGuard.validateRoot`: Explicitly blocks drive roots and operating system directories (`Windows`, `Program Files`, `etc`, `usr`, `bin`). | `security.test.ts` |
| **Path Traversal** | Critical | `../../Windows/System32` or absolute drive escape | `PathGuard.validatePath`: Canonical path resolution (`path.resolve`) asserted to start with validated `PROJECT_ROOT`. Rejection of null bytes, Windows reserved devices (`CON`, `NUL`, `PRN`, `AUX`), and Alternate Data Streams (`:`). | `pentest.test.ts` Phase 1 |
| **Symlink Escape & Cycles** | High | Symlink pointing outside workspace or circular symlinks | `FsAdapter`: Resolves realpaths via `fs.realpathSync`, drops symlinks pointing outside workspace root, maintains visited path set, and enforces depth (15) and file caps (10,000). | `workspace.test.ts` |
| **Command Injection** | Critical | `npm test && rm -rf /` or `; whoami` | `CommandWhitelist`: Strict regex validation rejecting `;`, `&`, `|`, `` ` ``, `$`, `%`, `^`. Only pre-approved binary subcommands allowed. `child_process.spawn` executed with `shell: false`. | `pentest.test.ts` Phase 2 |
| **Child Env Exfiltration** | High | Project scripts reading `process.env.GOOGLE_API_KEY` | `TerminalRunner.getCleanEnv`: Explicitly scrubs `GOOGLE_API_KEY`, `GEMINI_API_KEY`, and developer tokens from spawned child process environments. | `terminal.test.ts` |
| **Prompt Injection** | High | Hidden instructions in user files ("IGNORE PREVIOUS INSTRUCTIONS") | `Sanitizer.wrapUntrustedContext`: Encloses user attachments in explicit cryptographic notice blocks instructing the LLM to treat content as DATA ONLY. | `pentest.test.ts` Phase 3 |
| **Secret Leaks** | High | Accidental echo of Gemini keys, database URIs, JWT secrets | `SecretVault.redactSecrets`: Global regex scrubbing covering Google keys, AWS keys, GitHub PATs, JWT tokens, and database connection URIs (`postgres://`, `mongodb+srv://`). | `pentest.test.ts` Phase 4 |
| **Quota Exhaustion** | Medium | Rapid successive prompts triggering Gemini 429 quota exhaustion | `GeminiClient`: Enforces 15 RPM queue, exponential backoff retry with jitter, and links client `AbortSignal` to immediately terminate orphaned LLM streams. | `app/api/chat` |

---

## 3. Four-Phase Automated Penetration Test Results

All attack vectors are verified using an automated test harness (`src/lib/security/__tests__/pentest.test.ts`):

- **Phase 1: Path Traversal Tests**
  - Relative double-dot traversal (`../../`): **BLOCKED & LOGGED**
  - Cross-drive absolute path escape (`D:/secrets/...`): **BLOCKED & LOGGED**
  - Null-byte path bypass (`file.ts\0../../etc/passwd`): **BLOCKED & LOGGED**
  - Windows reserved devices (`CON`, `PRN`, `NUL`): **BLOCKED**
  - NTFS Alternate Data Streams (`:stream`): **BLOCKED**

- **Phase 2: Terminal Injection Tests**
  - Command chaining with `&&`, `;`, and `|`: **BLOCKED**
  - Subshell command substitution with `` ` ``, `$()`: **BLOCKED**
  - Windows percent variable expansion (`%TEMP%`) and caret escape (`^`): **BLOCKED**
  - Non-whitelisted binaries (`curl`, `wget`, `bash`, `powershell`, `rm`): **BLOCKED**

- **Phase 3: Prompt Jailbreak Tests**
  - Adversarial DAN and instruction overrides: **CONTAINED IN DATA WRAPPER**

- **Phase 4: Key & Secret Leakage Tests**
  - Google Gemini API key patterns (`AIza...`): **SCRUBBED TO `[REDACTED-SECRET]`**
  - AWS access keys (`AKIA...`): **SCRUBBED TO `[REDACTED-SECRET]`**
  - GitHub Personal Access Tokens (`ghp_...`): **SCRUBBED TO `[REDACTED-SECRET]`**
  - Database connection strings (`postgres://`, `mongodb+srv://`): **SCRUBBED TO `[REDACTED-SECRET]`**

---

## 4. Production Launch Readiness Checklist
- [x] Server-side secrets isolated in `.env.local` (excluded from git via `.gitignore`).
- [x] Client/Server code boundary enforced with zero native Node modules (`fs`, `path`) bundled into browser bundles.
- [x] Automated rollback snapshot `.backup` generated before every file write.
- [x] Multi-file staged diff reviewer with visual review and batch application.
- [x] Whitelisted safe terminal runner with process tree termination and 30-second kill timers.
