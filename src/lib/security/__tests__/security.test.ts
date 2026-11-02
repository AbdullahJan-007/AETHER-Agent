import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PathGuard } from "../path-guard";
import { Sanitizer } from "../sanitizer";
import { SecretVault } from "../secret-vault";
import fs from "fs";
import path from "path";

describe("Security Subsystem - PathGuard", () => {
  const root = path.resolve("./test-tmp-security-root");

  beforeAll(() => {
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(root)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts valid subpaths inside project root", () => {
    const validPath = "src/components/button.tsx";
    const result = PathGuard.validatePath(validPath, root);
    expect(result.safe).toBe(true);
    expect(result.canonicalPath).toContain("test-tmp-security-root");
  });

  it("rejects path traversal attempts outside project root", () => {
    const attack = "../../../Windows/System32";
    const result = PathGuard.validatePath(attack, root);
    expect(result.safe).toBe(false);
    expect(result.error).toMatch(/Path traversal detected|protected operating system/i);
  });

  it("rejects paths with null bytes", () => {
    const attack = "src/index.ts\0.exe";
    const result = PathGuard.validatePath(attack, root);
    expect(result.safe).toBe(false);
    expect(result.error).toContain("Invalid path characters");
  });

  it("rejects OS critical drive roots as workspace root", () => {
    const driveRootResult = PathGuard.validateRoot(process.platform === "win32" ? "C:\\" : "/");
    expect(driveRootResult.safe).toBe(false);
    expect(driveRootResult.error).toMatch(/protected operating system directory/i);
  });
});

describe("Security Subsystem - Sanitizer", () => {
  it("wraps untrusted file data with anti-jailbreak delimiters", () => {
    const wrapped = Sanitizer.wrapUntrustedContext("config.json", '{"key": "value"}');
    expect(wrapped).toContain("### UNTRUSTED USER-PROVIDED FILE: config.json");
    expect(wrapped).toContain("DATA ONLY");
    expect(wrapped).toContain('{"key": "value"}');
  });

  it("strips dangerous ASCII control characters except formatting", () => {
    const dirty = "clean\x00text\x08here\r\n\t";
    const cleaned = Sanitizer.cleanContent(dirty);
    expect(cleaned).toBe("cleantexthere\r\n\t");
  });
});

describe("Security Subsystem - SecretVault", () => {
  it("redacts Google Gemini API keys", () => {
    const raw = "My key is AIzaSyD-dummyGoogleKeyHere1234567890 in the code";
    const redacted = SecretVault.redactSecrets(raw);
    expect(redacted).not.toContain("AIzaSyD");
    expect(redacted).toContain("[REDACTED-SECRET]");
  });

  it("detects whether a string contains secrets", () => {
    const withSecret = "bearer sk-123456789012345678901234567890123456789012345678";
    const noSecret = "normal prompt without credentials";
    expect(SecretVault.containsSecret(withSecret)).toBe(true);
    expect(SecretVault.containsSecret(noSecret)).toBe(false);
  });

  it("redacts database connection strings and passwords", () => {
    const envString = "DATABASE_URL=postgres://admin:superSecretPassword123@localhost:5432/mydb\nAUTH_SECRET=myJwtSecret987";
    const redacted = SecretVault.redactSecrets(envString);
    expect(redacted).not.toContain("superSecretPassword123");
    expect(redacted).not.toContain("myJwtSecret987");
    expect(redacted).toContain("[REDACTED]");
  });
});
