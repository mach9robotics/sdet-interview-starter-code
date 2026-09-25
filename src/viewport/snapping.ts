import type { Ray } from "three";
import {
  fromLocal,
  intersectRayPlane,
  midpoint,
  type Plane,
  toLocal,
  type Vec3,
} from "../geometry";
import type { ObjectVisual } from "./ObjectVisual";
import { closestOnLine, project, type ScreenPoint, type ScreenSpace, toVec3 } from "./screen";

export type SnapKind = "Point" | "Vertex" | "Midpoint" | "Edge" | "Grid";

export interface SnapResult {
  readonly point: Vec3;
  readonly kind: SnapKind | null;
}

/** Where a click lands: freely on the Construction Plane, or constrained to a line (heights, distances). */
export type Constraint =
  | { readonly kind: "plane"; readonly plane: Plane }
  | { readonly kind: "line"; readonly origin: Vec3; readonly direction: Vec3 };

const SNAP_RADIUS_PX = 12;
const PRIORITY: Record<SnapKind, number> = { Point: 0, Vertex: 0, Midpoint: 1, Edge: 2, Grid: 3 };

export const GRID_STEP = 1;

function freePoint(ray: Ray, constraint: Constraint): Vec3 | null {
  if (constraint.kind === "plane") {
    return intersectRayPlane(toVec3(ray.origin), toVec3(ray.direction), constraint.plane);
  }
  return closestOnLine(ray, constraint.origin, constraint.direction)?.point ?? null;
}

function ontoConstraint(p: Vec3, constraint: Constraint): Vec3 {
  if (constraint.kind === "plane") return p;
  const [ox, oy, oz] = constraint.origin;
  const [dx, dy, dz] = constraint.direction;
  const t = (p[0] - ox) * dx + (p[1] - oy) * dy + (p[2] - oz) * dz;
  return [ox + dx * t, oy + dy * t, oz + dz * t];
}

function gridPoint(ray: Ray, constraint: Constraint): Vec3 | null {
  const free = freePoint(ray, constraint);
  if (!free) return null;
  const round = (n: number) => Math.round(n / GRID_STEP) * GRID_STEP;
  if (constraint.kind === "plane") {
    const [u, v] = toLocal(free, constraint.plane);
    return fromLocal(round(u), round(v), constraint.plane);
  }
  const [ox, oy, oz] = constraint.origin;
  const [dx, dy, dz] = constraint.direction;
  const t = round((free[0] - ox) * dx + (free[1] - oy) * dy + (free[2] - oz) * dz);
  return [ox + dx * t, oy + dy * t, oz + dz * t];
}

export function objectSnap(
  visuals: Iterable<ObjectVisual>,
  ray: Ray,
  cursor: ScreenPoint,
  s: ScreenSpace,
) {
  let best: { point: Vec3; kind: SnapKind; px: number } | null = null;
  const consider = (point: Vec3, kind: SnapKind) => {
    const p = project(point, s);
    if (!p) return;
    const px = Math.hypot(p.x - cursor.x, p.y - cursor.y);
    if (px > SNAP_RADIUS_PX) return;
    if (
      !best ||
      PRIORITY[kind] < PRIORITY[best.kind] ||
      (PRIORITY[kind] === PRIORITY[best.kind] && px < best.px)
    ) {
      best = { point, kind, px };
    }
  };
  for (const visual of visuals) {
    const pointKind: SnapKind = visual.geometry.kind === "point" ? "Point" : "Vertex";
    for (const v of visual.vertices) consider(v, pointKind);
    for (const edge of visual.edges) {
      consider(midpoint(edge.start, edge.end), "Midpoint");
      const direction: Vec3 = [
        edge.end[0] - edge.start[0],
        edge.end[1] - edge.start[1],
        edge.end[2] - edge.start[2],
      ];
      const nearest = closestOnLine(ray, edge.start, direction);
      if (nearest && nearest.t >= 0 && nearest.t <= 1) consider(nearest.point, "Edge");
    }
  }
  return best as { point: Vec3; kind: SnapKind } | null;
}

export function resolvePoint(
  visuals: Iterable<ObjectVisual>,
  ray: Ray,
  cursor: ScreenPoint,
  s: ScreenSpace,
  constraint: Constraint,
  snapping: boolean,
): SnapResult | null {
  if (snapping) {
    const snapped = objectSnap(visuals, ray, cursor, s);
    if (snapped) return { point: ontoConstraint(snapped.point, constraint), kind: snapped.kind };
    const grid = gridPoint(ray, constraint);
    if (grid) return { point: grid, kind: "Grid" };
  }
  const free = freePoint(ray, constraint);
  return free ? { point: free, kind: null } : null;
}
