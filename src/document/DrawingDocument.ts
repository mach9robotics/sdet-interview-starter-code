import type { Geometry } from "../geometry";
import { Signal, SignalValue } from "../signals";
import {
  type DocumentChange,
  type DocumentState,
  type DrawingObject,
  LAYER_COLORS,
  type Layer,
} from "./types";

const HISTORY_LIMIT = 200;

export function emptyState(): DocumentState {
  const layer: Layer = {
    id: "layer-1",
    name: "Default",
    color: LAYER_COLORS[0],
    visible: true,
    locked: false,
  };
  return { objects: new Map(), layers: [layer], currentLayerId: layer.id };
}

function nextNumber(ids: Iterable<string>, prefix: string): number {
  let max = 0;
  for (const id of ids) {
    if (id.startsWith(prefix)) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
  }
  return max + 1;
}

export class DocumentDraft {
  private objects: Map<string, DrawingObject>;
  private layers: Layer[];
  private currentLayerId: string;
  private nextObject: number;
  private nextLayer: number;

  constructor(private readonly base: DocumentState) {
    this.objects = new Map(base.objects);
    this.layers = [...base.layers];
    this.currentLayerId = base.currentLayerId;
    this.nextObject = nextNumber(base.objects.keys(), "obj-");
    this.nextLayer = nextNumber(
      base.layers.map((l) => l.id),
      "layer-",
    );
  }

  get currentLayer(): string {
    return this.currentLayerId;
  }

  object(id: string): DrawingObject | undefined {
    return this.objects.get(id);
  }

  layer(id: string): Layer | undefined {
    return this.layers.find((l) => l.id === id);
  }

  allLayers(): readonly Layer[] {
    return this.layers;
  }

  addObject(geometry: Geometry, layerId = this.currentLayerId): string {
    const id = `obj-${this.nextObject++}`;
    this.objects.set(id, { id, layerId, geometry });
    return id;
  }

  updateObject(id: string, geometry: Geometry): void {
    const existing = this.objects.get(id);
    if (existing) this.objects.set(id, { ...existing, geometry });
  }

  setObjectLayer(id: string, layerId: string): void {
    const existing = this.objects.get(id);
    if (existing && existing.layerId !== layerId) this.objects.set(id, { ...existing, layerId });
  }

  removeObject(id: string): void {
    this.objects.delete(id);
  }

  addLayer(name?: string): string {
    const n = this.nextLayer++;
    const id = `layer-${n}`;
    const color = LAYER_COLORS[(n - 1) % LAYER_COLORS.length];
    this.layers.push({
      id,
      name: name ?? `Layer ${String(n).padStart(2, "0")}`,
      color,
      visible: true,
      locked: false,
    });
    return id;
  }

  updateLayer(id: string, patch: Partial<Omit<Layer, "id">>): void {
    this.layers = this.layers.map((l) => (l.id === id ? { ...l, ...patch } : l));
  }

  /** Deletes the Layer and every Object on it. The current Layer can't be removed. */
  removeLayer(id: string): void {
    if (id === this.currentLayerId || this.layers.length <= 1) return;
    this.layers = this.layers.filter((l) => l.id !== id);
    for (const [objectId, object] of this.objects)
      if (object.layerId === id) this.objects.delete(objectId);
  }

  moveLayer(id: string, toIndex: number): void {
    const from = this.layers.findIndex((l) => l.id === id);
    if (from === -1) return;
    const [layer] = this.layers.splice(from, 1);
    this.layers.splice(Math.max(0, Math.min(toIndex, this.layers.length)), 0, layer as Layer);
  }

  setCurrentLayer(id: string): void {
    const layer = this.layer(id);
    if (!layer) return;
    this.currentLayerId = id;
    if (!layer.visible) this.updateLayer(id, { visible: true });
  }

  build(): DocumentState {
    const base = this.base.layers;
    const layersUnchanged =
      base.length === this.layers.length && base.every((l, i) => l === this.layers[i]);
    return {
      objects: this.objects,
      layers: layersUnchanged ? base : this.layers,
      currentLayerId: this.currentLayerId,
    };
  }
}

interface HistoryEntry {
  readonly label: string;
  readonly state: DocumentState;
}

function diff(prev: DocumentState, next: DocumentState): DocumentChange {
  const added: string[] = [];
  const removed: string[] = [];
  const updated: string[] = [];
  for (const [id, object] of next.objects) {
    const before = prev.objects.get(id);
    if (!before) added.push(id);
    else if (before !== object) updated.push(id);
  }
  for (const id of prev.objects.keys()) if (!next.objects.has(id)) removed.push(id);
  const layersChanged = prev.layers !== next.layers || prev.currentLayerId !== next.currentLayerId;
  return { added, removed, updated, layersChanged };
}

const isEmpty = (c: DocumentChange) =>
  c.added.length + c.removed.length + c.updated.length === 0 && !c.layersChanged;

export class DrawingDocument {
  private current: DocumentState;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  readonly changed = new Signal<DocumentChange>();
  readonly layers: SignalValue<readonly Layer[]>;
  readonly currentLayerId: SignalValue<string>;
  readonly undoLabel = new SignalValue<string | null>(null);
  readonly redoLabel = new SignalValue<string | null>(null);

  constructor(initial: DocumentState = emptyState()) {
    this.current = initial;
    this.layers = new SignalValue(initial.layers);
    this.currentLayerId = new SignalValue(initial.currentLayerId);
  }

  get state(): DocumentState {
    return this.current;
  }

  object(id: string): DrawingObject | undefined {
    return this.current.objects.get(id);
  }

  layer(id: string): Layer | undefined {
    return this.current.layers.find((l) => l.id === id);
  }

  /** Runs `edit` against a draft; commits it as one undo step if anything changed. */
  transact<T>(label: string, edit: (draft: DocumentDraft) => T): T {
    const draft = new DocumentDraft(this.current);
    const result = edit(draft);
    const next = draft.build();
    const change = diff(this.current, next);
    if (isEmpty(change)) return result;
    this.undoStack.push({ label, state: this.current });
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.apply(next, change);
    return result;
  }

  undo(): string | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push({ label: entry.label, state: this.current });
    this.apply(entry.state, diff(this.current, entry.state));
    return entry.label;
  }

  redo(): string | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({ label: entry.label, state: this.current });
    this.apply(entry.state, diff(this.current, entry.state));
    return entry.label;
  }

  private apply(next: DocumentState, change: DocumentChange): void {
    this.current = next;
    this.layers.set(next.layers);
    this.currentLayerId.set(next.currentLayerId);
    this.undoLabel.set(this.undoStack.at(-1)?.label ?? null);
    this.redoLabel.set(this.redoStack.at(-1)?.label ?? null);
    this.changed.emit(change);
  }
}
