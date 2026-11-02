import { describe, expect, test } from "vitest";
import { paletteAt } from "./palette";

const close = (actual: readonly number[], expected: readonly number[]) =>
  expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, 6));

describe("paletteAt", () => {
  test("the sphere glows warm apricot", () => {
    close(paletteAt(0, 0).core, [1, 0.56, 0.3]);
    close(paletteAt(0, 0).frost, [1, 0.88, 0.8]);
  });

  test("the monogram is glacier blue", () => {
    close(paletteAt(1, 0).core, [0.33, 0.62, 1]);
    close(paletteAt(1, 0).frost, [0.82, 0.91, 1]);
  });

  test("the ring is lavender", () => {
    close(paletteAt(2, 0).core, [0.66, 0.46, 1]);
  });

  test("collapsing re-ignites it apricot", () => {
    close(paletteAt(2, 1).core, [1, 0.56, 0.3]);
    close(paletteAt(2, 1).frost, [1, 0.88, 0.8]);
  });

  test("blends linearly between stages", () => {
    close(paletteAt(0.5, 0).core, [(1 + 0.33) / 2, (0.56 + 0.62) / 2, (0.3 + 1) / 2]);
  });
});
