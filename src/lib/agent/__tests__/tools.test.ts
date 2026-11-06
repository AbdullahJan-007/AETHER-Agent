import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  listFilesTool,
  readFileTool,
  searchCodeTool,
  stagePatchTool,
  runCheckTool,
  createLangChainTools,
} from "../tools";
import type { ToolContext, ProposedChange } from "../tools/types";

describe("Agent Tools", () => {
  const tempDir = path.resolve("./test-tmp-agent-tools");
  let ctx: ToolContext;

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Populate temp dir with test files
    fs.writeFileSync(path.join(tempDir, "index.ts"), "export const hello = 'world';\nconsole.log(hello);");
    fs.writeFileSync(path.join(tempDir, ".env"), "SECRET_API_KEY=AIzaSySecret12345678901234567890");
    fs.writeFileSync(path.join(tempDir, ".env.local"), "ANOTHER_SECRET=12345");

    const sub = path.join(tempDir, "src");
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, "app.ts"), "const config = { active: true };\nexport default config;");

    ctx = {
      root: tempDir,
      proposedChanges: new Map<string, ProposedChange>(),
    };
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe("read_file", () => {
    it("refuses to read .env files", async () => {
      const res1 = await readFileTool.run({ path: ".env" }, ctx);
      expect(res1).toContain("strictly prohibited for security");

      const res2 = await readFileTool.run({ path: ".env.local" }, ctx);
      expect(res2).toContain("strictly prohibited for security");
    });

    it("refuses directory traversal attempts", async () => {
      const res = await readFileTool.run({ path: "../../etc/passwd" }, ctx);
      expect(res).toContain("Error:");
    });

    it("reads normal files and wraps them in security delimiters", async () => {
      const res = await readFileTool.run({ path: "index.ts" }, ctx);
      expect(res).toContain("UNTRUSTED USER-PROVIDED FILE: index.ts");
      expect(res).toContain("export const hello = 'world';");
    });
  });

  describe("list_files", () => {
    it("lists files within the project root", async () => {
      const res = await listFilesTool.run({}, ctx);
      expect(res).toContain("index.ts");
      expect(res).toContain("src/app.ts");
    });

    it("refuses traversal when listing sub-directories", async () => {
      const res = await listFilesTool.run({ dir: "../.." }, ctx);
      expect(res).toContain("Error:");
    });
  });

  describe("stage_patch", () => {
    it("stages proposals without writing anything to disk", async () => {
      const targetFile = "new-feature.ts";
      const fullPath = path.join(tempDir, targetFile);

      expect(fs.existsSync(fullPath)).toBe(false);

      const res = await stagePatchTool.run(
        { path: targetFile, content: "export const isAwesome = true;", reason: "Add feature flag" },
        ctx
      );

      expect(res).toContain("Staged changes for");
      expect(ctx.proposedChanges.has(targetFile)).toBe(true);

      // Verify strictly that NOTHING is written to disk
      expect(fs.existsSync(fullPath)).toBe(false);
    });

    it("replaces previous proposal when stage_patch is called twice for the same path", async () => {
      await stagePatchTool.run(
        { path: "index.ts", content: "console.log('first draft');", reason: "Draft 1" },
        ctx
      );
      expect(ctx.proposedChanges.get("index.ts")?.content).toBe("console.log('first draft');");

      await stagePatchTool.run(
        { path: "index.ts", content: "console.log('second revision');", reason: "Draft 2" },
        ctx
      );
      expect(ctx.proposedChanges.get("index.ts")?.content).toBe("console.log('second revision');");
      expect(ctx.proposedChanges.size).toBe(1);
    });

    it("refuses staging to .env files or traversing outside root", async () => {
      const resEnv = await stagePatchTool.run(
        { path: ".env", content: "INJECT=1", reason: "Test injection" },
        ctx
      );
      expect(resEnv).toContain("strictly prohibited");

      const resEscape = await stagePatchTool.run(
        { path: "../outside.ts", content: "evil", reason: "Escape test" },
        ctx
      );
      expect(resEscape).toContain("Error:");
    });
  });

  describe("search_code", () => {
    it("searches code across files and respects exclusions", async () => {
      const res = await searchCodeTool.run({ query: "active" }, ctx);
      expect(res).toContain("src/app.ts:1:");
      expect(res).toContain("active: true");
    });

    it("does not leak content from .env files in search results", async () => {
      const res = await searchCodeTool.run({ query: "AIzaSySecret" }, ctx);
      expect(res).toContain("No matches found");
    });
  });

  describe("createLangChainTools helper", () => {
    it("instantiates LangChain tools bound to context", () => {
      const tools = createLangChainTools(ctx);
      expect(tools.length).toBe(5);
      const names = tools.map((t) => t.name);
      expect(names).toEqual(["list_files", "read_file", "search_code", "stage_patch", "run_check"]);
    });
  });
});
