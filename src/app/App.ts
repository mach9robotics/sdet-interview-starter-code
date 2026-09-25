import { DrawingDocument, loadDrawing, Selection, saveDrawing } from "../document";
import { transformGeometry } from "../geometry";
import { count, t } from "../i18n/strings";
import { CompositeDisposable, type Disposable, SignalValue } from "../signals";
import { type ActionId, ToolManager } from "../tools";
import {
  CONSTRUCTION_PLANES,
  type DisplayMode,
  type TransformRequest,
  VIEW_NAMES,
  type ViewName,
  Viewport,
} from "../viewport";

const AUTOSAVE_DELAY_MS = 300;

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT")
  );
}

function formatValue(value: number, unit: string): string {
  if (unit === "°") return `${value.toFixed(1)}°`;
  if (unit === "×") return `×${value.toFixed(2)}`;
  return `${value.toFixed(3)} m`;
}

/** The composition root: owns the document, Selection, tools and (once mounted) the Viewport. */
export class App {
  readonly doc = new DrawingDocument(loadDrawing());
  readonly selection = new Selection();
  readonly view = new SignalValue<ViewName>("perspective");
  readonly displayMode = new SignalValue<DisplayMode>("shaded");
  readonly viewport = new SignalValue<Viewport | null>(null);
  readonly tools: ToolManager;
  promptInput: HTMLInputElement | null = null;
  private readonly disposables = new CompositeDisposable();
  private autosave: number | null = null;

  constructor() {
    const actions: Record<ActionId, () => void> = {
      delete: () => this.deleteSelection(),
      undo: () => this.undo(),
      redo: () => this.redo(),
      zoomExtents: () => this.viewport.value?.zoomExtents(),
      zoomSelected: () => this.viewport.value?.zoomSelected(),
      shaded: () => this.displayMode.set("shaded"),
      wireframe: () => this.displayMode.set("wireframe"),
    };
    this.tools = new ToolManager(
      this.doc,
      this.selection,
      () => CONSTRUCTION_PLANES[this.view.value],
      actions,
    );
    this.disposables.add(
      this.doc.changed.connect(() => {
        this.pruneSelection();
        this.scheduleAutosave();
      }),
    );
    const onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
    window.addEventListener("keydown", onKeyDown);
    this.disposables.add({ dispose: () => window.removeEventListener("keydown", onKeyDown) });
  }

  mountViewport(container: HTMLElement): Disposable {
    const viewport = new Viewport(
      container,
      this.doc,
      this.selection,
      this.tools,
      this.view,
      this.displayMode,
    );
    const connection = viewport.transformRequested.connect((request) =>
      this.applyTransform(request),
    );
    this.viewport.set(viewport);
    return {
      dispose: () => {
        connection.dispose();
        viewport.dispose();
        if (this.viewport.value === viewport) this.viewport.set(null);
      },
    };
  }

  dispose(): void {
    this.disposables.dispose();
  }

  private applyTransform({ matrix, label, value, unit }: TransformRequest): void {
    const ids = [...this.selection.ids.value];
    this.doc.transact(label, (d) => {
      for (const id of ids) {
        const object = d.object(id);
        if (object) d.updateObject(id, transformGeometry(object.geometry, matrix));
      }
    });
    this.tools.log(t("log.transform", { label, value: formatValue(value, unit) }), "command");
  }

  private deleteSelection(): void {
    const ids = [...this.selection.ids.value];
    if (ids.length === 0) {
      this.tools.log(t("error.selectToDelete"), "error");
      return;
    }
    this.doc.transact(t("command.delete"), (d) => {
      for (const id of ids) d.removeObject(id);
    });
    this.tools.log(t("log.deleted", { what: count(ids.length, "object") }), "info");
  }

  private undo(): void {
    const label = this.doc.undo();
    this.tools.log(
      label ? t("log.undid", { label }) : t("error.nothingToUndo"),
      label ? "info" : "error",
    );
  }

  private redo(): void {
    const label = this.doc.redo();
    this.tools.log(
      label ? t("log.redid", { label }) : t("error.nothingToRedo"),
      label ? "info" : "error",
    );
  }

  selectAll(): void {
    const { objects, layers } = this.doc.state;
    const pickable = new Set(layers.filter((l) => l.visible && !l.locked).map((l) => l.id));
    this.selection.set(
      [...objects.values()].filter((o) => pickable.has(o.layerId)).map((o) => o.id),
    );
  }

  /** Drops ids that were deleted or whose Layer became Hidden or Locked. */
  private pruneSelection(): void {
    const keep = [...this.selection.ids.value].filter((id) => {
      const object = this.doc.object(id);
      const layer = object && this.doc.layer(object.layerId);
      return layer?.visible && !layer.locked;
    });
    if (keep.length !== this.selection.size) this.selection.set(keep);
  }

  private scheduleAutosave(): void {
    if (this.autosave !== null) clearTimeout(this.autosave);
    this.autosave = window.setTimeout(() => {
      this.autosave = null;
      saveDrawing(this.doc.state);
    }, AUTOSAVE_DELAY_MS);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const mod = e.metaKey || e.ctrlKey;
    const inPrompt = e.target === this.promptInput;
    if (isEditable(e.target) && !(inPrompt && this.promptInput?.value === "" && mod)) return;
    const key = e.key;
    if (mod && key.toLowerCase() === "z") {
      e.preventDefault();
      this.tools.run(e.shiftKey ? "redo" : "undo");
      return;
    }
    if (mod && key.toLowerCase() === "a") {
      e.preventDefault();
      this.selectAll();
      return;
    }
    if (mod || e.altKey) return;
    if (key === "Escape") {
      if (!this.tools.escape()) this.selection.clear();
      return;
    }
    if (key === "Enter") {
      e.preventDefault();
      this.tools.enter();
      return;
    }
    const idle = !this.tools.toolActive.value;
    if (idle && (key === "Delete" || key === "Backspace")) {
      e.preventDefault();
      this.deleteSelection();
      return;
    }
    if (idle && key.toLowerCase() === "z") {
      this.tools.run("zoomExtents");
      return;
    }
    const viewIndex = ["1", "2", "3", "4"].indexOf(key);
    if (idle && viewIndex !== -1) {
      this.view.set(VIEW_NAMES[viewIndex] as ViewName);
      return;
    }
    if (key.length === 1 && key !== " ") this.promptInput?.focus();
  }
}
