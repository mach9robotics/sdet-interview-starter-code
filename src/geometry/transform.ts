import { type Matrix4, Vector3 } from "three";
import { reverseFace } from "./face";
import type { Face, Geometry, Loop, Vec3 } from "./types";

export function transformPoint(p: Vec3, m: Matrix4): Vec3 {
  const v = new Vector3(...p).applyMatrix4(m);
  return [v.x, v.y, v.z];
}

export function transformGeometry(g: Geometry, m: Matrix4): Geometry {
  const t = (p: Vec3) => transformPoint(p, m);
  const loop = (l: Loop): Loop => l.map(t);
  const mirrored = m.determinant() < 0;
  const face = (f: Face): Face => {
    const moved = { outer: loop(f.outer), holes: f.holes.map(loop) };
    return mirrored ? reverseFace(moved) : moved;
  };
  switch (g.kind) {
    case "point":
      return { kind: "point", position: t(g.position) };
    case "segment":
      return { kind: "segment", start: t(g.start), end: t(g.end) };
    case "polyline":
      return { kind: "polyline", vertices: loop(g.vertices), closed: g.closed };
    case "surface":
    case "solid":
      return { kind: g.kind, faces: g.faces.map(face) };
  }
}
