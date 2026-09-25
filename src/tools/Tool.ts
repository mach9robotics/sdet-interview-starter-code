import type { DrawingDocument, Selection } from "../document";
import type { Geometry, Plane, Vec3 } from "../geometry";
import { t } from "../i18n/strings";
import { SignalValue } from "../signals";
import type { PointRequest } from "../viewport";

export type LogTone = "command" | "info" | "error";

export interface ToolHost {
  readonly doc: DrawingDocument;
  readonly selection: Selection;
  plane(): Plane;
  log(text: string, tone?: LogTone): void;
  finish(): void;
}

export abstract class Tool {
  abstract readonly label: string;
  readonly prompt = new SignalValue("");
  readonly request = new SignalValue<PointRequest | null>(null);
  readonly preview = new SignalValue<readonly Geometry[]>([]);
  /** The last point picked; `@` offsets are relative to it. */
  anchor: Vec3 | null = null;

  constructor(protected readonly host: ToolHost) {}

  abstract start(): void;

  hover(_point: Vec3 | null): void {}

  pick(_point: Vec3): void {}

  /** Returns false if this step doesn't take a number. */
  number(_value: number): boolean {
    return false;
  }

  /** Returns false if this step doesn't know the word. */
  word(_value: string): boolean {
    return false;
  }

  enter(): void {
    this.cancel();
  }

  cancel(): void {
    this.host.log(t("log.cancelled"), "info");
    this.host.finish();
  }

  protected ask(prompt: string, request: PointRequest | null = { kind: "plane" }): void {
    this.prompt.set(prompt);
    this.request.set(request);
  }

  protected done(message?: string): void {
    if (message) this.host.log(message, "info");
    this.preview.set([]);
    this.host.finish();
  }
}

/** A tool that works on the Selection, asking for one first if nothing is selected. */
export abstract class SelectionTool extends Tool {
  private awaitingSelection = false;

  protected abstract readonly verb: string;

  start(): void {
    if (this.host.selection.size > 0) {
      this.proceed([...this.host.selection.ids.value]);
      return;
    }
    this.awaitingSelection = true;
    this.ask(t("prompt.selectObjects", { verb: this.verb }), null);
  }

  enter(): void {
    if (!this.awaitingSelection) {
      this.cancel();
      return;
    }
    if (this.host.selection.size === 0) {
      this.cancel();
      return;
    }
    this.awaitingSelection = false;
    this.proceed([...this.host.selection.ids.value]);
  }

  protected geometries(ids: readonly string[]): { id: string; geometry: Geometry }[] {
    return ids.flatMap((id) => {
      const object = this.host.doc.object(id);
      return object ? [{ id, geometry: object.geometry }] : [];
    });
  }

  protected abstract proceed(ids: string[]): void;
}
