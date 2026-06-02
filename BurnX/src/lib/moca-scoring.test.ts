import { describe, expect, it } from "vitest";

import { MOCA_TRAIL_SEQUENCE } from "../constants/forms/moca";
import {
  clampAutomatedMocaScore,
  isValidTrailTap,
  nextExpectedTrailNode,
  scoreMocaTrail,
} from "./moca-scoring";

describe("moca-scoring", () => {
  it("expects nodes in MoCA order", () => {
    expect(nextExpectedTrailNode([])).toBe("1");
    expect(nextExpectedTrailNode(["1"])).toBe("A");
    expect(nextExpectedTrailNode(["1", "A", "2"])).toBe("B");
    expect(nextExpectedTrailNode([...MOCA_TRAIL_SEQUENCE])).toBeNull();
  });

  it("validates taps against expected node", () => {
    expect(isValidTrailTap([], "1")).toBe(true);
    expect(isValidTrailTap([], "A")).toBe(false);
    expect(isValidTrailTap(["1"], "2")).toBe(false);
    expect(isValidTrailTap(["1"], "A")).toBe(true);
  });

  it("scores perfect completion as 1", () => {
    const result = scoreMocaTrail([...MOCA_TRAIL_SEQUENCE]);
    expect(result.isComplete).toBe(true);
    expect(result.isCorrect).toBe(true);
    expect(result.score).toBe(1);
  });

  it("scores wrong order as 0", () => {
    expect(scoreMocaTrail(["1", "A"]).score).toBe(0);
    expect(scoreMocaTrail(["A", "1", "2", "B", "3", "C", "4", "D", "5", "E"]).score).toBe(0);
  });

  it("clamps automated totals to max 21", () => {
    expect(clampAutomatedMocaScore(25)).toBe(21);
  });
});
