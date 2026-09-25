import type { Geometry } from "../geometry";

export interface Layer {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly visible: boolean;
  readonly locked: boolean;
}

export interface DrawingObject {
  readonly id: string;
  readonly layerId: string;
  readonly geometry: Geometry;
}

export interface DocumentState {
  readonly objects: ReadonlyMap<string, DrawingObject>;
  readonly layers: readonly Layer[];
  readonly currentLayerId: string;
}

export interface DocumentChange {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly updated: readonly string[];
  readonly layersChanged: boolean;
}

export const LAYER_COLORS = [
  "#d8dde6",
  "#e0685c",
  "#5aa7e8",
  "#6cc28a",
  "#e8b04a",
  "#b287e0",
  "#4fc4c0",
  "#e27fb0",
] as const;
