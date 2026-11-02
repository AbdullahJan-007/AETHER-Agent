import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PatchEngine } from "../patch-engine";
import { FsAdapter } from "../fs-adapter";
import fs from "fs";
import path from "path";

describe("Workspace Bridge Engine", () => {
  const tempDir = path.resolve("./test-tmp-workspace");

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, "sample.txt"), "Original content line 1\nOriginal content line 2");
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("stages a unified diff between original and new content", () => {
    const diff = PatchEngine.stagePatch(
      "sample.txt",
      "Original content line 1\nOriginal content line 2",
      "Original content line 1\nUpdated content line 2\nNew line 3"
    );
    expect(diff.hasChanges).toBe(true);
    expect(diff.additions).toBeGreaterThan(0);
    expect(diff.diffLines.length).toBeGreaterThan(0);
  });

  it("creates a .backup file before applying file modifications", async () => {
    const file = path.join(tempDir, "sample.txt");
    const result = await PatchEngine.applyPatch(file, "New written content", tempDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.backupPath)).toBe(true);
    expect(fs.readFileSync(result.backupPath, "utf-8")).toContain("Original content line 1");
    expect(fs.readFileSync(file, "utf-8")).toBe("New written content");
  });

  it("lists directory tree recursively while ignoring node_modules and .git", async () => {
    const subDir = path.join(tempDir, "src");
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, "app.ts"), "console.log('test')");
    
    // Ignored dir
    const gitDir = path.join(tempDir, ".git");
    fs.mkdirSync(gitDir, { recursive: true });
    fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main");

    const tree = await FsAdapter.listTree(tempDir);
    const paths = tree.map((t) => t.path);
    expect(paths).toContain("sample.txt");
    expect(paths).toContain("src/app.ts");
    expect(paths.some((p) => p.startsWith(".git"))).toBe(false);
  });
});
