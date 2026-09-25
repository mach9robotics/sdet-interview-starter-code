import { faceArea, faceLoops } from "./face";
import { loopArea } from "./plane";
import { type Edge, signedVolume, uniqueEdges, uniqueVertices } from "./topology";
import type { Geometry, Vec3 } from "./types";
import { distance } from "./vec";

export interface Box3 {
  readonly min: Vec3;
  readonly max: Vec3;
}

export function geometryVertices(g: Geometry): Vec3[] {
  switch (g.kind) {
    case "point":
      return [g.position];
    case "segment":
      return [g.start, g.end];
    case "polyline":
      return [...g.vertices];
    case "surface":
    case "solid":
      return uniqueVertices(g.faces.flatMap((f) => faceLoops(f).flat()));
  }
}

export function geometryEdges(g: Geometry): Edge[] {
  switch (g.kind) {
    case "point":
      return [];
    case "segment":
      return [{ start: g.start, end: g.end }];
    case "polyline": {
      const links = g.closed ? g.vertices.length : g.vertices.length - 1;
      return Array.from({ length: links }, (_, i) => ({
        start: g.vertices[i],
        end: g.vertices[(i + 1) % g.vertices.length],
      }));
    }
    case "surface":
    case "solid":
      return uniqueEdges(g.faces);
  }
}

export function boundsOf(points: readonly Vec3[]): Box3 | null {
  if (points.length === 0) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p[i]);
      max[i] = Math.max(max[i], p[i]);
    }
  }
  return { min: min as unknown as Vec3, max: max as unknown as Vec3 };
}

export function boundsCenter(b: Box3): Vec3 {
  return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
}

export function boundsSize(b: Box3): Vec3 {
  return [b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]];
}

export function curveLength(g: Geometry): number | null {
  if (g.kind === "segment") return distance(g.start, g.end);
  if (g.kind === "polyline")
    return geometryEdges(g).reduce((sum, e) => sum + distance(e.start, e.end), 0);
  return null;
}

export function area(g: Geometry): number | null {
  if (g.kind === "polyline" && g.closed) return loopArea(g.vertices);
  if (g.kind === "surface" || g.kind === "solid")
    return g.faces.reduce((sum, f) => sum + faceArea(f), 0);
  return null;
}

export function volume(g: Geometry): number | null {
  return g.kind === "solid" ? Math.abs(signedVolume(g.faces)) : null;
}
