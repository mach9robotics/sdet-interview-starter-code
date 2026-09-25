import { Ray, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { Gumball, matrixFor } from "./Gumball";

/** A ray looking straight down at `point` from above. */
const downAt = (x: number, y: number) => new Ray(new Vector3(x, y, 50), new Vector3(0, 0, -1));
/** A ray looking along +Y through (x, *, z). */
const frontAt = (x: number, z: number) => new Ray(new Vector3(x, -50, z), new Vector3(0, 1, 0));

function must<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("expected a value");
  return value;
}

function gumballAt(x: number, y: number, z: number): Gumball {
  const gumball = new Gumball();
  gumball.place([x, y, z]);
  return gumball;
}

describe("Gumball drags", () => {
  it("moves along an axis by how far the cursor slid along it", () => {
    const g = gumballAt(1, 1, 0);
    const state = g.beginDrag({ operation: "move", axis: 0 }, downAt(2, 1));
    const update = g.drag(must(state), downAt(5.5, 1), false, null);
    expect(update?.value).toBeCloseTo(3.5);
    expect(new Vector3(1, 1, 0).applyMatrix4(must(update).matrix).x).toBeCloseTo(4.5);
  });

  it("snaps a move to whole grid steps, or level with a target", () => {
    const g = gumballAt(0, 0, 0);
    const state = g.beginDrag({ operation: "move", axis: 2 }, frontAt(0, 0.2));
    expect(g.drag(must(state), frontAt(0, 2.9), true, null)?.value).toBeCloseTo(3);
    expect(g.drag(must(state), frontAt(0, 2.9), true, [7, 7, 3.3])?.value).toBeCloseTo(3.3);
  });

  it("rotates by the swept angle about the gumball's origin, snapping to 15°", () => {
    const g = gumballAt(2, 0, 0);
    const state = g.beginDrag({ operation: "rotate", axis: 2 }, downAt(3, 0));
    expect(g.drag(must(state), downAt(2, 1), false, null)?.value).toBeCloseTo(90);
    const snapped = g.drag(must(state), downAt(2 + Math.cos(0.7), Math.sin(0.7)), true, null);
    expect(snapped?.value).toBeCloseTo(45);
    const moved = new Vector3(3, 0, 0).applyMatrix4(must(snapped).matrix);
    expect(moved.distanceTo(new Vector3(2, 0, 0))).toBeCloseTo(1);
  });

  it("accumulates rotation past 180° instead of wrapping", () => {
    const g = gumballAt(0, 0, 0);
    const state = g.beginDrag({ operation: "rotate", axis: 2 }, downAt(1, 0));
    for (const degrees of [60, 120, 180, 240]) {
      const r = (degrees * Math.PI) / 180;
      g.drag(must(state), downAt(Math.cos(r), Math.sin(r)), false, null);
    }
    const r = (270 * Math.PI) / 180;
    expect(g.drag(must(state), downAt(Math.cos(r), Math.sin(r)), false, null)?.value).toBeCloseTo(
      270,
    );
  });

  it("scales along an axis about the origin, snapping to 0.1", () => {
    const g = gumballAt(1, 0, 0);
    const state = g.beginDrag({ operation: "scale", axis: 0 }, downAt(2, 0));
    const update = g.drag(must(state), downAt(3.12, 0), true, null);
    expect(update?.value).toBeCloseTo(2.1);
    expect(new Vector3(1, 0, 0).applyMatrix4(must(update).matrix).x).toBeCloseTo(1);
    expect(new Vector3(2, 0, 0).applyMatrix4(must(update).matrix).x).toBeCloseTo(3.1);
  });
});

describe("matrixFor", () => {
  it("builds the same transforms from typed values", () => {
    const origin = new Vector3(1, 1, 1);
    const scaled = new Vector3(2, 1, 1).applyMatrix4(
      matrixFor({ operation: "scale", axis: 0 }, 3, origin),
    );
    expect(scaled.x).toBeCloseTo(4);
    const moved = new Vector3().applyMatrix4(matrixFor({ operation: "move", axis: 1 }, -2, origin));
    expect(moved.y).toBeCloseTo(-2);
  });
});
