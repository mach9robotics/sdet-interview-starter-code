import { faceLoops, reverseFace, triangulateFace } from "./face";
import type { Face, Loop, Vec3 } from "./types";
import { cross, dot, edgeKey, pointKey } from "./vec";

export interface Edge {
  readonly start: Vec3;
  readonly end: Vec3;
}

function loopEdges(loop: Loop): Edge[] {
  return loop.map((start, i) => ({ start, end: loop[(i + 1) % loop.length] }));
}

export function faceEdges(face: Face): Edge[] {
  return faceLoops(face).flatMap(loopEdges);
}

/** Undirected edges of a set of faces, each listed once. */
export function uniqueEdges(faces: readonly Face[]): Edge[] {
  const seen = new Map<string, Edge>();
  for (const face of faces) {
    for (const edge of faceEdges(face)) {
      const key = edgeKey(edge.start, edge.end);
      if (!seen.has(key)) seen.set(key, edge);
    }
  }
  return [...seen.values()];
}

function edgeUseCounts(faces: readonly Face[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const face of faces) {
    for (const edge of faceEdges(face)) {
      const key = edgeKey(edge.start, edge.end);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/** Edges used by exactly one face, in the direction that face walks them. */
export function boundaryEdges(faces: readonly Face[]): Edge[] {
  const counts = edgeUseCounts(faces);
  return faces.flatMap(faceEdges).filter((e) => counts.get(edgeKey(e.start, e.end)) === 1);
}

export function isClosed(faces: readonly Face[]): boolean {
  if (faces.length < 4) return false;
  for (const count of edgeUseCounts(faces).values()) if (count !== 2) return false;
  return true;
}

export function signedVolume(faces: readonly Face[]): number {
  let volume = 0;
  for (const face of faces) {
    for (const [a, b, c] of triangulateFace(face)) volume += dot(a, cross(b, c)) / 6;
  }
  return volume;
}

function directedKey(a: Vec3, b: Vec3): string {
  return `${pointKey(a)}>${pointKey(b)}`;
}

/**
 * Flips faces so neighbours walk each shared edge in opposite directions,
 * then (for closed shells) flips everything if the result points inward.
 */
export function orientFaces(faces: readonly Face[], { outward = true } = {}): Face[] {
  const result = [...faces];
  const byEdge = new Map<string, number[]>();
  result.forEach((face, index) => {
    for (const e of faceEdges(face)) {
      const key = edgeKey(e.start, e.end);
      byEdge.set(key, [...(byEdge.get(key) ?? []), index]);
    }
  });
  const visited = new Set<number>();
  for (let seed = 0; seed < result.length; seed++) {
    if (visited.has(seed)) continue;
    visited.add(seed);
    const queue = [seed];
    while (queue.length > 0) {
      const index = queue.shift() as number;
      const face = result[index];
      const directed = new Set(faceEdges(face).map((e) => directedKey(e.start, e.end)));
      for (const e of faceEdges(face)) {
        for (const other of byEdge.get(edgeKey(e.start, e.end)) ?? []) {
          if (visited.has(other)) continue;
          visited.add(other);
          const otherFace = result[other];
          const agrees = faceEdges(otherFace).some((oe) =>
            directed.has(directedKey(oe.start, oe.end)),
          );
          if (agrees) result[other] = reverseFace(otherFace);
          queue.push(other);
        }
      }
    }
  }
  return outward && signedVolume(result) < 0 ? result.map(reverseFace) : result;
}

export function uniqueVertices(points: readonly Vec3[]): Vec3[] {
  const seen = new Map<string, Vec3>();
  for (const p of points) if (!seen.has(pointKey(p))) seen.set(pointKey(p), p);
  return [...seen.values()];
}
