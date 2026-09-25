import { describe, expect, it } from "vitest";
import { makePlane } from "../geometry";
import { parseInput } from "./input";

const top = makePlane([0, 0, 0], [0, 0, 1], [1, 0, 0]);
const front = makePlane([0, 0, 0], [0, -1, 0], [1, 0, 0]);

describe("parseInput", () => {
  it("reads three numbers as a world position", () => {
    expect(parseInput("4, 3, -1.5", top, null)).toEqual({ kind: "point", point: [4, 3, -1.5] });
  });

  it("reads two numbers on the View's Construction Plane", () => {
    expect(parseInput("4,3", front, null)).toMatchObject({ kind: "point", point: [4, 0, 3] });
  });

  it("offsets from the last point with @", () => {
    expect(parseInput("@10,0,0", top, [1, 1, 1])).toEqual({ kind: "point", point: [11, 1, 1] });
    expect(parseInput("@0,2", front, [1, 1, 1])).toMatchObject({ kind: "point", point: [1, 1, 3] });
  });

  it("refuses @ with no previous point", () => {
    expect(parseInput("@1,1", top, null).kind).toBe("error");
  });

  it("reads numbers and words", () => {
    expect(parseInput("-.5", top, null)).toEqual({ kind: "number", value: -0.5 });
    expect(parseInput("Planar Surface", top, null)).toEqual({
      kind: "word",
      value: "planarsurface",
    });
    expect(parseInput("", top, null)).toEqual({ kind: "empty" });
  });
});
