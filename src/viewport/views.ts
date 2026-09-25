import { makePlane, type Plane, type Vec3 } from "../geometry";

export type ViewName = "top" | "front" | "right" | "perspective";

export const VIEW_NAMES: readonly ViewName[] = ["top", "front", "right", "perspective"];

export const CONSTRUCTION_PLANES: Record<ViewName, Plane> = {
  top: makePlane([0, 0, 0], [0, 0, 1], [1, 0, 0]),
  perspective: makePlane([0, 0, 0], [0, 0, 1], [1, 0, 0]),
  front: makePlane([0, 0, 0], [0, -1, 0], [1, 0, 0]),
  right: makePlane([0, 0, 0], [1, 0, 0], [0, 1, 0]),
};

export interface OrthoFraming {
  /** Direction the camera looks along. */
  readonly look: Vec3;
  readonly up: Vec3;
}

export const ORTHO_FRAMING: Record<Exclude<ViewName, "perspective">, OrthoFraming> = {
  top: { look: [0, 0, -1], up: [0, 1, 0] },
  front: { look: [0, 1, 0], up: [0, 0, 1] },
  right: { look: [-1, 0, 0], up: [0, 0, 1] },
};
