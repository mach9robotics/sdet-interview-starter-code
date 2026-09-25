import { faceNormal } from "./face";
import { isLoopPlanar, loopArea, newellNormal, type Plane, planeOfLoop, toLocal } from "./plane";
import { boundaryEdges, isClosed, orientFaces } from "./topology";
import type { Face, Geometry, Loop, Vec3 } from "./types";
import { add, cross, dot, length, normalize, samePoint, scale, sub, TOLERANCE } from "./vec";

function facesToGeometry(faces: Face[]): Geometry {
  return isClosed(faces)
    ? { kind: "solid", faces: orientFaces(faces) }
    : { kind: "surface", faces: orientFaces(faces, { outward: false }) };
}

function prism(faces: readonly Face[], offset: Vec3): Geometry | null {
  if (faces.some((f) => Math.abs(dot(faceNormal(f), offset)) < TOLERANCE)) return null;
  const move = (loop: Loop): Loop => loop.map((p) => add(p, offset));
  const tops = faces.map((f) => ({ outer: move(f.outer), holes: f.holes.map(move) }));
  const sides = boundaryEdges(faces).map((e) => ({
    outer: [e.start, e.end, add(e.end, offset), add(e.start, offset)],
    holes: [],
  }));
  return facesToGeometry([...faces, ...tops, ...sides]);
}

function sweepChain(vertices: Loop, offset: Vec3): Geometry | null {
  const faces: Face[] = [];
  for (let i = 0; i + 1 < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[i + 1];
    if (length(cross(sub(b, a), offset)) < TOLERANCE) return null;
    faces.push({ outer: [a, b, add(b, offset), add(a, offset)], holes: [] });
  }
  return faces.length > 0 ? facesToGeometry(faces) : null;
}

/** The direction a closed or planar profile extrudes along by default, if it has one. */
export function profileNormal(g: Geometry): Vec3 | null {
  if (g.kind === "polyline" && g.closed) return normalize(newellNormal(g.vertices));
  if (g.kind === "surface" && g.faces.length > 0) return faceNormal(g.faces[0]);
  return null;
}

export function extrude(g: Geometry, offset: Vec3): Geometry | null {
  if (length(offset) < TOLERANCE) return null;
  switch (g.kind) {
    case "segment":
      return sweepChain([g.start, g.end], offset);
    case "polyline":
      return g.closed
        ? prism([{ outer: g.vertices, holes: [] }], offset)
        : sweepChain(g.vertices, offset);
    case "surface":
      return prism(g.faces, offset);
    default:
      return null;
  }
}

function rectangleCorners(a: Vec3, b: Vec3, plane: Plane): Vec3[] | null {
  const d = sub(b, a);
  const du = scale(plane.u, dot(d, plane.u));
  const dv = scale(plane.v, dot(d, plane.v));
  if (length(du) < TOLERANCE || length(dv) < TOLERANCE) return null;
  return [a, add(a, du), add(add(a, du), dv), add(a, dv)];
}

export function rectangle(a: Vec3, b: Vec3, plane: Plane): Geometry | null {
  const corners = rectangleCorners(a, b, plane);
  return corners ? { kind: "polyline", vertices: corners, closed: true } : null;
}

export function box(a: Vec3, b: Vec3, height: number, plane: Plane): Geometry | null {
  const corners = rectangleCorners(a, b, plane);
  if (!corners || Math.abs(height) < TOLERANCE) return null;
  return prism([{ outer: corners, holes: [] }], scale(plane.normal, height));
}

function pointInPolygon(p: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i] as [number, number];
    const [xj, yj] = polygon[j] as [number, number];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

export interface PlanarSurfaceResult {
  surfaces: Geometry[];
  /** Indices of input loops that couldn't be used because they aren't flat. */
  skippedLoops: number[];
  skipped: number;
}

/** Nested loops alternate between outlines and holes, like rings in a tree trunk. */
export function planarSurfaces(loops: readonly Loop[]): PlanarSurfaceResult {
  const skippedLoops: number[] = [];
  const groups: { plane: Plane; loops: Loop[] }[] = [];
  for (const [index, loop] of loops.entries()) {
    const plane = planeOfLoop(loop);
    if (!plane || !isLoopPlanar(loop, plane)) {
      skippedLoops.push(index);
      continue;
    }
    const group = groups.find(
      (g) => length(cross(g.plane.normal, plane.normal)) < 1e-6 && isLoopPlanar(loop, g.plane),
    );
    if (group) group.loops.push(loop);
    else groups.push({ plane, loops: [loop] });
  }

  const surfaces: Geometry[] = [];
  for (const { plane, loops: members } of groups) {
    const local = members.map((loop) => loop.map((p) => toLocal(p, plane)));
    const areas = members.map(loopArea);
    const parent = members.map((_, i) => {
      let best = -1;
      members.forEach((_, j) => {
        if (i === j || areas[j] <= areas[i]) return;
        if (!pointInPolygon(local[i][0] as [number, number], local[j] as [number, number][]))
          return;
        if (best === -1 || areas[j] < areas[best]) best = j;
      });
      return best;
    });
    const depth = (i: number): number => (parent[i] === -1 ? 0 : 1 + depth(parent[i]));
    const wound = (loop: Loop, ccw: boolean): Loop =>
      dot(newellNormal(loop), plane.normal) >= 0 === ccw ? loop : [...loop].reverse();
    members.forEach((loop, i) => {
      if (depth(i) % 2 !== 0) return;
      const holes = members.filter((_, j) => parent[j] === i).map((h) => wound(h, false));
      surfaces.push({ kind: "surface", faces: [{ outer: wound(loop, true), holes }] });
    });
  }
  return { surfaces, skippedLoops, skipped: skippedLoops.length };
}

export interface JoinResult {
  readonly inputs: readonly number[];
  readonly output: Geometry;
}

function joinChains(items: { index: number; vertices: Vec3[] }[]): JoinResult[] {
  const chains = items.map((item) => ({ inputs: [item.index], vertices: item.vertices }));
  let merged = true;
  while (merged) {
    merged = false;
    search: for (let i = 0; i < chains.length; i++) {
      for (let j = i + 1; j < chains.length; j++) {
        const a = chains[i].vertices as Vec3[];
        const b = chains[j].vertices as Vec3[];
        const aStart = a[0];
        const aEnd = a[a.length - 1];
        const bStart = b[0];
        const bEnd = b[b.length - 1];
        let joined: Vec3[] | null = null;
        if (samePoint(aEnd, bStart)) joined = [...a, ...b.slice(1)];
        else if (samePoint(aEnd, bEnd)) joined = [...a, ...[...b].reverse().slice(1)];
        else if (samePoint(aStart, bEnd)) joined = [...b, ...a.slice(1)];
        else if (samePoint(aStart, bStart)) joined = [...[...b].reverse(), ...a.slice(1)];
        if (!joined) continue;
        chains[i] = { inputs: [...chains[i].inputs, ...chains[j].inputs], vertices: joined };
        chains.splice(j, 1);
        merged = true;
        break search;
      }
    }
  }
  return chains
    .filter((c) => c.inputs.length > 1)
    .map((c) => {
      const first = c.vertices[0];
      const last = c.vertices[c.vertices.length - 1];
      const closed = c.vertices.length > 3 && samePoint(first, last);
      return {
        inputs: c.inputs,
        output: {
          kind: "polyline",
          vertices: closed ? c.vertices.slice(0, -1) : c.vertices,
          closed,
        },
      };
    });
}

/** Chains Segments and open Polylines; merges Surfaces and Solids. Returns only what changed. */
export function join(geometries: readonly Geometry[]): JoinResult[] {
  const chains: { index: number; vertices: Vec3[] }[] = [];
  const faceInputs: number[] = [];
  geometries.forEach((g, index) => {
    if (g.kind === "segment") chains.push({ index, vertices: [g.start, g.end] });
    else if (g.kind === "polyline" && !g.closed) chains.push({ index, vertices: [...g.vertices] });
    else if (g.kind === "surface" || g.kind === "solid") faceInputs.push(index);
  });
  const results = joinChains(chains);
  if (faceInputs.length > 1) {
    const faces = faceInputs.flatMap((i) => {
      const g = geometries[i];
      return g.kind === "surface" || g.kind === "solid" ? [...g.faces] : [];
    });
    results.push({ inputs: faceInputs, output: facesToGeometry(faces) });
  }
  return results;
}

export function explode(g: Geometry): Geometry[] | null {
  if (g.kind === "polyline") {
    const links = g.closed ? g.vertices.length : g.vertices.length - 1;
    return Array.from({ length: links }, (_, i) => ({
      kind: "segment" as const,
      start: g.vertices[i],
      end: g.vertices[(i + 1) % g.vertices.length],
    }));
  }
  if ((g.kind === "surface" || g.kind === "solid") && g.faces.length > 1) {
    return g.faces.map((face) => ({ kind: "surface" as const, faces: [face] }));
  }
  return null;
}
