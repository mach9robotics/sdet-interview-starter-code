import { describe, expect, it, vi } from "vitest";
import { DrawingDocument, loadDrawing, saveDrawing } from ".";

const point = { kind: "point", position: [1, 2, 3] } as const;

describe("DrawingDocument", () => {
  it("commits a transaction as one undo step and reports what changed", () => {
    const doc = new DrawingDocument();
    const changed = vi.fn();
    doc.changed.connect(changed);
    const id = doc.transact("Point", (d) => d.addObject(point));
    expect(changed).toHaveBeenLastCalledWith({
      added: [id],
      removed: [],
      updated: [],
      layersChanged: false,
    });
    expect(doc.undoLabel.value).toBe("Point");
    doc.undo();
    expect(doc.state.objects.size).toBe(0);
    doc.redo();
    expect(doc.object(id)?.geometry).toEqual(point);
  });

  it("skips empty transactions", () => {
    const doc = new DrawingDocument();
    doc.transact("Nothing", () => {});
    expect(doc.undoLabel.value).toBeNull();
  });

  it("deletes a Layer's Objects with it, but never the current Layer", () => {
    const doc = new DrawingDocument();
    const layer = doc.transact("New layer", (d) => d.addLayer("Walls"));
    doc.transact("Point", (d) => d.addObject(point, layer));
    doc.transact("Delete current", (d) => d.removeLayer(doc.state.currentLayerId));
    expect(doc.state.layers).toHaveLength(2);
    doc.transact("Delete walls", (d) => d.removeLayer(layer));
    expect(doc.state.layers).toHaveLength(1);
    expect(doc.state.objects.size).toBe(0);
  });

  it("keeps ids unique after a reload", () => {
    const storage = new Map<string, string>();
    const fake = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
    } as Storage;
    const doc = new DrawingDocument();
    const first = doc.transact("Point", (d) => d.addObject(point));
    saveDrawing(doc.state, fake);
    const reloaded = new DrawingDocument(loadDrawing(fake));
    const second = reloaded.transact("Point", (d) => d.addObject(point));
    expect(second).not.toBe(first);
    expect(reloaded.state.objects.size).toBe(2);
  });
});
