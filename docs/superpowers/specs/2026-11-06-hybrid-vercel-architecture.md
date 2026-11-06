# AETHER — Hybrid Vercel Cloud + User-System Architecture Specification

**Date:** 2026-11-06
**Status:** Approved (Staff Engineer ADR)
**Target Environments:** All IDEs (VS Code, Cursor, Windsurf, WebStorm, Zed, Antigravity), All OS (Windows, macOS, Linux), and Vercel Serverless Cloud (`https://*.vercel.app`).

---

## 1. Executive Summary & Problem Statement

AETHER was originally built as a `127.0.0.1`-only workstation relying exclusively on Node.js `fs` and `child_process`. That created two barriers:
1. **IDE & OS Friction**: Hardcoding `-H 127.0.0.1`, mixing `@/src/*` and `@/*` aliases, and calling `process.cwd()` in client components caused issues in VS Code, Cursor, WSL, and remote port-forwarding.
2. **Cloud Hosting Incompatibility**: Vercel serverless functions have a read-only filesystem outside `/tmp`, ephemeral state across requests, and cannot directly read a remote visitor's `C:\` or `/Users/` drive via Node.js `fs`.

**Staff Engineer Solution — Zero-Server-State Hybrid Architecture**:
AETHER operates in a dual **Hybrid Mode** where the AI Agent & LangChain loop run on **Vercel Serverless (or Local Node)**, while **Chat History** and **Project Files** live on the **User's Own System**.

---

## 2. Hybrid Execution Modes

| Capability | Mode A: Browser Local Folder (Vercel + PC) | Mode B: Virtual Cloud Sandbox (Any Device) | Mode C: Localhost Disk (`npm run dev`) |
|---|---|---|---|
| **File Discovery (`list_files`)** | Reads user's PC folder via Browser File System Access API (`showDirectoryPicker`) or folder upload, passed as `virtualFiles` snapshot | Operates on in-memory `virtualFiles` workspace | Reads local disk via `FsAdapter.listTree` |
| **File Reading (`read_file`)** | Reads from `virtualFiles` with `PathGuard.isSensitivePath`, `SecretVault`, and `Sanitizer` | Reads from `virtualFiles` with full sanitization | Reads via `FsAdapter.readFile` + `PathGuard` |
| **Code Search (`search_code`)** | Searches `virtualFiles` (skips `.env*`, binaries, keys) | Searches `virtualFiles` | Searches local disk via `FsAdapter` |
| **Staging Changes (`stage_patch`)** | Computes LCS `DiffCalculator` diff against `virtualFiles[path]`; emits `ProposedChange` | Computes LCS diff against `virtualFiles[path]` | Computes LCS diff against local file on disk |
| **Validation (`run_check`)** | Static TypeScript/syntax/security inspection on `virtualFiles` when serverless; full `TerminalRunner` when local | Static & security verification on `virtualFiles` | Spawns whitelisted `npm`/`git` via `TerminalRunner` |
| **Confirm-Before-Save (`ReviewDialog`)** | Writes directly to user's PC folder via `FileSystemDirectoryHandle` (with `.backup` file creation) + ZIP export | Updates `virtualFiles` in browser + 1-click `.zip` download | Writes to disk via `/api/workspace` (`PatchEngine.applyPatch` + `.backup`) |
| **Chat History** | Stored on user's system in `localStorage` (`aether:conversations:v1`) | Stored on user's system in `localStorage` | Stored in `localStorage` + synced to `data/conversations/` |

---

## 3. Strict Security Invariants (All Modes)

1. **Same-Origin + Localhost Firewall (`proxy.ts`)**:
   - Allows `127.0.0.1`, `localhost`, `[::1]` AND same-origin requests where `Origin` hostname matches `Host` header (or `VERCEL_URL`).
   - Strictly rejects `Sec-Fetch-Site: cross-site`, `Origin: null`, `Origin` hostname != `Host` hostname, and non-JSON (`text/plain`, `application/x-www-form-urlencoded`, `multipart/form-data`) mutating requests with HTTP `403 Forbidden`.
2. **Sensitive Path & Credential Refusal (`PathGuard.isSensitivePath`)**:
   - Blocks `.env*`, `.git/*`, `.ssh/*`, `.npmrc`, `.pypirc`, `.netrc`, `id_rsa`, `id_ed25519`, `*.pem`, `*.key`, `*.pfx`, `*.p12` across **both** disk and `virtualFiles` tools.
3. **Secret Scrubbing (`SecretVault`) & Prompt Isolation (`Sanitizer`)**:
   - Every file read or search result—whether from disk or `virtualFiles`—is scrubbed by `SecretVault.redactSecrets` and wrapped in `Sanitizer.wrapUntrustedContext`.
4. **Stage-Only Agent Guarantee**:
   - No tool (`stage_patch` or any other) ever mutates the user's disk or `FileSystemDirectoryHandle`. Writes happen **exclusively** when the user clicks **Save Selected Files** in `ReviewDialog`.
