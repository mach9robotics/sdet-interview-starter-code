import { Vector3 } from "three";

import type { ObjectVisual } from "./ObjectVisual";
import { distanceToSegment2D, project, rayAt, type ScreenPoint, type ScreenSpace } from "./screen";

const CURVE_TOLERANCE_PX = 7;

interface Hit {
  readonly id: string;
  readonly curveDistance: number | null;
  readonly depth: number | null;
}

function hitTest(visual: ObjectVisual, at: ScreenPoint, s: ScreenSpace): Hit | null {
  if (visual.geometry.kind === "point") {
    const p = project(visual.vertices[0], s);
    const d = p ? Math.hypot(p.x - at.x, p.y - at.y) : Infinity;
    return d <= CURVE_TOLERANCE_PX ? { id: visual.id, curveDistance: d, depth: null } : null;
  }
  let nearestEdge = Infinity;
  for (const edge of visual.edges) {
    const a = project(edge.start, s);
    const b = project(edge.end, s);
    if (a && b) nearestEdge = Math.min(nearestEdge, distanceToSegment2D(at, a, b));
  }
  if (visual.triangles.length === 0) {
    return nearestEdge <= CURVE_TOLERANCE_PX
      ? { id: visual.id, curveDistance: nearestEdge, depth: null }
      : null;
  }
  const ray = rayAt(at, s);
  const hitPoint = new Vector3();
  let depth = Infinity;
  for (const [a, b, c] of visual.triangles) {
    const hit = ray.intersectTriangle(
      new Vector3(...a),
      new Vector3(...b),
      new Vector3(...c),
      false,
      hitPoint,
    );
    if (hit) depth = Math.min(depth, hit.distanceTo(ray.origin));
  }
  if (depth === Infinity && nearestEdge <= CURVE_TOLERANCE_PX) depth = Number.MAX_SAFE_INTEGER;
  return depth === Infinity ? null : { id: visual.id, curveDistance: null, depth };
}

/** Points and curves near the cursor win over faces; among faces, the nearest wins. */
export function pickObject(
  visuals: Iterable<ObjectVisual>,
  at: ScreenPoint,
  s: ScreenSpace,
): string | null {
  let bestCurve: Hit | null = null;
  let bestFace: Hit | null = null;
  for (const visual of visuals) {
    const hit = hitTest(visual, at, s);
    if (!hit) continue;
    if (hit.curveDistance !== null) {
      if (!bestCurve || hit.curveDistance < (bestCurve.curveDistance as number)) bestCurve = hit;
    } else if (!bestFace || (hit.depth as number) < (bestFace.depth as number)) {
      bestFace = hit;
    }
  }
  return (bestCurve ?? bestFace)?.id ?? null;
}

export interface ScreenRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const inside = (p: ScreenPoint, r: ScreenRect) =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

function segmentsCross(a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint): boolean {
  const orient = (p: ScreenPoint, q: ScreenPoint, r: ScreenPoint) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}

function edgeTouchesRect(a: ScreenPoint, b: ScreenPoint, r: ScreenRect): boolean {
  if (inside(a, r) || inside(b, r)) return true;
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ];
  return corners.some((c, i) => segmentsCross(a, b, c, corners[(i + 1) % 4]));
}

/** Window selection takes Objects fully inside; crossing selection takes anything touched. */
export function boxSelect(
  visuals: Iterable<ObjectVisual>,
  rect: ScreenRect,
  crossing: boolean,
  s: ScreenSpace,
): string[] {
  const ids: string[] = [];
  for (const visual of visuals) {
    const projected = visual.vertices.map((v) => project(v, s));
    if (!crossing) {
      if (projected.every((p) => p && inside(p, rect))) ids.push(visual.id);
      continue;
    }
    const touched =
      projected.some((p) => p && inside(p, rect)) ||
      visual.edges.some((e) => {
        const a = project(e.start, s);
        const b = project(e.end, s);
        return a !== null && b !== null && edgeTouchesRect(a, b, rect);
      });
    if (touched) ids.push(visual.id);
  }
  return ids;
}
