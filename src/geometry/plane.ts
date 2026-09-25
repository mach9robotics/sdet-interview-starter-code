import type { Loop, Vec3 } from "./types";
import { add, cross, dot, length, normalize, scale, sub, TOLERANCE } from "./vec";

export interface Plane {
  readonly origin: Vec3;
  readonly normal: Vec3;
  readonly u: Vec3;
  readonly v: Vec3;
}

export function makePlane(origin: Vec3, normal: Vec3, uHint?: Vec3): Plane {
  const n = normalize(normal);
  let u: Vec3;
  if (uHint && length(cross(uHint, n)) > TOLERANCE) {
    u = normalize(sub(uHint, scale(n, dot(uHint, n))));
  } else {
    const helper: Vec3 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    u = normalize(cross(helper, n));
  }
  return { origin, normal: n, u, v: cross(n, u) };
}

/** Newell's method: the area-weighted normal of a loop, following its winding. */
export function newellNormal(loop: Loop): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x / 2, y / 2, z / 2];
}

export function loopArea(loop: Loop): number {
  return length(newellNormal(loop));
}

export function planeOfLoop(loop: Loop): Plane | null {
  const n = newellNormal(loop);
  if (length(n) < TOLERANCE * TOLERANCE) return null;
  const first = loop[0];
  const second = loop[1];
  return makePlane(first, n, sub(second, first));
}

export function distanceToPlane(p: Vec3, plane: Plane): number {
  return dot(sub(p, plane.origin), plane.normal);
}

export function isLoopPlanar(loop: Loop, plane: Plane, tol = 1e-5): boolean {
  return loop.every((p) => Math.abs(distanceToPlane(p, plane)) <= tol);
}

export function toLocal(p: Vec3, plane: Plane): [number, number] {
  const d = sub(p, plane.origin);
  return [dot(d, plane.u), dot(d, plane.v)];
}

export function fromLocal(x: number, y: number, plane: Plane): Vec3 {
  return add(plane.origin, add(scale(plane.u, x), scale(plane.v, y)));
}

export function projectOntoPlane(p: Vec3, plane: Plane): Vec3 {
  return sub(p, scale(plane.normal, distanceToPlane(p, plane)));
}

export function intersectRayPlane(origin: Vec3, direction: Vec3, plane: Plane): Vec3 | null {
  const denom = dot(direction, plane.normal);
  if (Math.abs(denom) < 1e-9) return null;
  const t = dot(sub(plane.origin, origin), plane.normal) / denom;
  if (t < 0) return null;
  return add(origin, scale(direction, t));
}
