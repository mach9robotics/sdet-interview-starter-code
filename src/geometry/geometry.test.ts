import { Matrix4 } from "three";
import { describe, expect, it } from "vitest";
import {
  area,
  box,
  explode,
  extrude,
  type Geometry,
  join,
  makePlane,
  planarSurfaces,
  transformGeometry,
  volume,
} from ".";

const ground = makePlane([0, 0, 0], [0, 0, 1], [1, 0, 0]);
const square = (x: number, y: number, s: number) =>
  [
    [x, y, 0],
    [x + s, y, 0],
    [x + s, y + s, 0],
    [x, y + s, 0],
  ] as const;

describe("box", () => {
  it("builds a closed Solid with the right volume", () => {
    const g = box([0, 0, 0], [4, 3, 0], 2, ground);
    expect(g?.kind).toBe("solid");
    expect(volume(g as Geometry)).toBeCloseTo(24);
    expect(area(g as Geometry)).toBeCloseTo(2 * (12 + 8 + 6));
  });

  it("builds downward boxes with positive volume", () => {
    expect(volume(box([0, 0, 0], [1, 1, 0], -1, ground) as Geometry)).toBeCloseTo(1);
  });

  it("rejects a flat box", () => {
    expect(box([0, 0, 0], [4, 0, 0], 2, ground)).toBeNull();
  });
});

describe("extrude", () => {
  it("sweeps a Segment into a one-Face Surface", () => {
    const g = extrude({ kind: "segment", start: [0, 0, 0], end: [2, 0, 0] }, [0, 0, 3]);
    expect(g?.kind).toBe("surface");
    expect(area(g as Geometry)).toBeCloseTo(6);
  });

  it("sweeps a closed Polyline into a capped Solid", () => {
    const g = extrude({ kind: "polyline", vertices: square(0, 0, 2), closed: true }, [0, 0, 1]);
    expect(g?.kind).toBe("solid");
    expect(volume(g as Geometry)).toBeCloseTo(4);
  });

  it("sweeps a Surface with a hole into a Solid with a hole through it", () => {
    const { surfaces } = planarSurfaces([square(0, 0, 4), square(1, 1, 2)]);
    const g = extrude(surfaces[0] as Geometry, [0, 0, 1]);
    expect(g?.kind).toBe("solid");
    expect(volume(g as Geometry)).toBeCloseTo(16 - 4);
  });

  it("refuses to sweep a profile along itself", () => {
    expect(extrude({ kind: "segment", start: [0, 0, 0], end: [2, 0, 0] }, [1, 0, 0])).toBeNull();
  });
});

describe("planarSurfaces", () => {
  it("turns nested loops into outlines and holes", () => {
    const { surfaces, skipped } = planarSurfaces([
      square(0, 0, 10),
      square(1, 1, 8),
      square(2, 2, 2),
    ]);
    expect(skipped).toBe(0);
    expect(surfaces).toHaveLength(2);
    expect(area(surfaces[0] as Geometry)).toBeCloseTo(100 - 64);
    expect(area(surfaces[1] as Geometry)).toBeCloseTo(4);
  });

  it("skips loops that aren't flat", () => {
    const bent = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ] as const;
    expect(planarSurfaces([bent]).skipped).toBe(1);
  });
});

describe("join and explode", () => {
  it("chains Segments into a closed Polyline and back", () => {
    const loop = square(0, 0, 1);
    const segments: Geometry[] = loop.map((start, i) => ({
      kind: "segment",
      start,
      end: loop[(i + 1) % 4] as (typeof loop)[number],
    }));
    const [result] = join(segments);
    expect(result?.inputs).toHaveLength(4);
    expect(result?.output).toMatchObject({ kind: "polyline", closed: true });
    expect(explode(result?.output as Geometry)).toHaveLength(4);
  });

  it("joins Surfaces that close up into a Solid", () => {
    const solid = box([0, 0, 0], [1, 1, 0], 1, ground) as Geometry;
    const pieces = explode(solid) as Geometry[];
    expect(pieces).toHaveLength(6);
    const [result] = join(pieces);
    expect(result?.output.kind).toBe("solid");
    expect(volume(result?.output as Geometry)).toBeCloseTo(1);
  });

  it("leaves unconnected Segments alone", () => {
    expect(
      join([
        { kind: "segment", start: [0, 0, 0], end: [1, 0, 0] },
        { kind: "segment", start: [5, 0, 0], end: [6, 0, 0] },
      ]),
    ).toEqual([]);
  });
});

describe("transformGeometry", () => {
  it("keeps a mirrored Solid's volume positive", () => {
    const solid = box([0, 0, 0], [1, 2, 0], 3, ground) as Geometry;
    const mirrored = transformGeometry(solid, new Matrix4().makeScale(-1, 1, 1));
    expect(volume(mirrored)).toBeCloseTo(6);
  });
});
