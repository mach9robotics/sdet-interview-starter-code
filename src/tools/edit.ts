import { Matrix4, Vector3 } from "three";
import {
  cross,
  type Geometry,
  length,
  normalize,
  samePoint,
  sub,
  transformGeometry,
  type Vec3,
} from "../geometry";
import { count, t } from "../i18n/strings";
import { SelectionTool } from "./Tool";

abstract class DuplicatingTool extends SelectionTool {
  protected sources: { id: string; geometry: Geometry }[] = [];

  protected show(matrices: Matrix4[]): void {
    this.preview.set(
      matrices.flatMap((m) => this.sources.map((s) => transformGeometry(s.geometry, m))),
    );
  }

  protected add(label: string, matrices: Matrix4[]): string[] {
    return this.host.doc.transact(label, (d) =>
      matrices.flatMap((m) =>
        this.sources.map((s) =>
          d.addObject(transformGeometry(s.geometry, m), d.object(s.id)?.layerId),
        ),
      ),
    );
  }
}

const translation = (from: Vec3, to: Vec3) =>
  new Matrix4().makeTranslation(new Vector3(...sub(to, from)));

export class CopyTool extends DuplicatingTool {
  readonly label = t("command.copy");
  protected readonly verb = t("verb.copy");
  private from: Vec3 | null = null;
  private copies = 0;

  protected proceed(ids: string[]): void {
    this.sources = this.geometries(ids);
    this.ask(t("prompt.copyFrom"));
  }

  hover(point: Vec3 | null): void {
    this.show(this.from && point ? [translation(this.from, point)] : []);
  }

  pick(point: Vec3): void {
    if (!this.from) {
      this.from = point;
      this.anchor = point;
      this.ask(t("prompt.copyTo"));
      return;
    }
    this.add(t("command.copy"), [translation(this.from, point)]);
    this.copies++;
    this.anchor = point;
  }

  enter(): void {
    if (!this.from) {
      super.enter();
      return;
    }
    this.done(t("log.made", { what: count(this.copies, "copy") }));
  }

  cancel(): void {
    if (this.copies > 0) {
      this.enter();
      return;
    }
    super.cancel();
  }
}

export class MirrorTool extends DuplicatingTool {
  readonly label = t("command.mirror");
  protected readonly verb = t("verb.mirror");
  private start_: Vec3 | null = null;

  protected proceed(ids: string[]): void {
    this.sources = this.geometries(ids);
    this.ask(t("prompt.mirrorStart"));
  }

  /** The mirror plane contains the picked line and the Construction Plane's normal. */
  private reflection(end: Vec3): Matrix4 | null {
    const start = this.start_ as Vec3;
    const normal = normalize(cross(sub(end, start), this.host.plane().normal));
    if (length(normal) === 0) return null;
    const [a, b, c] = normal;
    const m = new Matrix4().set(
      1 - 2 * a * a,
      -2 * a * b,
      -2 * a * c,
      0,
      -2 * a * b,
      1 - 2 * b * b,
      -2 * b * c,
      0,
      -2 * a * c,
      -2 * b * c,
      1 - 2 * c * c,
      0,
      0,
      0,
      0,
      1,
    );
    const to = new Matrix4().makeTranslation(new Vector3(...start));
    const from = new Matrix4().makeTranslation(new Vector3(...start).negate());
    return to.multiply(m).multiply(from);
  }

  hover(point: Vec3 | null): void {
    const m =
      this.start_ && point && !samePoint(this.start_, point) ? this.reflection(point) : null;
    this.show(m ? [m] : []);
  }

  pick(point: Vec3): void {
    if (!this.start_) {
      this.start_ = point;
      this.anchor = point;
      this.ask(t("prompt.mirrorEnd"));
      return;
    }
    const m = samePoint(this.start_, point) ? null : this.reflection(point);
    if (!m) {
      this.host.log(t("error.pickDifferentEnd"), "error");
      return;
    }
    this.add(t("command.mirror"), [m]);
    this.done(t("log.mirrored", { what: count(this.sources.length, "object") }));
  }
}

export class ArrayTool extends DuplicatingTool {
  readonly label = t("command.array");
  protected readonly verb = t("verb.array");
  private count: number | null = null;
  private from: Vec3 | null = null;

  protected proceed(ids: string[]): void {
    this.sources = this.geometries(ids);
    this.ask(t("prompt.arrayCount"), null);
  }

  private steps(to: Vec3): Matrix4[] {
    const step = sub(to, this.from as Vec3);
    return Array.from({ length: (this.count as number) - 1 }, (_, i) =>
      new Matrix4().makeTranslation(new Vector3(...step).multiplyScalar(i + 1)),
    );
  }

  number(value: number): boolean {
    if (this.count !== null) return false;
    if (!Number.isInteger(value) || value < 2) {
      this.host.log(t("error.arrayCount"), "error");
      return true;
    }
    this.count = value;
    this.ask(t("prompt.arrayFirst"));
    return true;
  }

  enter(): void {
    if (this.count === null && this.sources.length > 0) {
      this.number(3);
      return;
    }
    super.enter();
  }

  hover(point: Vec3 | null): void {
    this.show(this.from && point && !samePoint(this.from, point) ? this.steps(point) : []);
  }

  pick(point: Vec3): void {
    if (this.count === null) return;
    if (!this.from) {
      this.from = point;
      this.anchor = point;
      this.ask(t("prompt.arraySecond"));
      return;
    }
    if (samePoint(this.from, point)) {
      this.host.log(t("error.pickDifferentPoint"), "error");
      return;
    }
    const made = this.add(t("command.array"), this.steps(point));
    this.done(t("log.made", { what: count(made.length, "object") }));
  }
}
