import { describe, it, expect } from "vitest";
import { StreamParser } from "../stream-parser";

describe("Gemini Stream Parser", () => {
  it("correctly extracts <thinking> trace from streaming chunks", () => {
    const parser = new StreamParser();
    parser.feed("Hello! <thinking>Analyzing software architecture");
    expect(parser.getState().thinking).toBe("Analyzing software architecture");
    expect(parser.getState().isThinking).toBe(true);

    parser.feed(" and SOLID principles.</thinking> Now here is the result.");
    expect(parser.getState().isThinking).toBe(false);
    expect(parser.getState().thinking).toBe("Analyzing software architecture and SOLID principles.");
    expect(parser.getState().cleanText).toContain("Hello!");
    expect(parser.getState().cleanText).toContain("Now here is the result.");
  });

  it("extracts <plan> checklist block", () => {
    const parser = new StreamParser();
    parser.feed("<plan>\n- [ ] Step 1: Initialize project\n- [ ] Step 2: Add API endpoint\n</plan>");
    expect(parser.getState().plan).toContain("Step 1: Initialize project");
    expect(parser.getState().plan).toContain("Step 2: Add API endpoint");
  });

  it("extracts code files tagged with ```lang:path format", () => {
    const parser = new StreamParser();
    const raw = "Here is the code:\n```typescript:src/app/api/users/route.ts\nimport { NextResponse } from 'next/server';\nexport async function GET() {\n  return NextResponse.json([]);\n}\n```";
    parser.feed(raw);
    const files = parser.getState().extractedFiles;
    expect(files.length).toBe(1);
    expect(files[0].path).toBe("src/app/api/users/route.ts");
    expect(files[0].lang).toBe("typescript");
    expect(files[0].content).toContain("export async function GET()");
  });
});
