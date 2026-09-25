import type { Geometry } from "../geometry";
import { emptyState } from "./DrawingDocument";
import type { DocumentState, DrawingObject, Layer } from "./types";

const STORAGE_KEY = "lintel.drawing.v1";

interface SavedDrawing {
  version: 1;
  layers: Layer[];
  currentLayerId: string;
  objects: DrawingObject[];
}

const KINDS: readonly Geometry["kind"][] = ["point", "segment", "polyline", "surface", "solid"];

function isSavedDrawing(value: unknown): value is SavedDrawing {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<SavedDrawing>;
  return (
    v.version === 1 &&
    Array.isArray(v.layers) &&
    v.layers.length > 0 &&
    typeof v.currentLayerId === "string" &&
    Array.isArray(v.objects) &&
    v.objects.every((o) => typeof o?.id === "string" && KINDS.includes(o?.geometry?.kind))
  );
}

export function loadDrawing(storage: Storage = localStorage): DocumentState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const saved: unknown = JSON.parse(raw);
    if (!isSavedDrawing(saved)) return emptyState();
    const layerIds = new Set(saved.layers.map((l) => l.id));
    const objects = saved.objects.filter((o) => layerIds.has(o.layerId));
    return {
      layers: saved.layers,
      currentLayerId: layerIds.has(saved.currentLayerId)
        ? saved.currentLayerId
        : saved.layers[0].id,
      objects: new Map(objects.map((o) => [o.id, o])),
    };
  } catch {
    return emptyState();
  }
}

export function saveDrawing(state: DocumentState, storage: Storage = localStorage): void {
  const saved: SavedDrawing = {
    version: 1,
    layers: [...state.layers],
    currentLayerId: state.currentLayerId,
    objects: [...state.objects.values()],
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage full or blocked: the drawing stays in memory for this session.
  }
}
