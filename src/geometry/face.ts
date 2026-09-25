import { ShapeUtils, Vector2 } from "three";
import { loopArea, newellNormal, planeOfLoop, toLocal } from "./plane";
import type { Face, Loop, Vec3 } from "./types";
import { cross, dot, normalize, sub } from "./vec";

export type Triangle = readonly [Vec3, Vec3, Vec3];

export const faceNormal = (face: Face): Vec3 => normalize(newellNormal(face.outer));

export function faceArea(face: Face): number {
  return face.holes.reduce((area, hole) => area - loopArea(hole), loopArea(face.outer));
}

export function reverseFace(face: Face): Face {
  return {
    outer: [...face.outer].reverse(),
    holes: face.holes.map((hole) => [...hole].reverse()),
  };
}

export function faceLoops(face: Face): Loop[] {
  return [face.outer, ...face.holes];
}

/** Triangles keep the face's winding, so their normals agree with faceNormal. */
export function triangulateFace(face: Face): Triangle[] {
  const plane = planeOfLoop(face.outer);
  if (!plane) return [];
  const toV2 = (loop: Loop) => loop.map((p) => new Vector2(...toLocal(p, plane)));
  const points = [...face.outer, ...face.holes.flat()];
  const indices = ShapeUtils.triangulateShape(toV2(face.outer), face.holes.map(toV2));
  const normal = plane.normal;
  return indices.map(([i, j, k]) => {
    const a = points[i];
    const b = points[j];
    const c = points[k];
    return dot(cross(sub(b, a), sub(c, a)), normal) >= 0 ? [a, b, c] : [a, c, b];
  });
}
