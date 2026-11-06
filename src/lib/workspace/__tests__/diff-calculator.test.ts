import { describe, it, expect } from "vitest";
import { DiffCalculator } from "../diff-calculator";

describe("DiffCalculator", () => {
  it("computes accurate additions when a line is inserted into the middle", () => {
    const original = "alpha\nbeta\ngamma\ndelta";
    const updated = "alpha\nbeta\ninserted-line\ngamma\ndelta";

    const diff = DiffCalculator.calculateDiff("test.txt", original, updated);
    expect(diff.hasChanges).toBe(true);
    expect(diff.additions).toBe(1);
    expect(diff.deletions).toBe(0);

    const addedLines = diff.diffLines.filter((l) => l.type === "add");
    expect(addedLines).toHaveLength(1);
    expect(addedLines[0].content).toBe("inserted-line");
  });

  it("computes accurate deletions when a line is removed", () => {
    const original = "alpha\nbeta\ngamma\ndelta";
    const updated = "alpha\ngamma\ndelta";

    const diff = DiffCalculator.calculateDiff("test.txt", original, updated);
    expect(diff.hasChanges).toBe(true);
    expect(diff.additions).toBe(0);
    expect(diff.deletions).toBe(1);

    const deletedLines = diff.diffLines.filter((l) => l.type === "delete");
    expect(deletedLines).toHaveLength(1);
    expect(deletedLines[0].content).toBe("beta");
  });

  it("handles empty files and full replacements cleanly", () => {
    const emptyDiff = DiffCalculator.calculateDiff("test.txt", "", "hello\nworld");
    expect(emptyDiff.hasChanges).toBe(true);
    expect(emptyDiff.additions).toBe(2);
    expect(emptyDiff.deletions).toBe(0);

    const deletedDiff = DiffCalculator.calculateDiff("test.txt", "hello\nworld", "");
    expect(deletedDiff.hasChanges).toBe(true);
    expect(deletedDiff.additions).toBe(0);
    expect(deletedDiff.deletions).toBe(2);
  });
});
