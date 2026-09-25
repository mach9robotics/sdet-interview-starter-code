import { type Camera, type Ray, Raycaster, Vector2, Vector3 } from "three";
import type { Vec3 } from "../geometry";

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface ScreenSpace {
  readonly camera: Camera;
  readonly width: number;
  readonly height: number;
}

export function project(p: Vec3, s: ScreenSpace): ScreenPoint | null {
  const v = new Vector3(...p).project(s.camera);
  if (v.z < -1 || v.z > 1) return null;
  return { x: ((v.x + 1) / 2) * s.width, y: ((1 - v.y) / 2) * s.height };
}

export function rayAt(point: ScreenPoint, s: ScreenSpace): Ray {
  const raycaster = new Raycaster();
  raycaster.setFromCamera(
    new Vector2((point.x / s.width) * 2 - 1, 1 - (point.y / s.height) * 2),
    s.camera,
  );
  return raycaster.ray.clone();
}

export const toVec3 = (v: Vector3): Vec3 => [v.x, v.y, v.z];

export function distanceToSegment2D(p: ScreenPoint, a: ScreenPoint, b: ScreenPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Parameters of the closest points between a ray and the line `origin + t·direction`. */
export function closestOnLine(
  ray: Ray,
  origin: Vec3,
  direction: Vec3,
): { t: number; point: Vec3 } | null {
  const d = ray.direction;
  const u = new Vector3(...direction);
  const w0 = ray.origin.clone().sub(new Vector3(...origin));
  const a = d.dot(d);
  const b = d.dot(u);
  const c = u.dot(u);
  const dd = d.dot(w0);
  const e = u.dot(w0);
  const denom = a * c - b * b;
  if (Math.abs(denom) < 1e-10) return null;
  const t = (a * e - b * dd) / denom;
  return { t, point: toVec3(new Vector3(...origin).addScaledVector(u, t)) };
}
