import type { Vec3 } from "./types";

export const TOLERANCE = 1e-6;

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const distance = (a: Vec3, b: Vec3): number => length(sub(a, b));
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, scale(sub(b, a), t));
export const midpoint = (a: Vec3, b: Vec3): Vec3 => lerp(a, b, 0.5);

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  return len < TOLERANCE ? [0, 0, 0] : scale(a, 1 / len);
}

export const samePoint = (a: Vec3, b: Vec3, tol = TOLERANCE): boolean => distance(a, b) <= tol;

export function pointKey(p: Vec3): string {
  return `${p[0].toFixed(5)},${p[1].toFixed(5)},${p[2].toFixed(5)}`;
}

export function edgeKey(a: Vec3, b: Vec3): string {
  const ka = pointKey(a);
  const kb = pointKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}
