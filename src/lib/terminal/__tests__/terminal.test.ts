import { describe, it, expect } from "vitest";
import { CommandWhitelist } from "../command-whitelist";
import { TerminalRunner } from "../runner";

describe("Safe Terminal Runner - Command Whitelist", () => {
  it("allows safe whitelisted npm and git commands", () => {
    expect(CommandWhitelist.isAllowed("npm", ["test"])).toBe(true);
    expect(CommandWhitelist.isAllowed("npm", ["run", "lint"])).toBe(true);
    expect(CommandWhitelist.isAllowed("npm", ["run", "build"])).toBe(true);
    expect(CommandWhitelist.isAllowed("git", ["status"])).toBe(true);
    expect(CommandWhitelist.isAllowed("git", ["diff"])).toBe(true);
  });

  it("strictly rejects dangerous shell metacharacters and operators", () => {
    expect(CommandWhitelist.isAllowed("npm", ["test", ";", "rm", "-rf", "/"])).toBe(false);
    expect(CommandWhitelist.isAllowed("npm", ["run", "lint", "&&", "dir"])).toBe(false);
    expect(CommandWhitelist.isAllowed("git", ["status", "|", "calc"])).toBe(false);
    expect(CommandWhitelist.isAllowed("git", ["status", "`calc`"])).toBe(false);
  });

  it("strictly rejects unapproved binaries", () => {
    expect(CommandWhitelist.isAllowed("curl", ["http://malicious.com"])).toBe(false);
    expect(CommandWhitelist.isAllowed("bash", ["-c", "dir"])).toBe(false);
    expect(CommandWhitelist.isAllowed("cmd.exe", ["/c", "dir"])).toBe(false);
    expect(CommandWhitelist.isAllowed("powershell", ["-Command", "dir"])).toBe(false);
  });
});

describe("Safe Terminal Runner - Execution Engine", () => {
  it("returns rejected error for un-whitelisted command execution", async () => {
    const result = await TerminalRunner.execute("curl", ["https://example.com"], process.cwd());
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Command not permitted by AETHER security policy");
  });
});
