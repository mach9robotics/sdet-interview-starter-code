import {
  box,
  dot,
  type Geometry,
  makePlane,
  rectangle,
  samePoint,
  sub,
  type Vec3,
} from "../geometry";
import { count, t } from "../i18n/strings";
import { Tool } from "./Tool";

export class PointTool extends Tool {
  readonly label = t("command.point");

  start(): void {
    this.ask(t("prompt.pointLocation"));
  }

  pick(point: Vec3): void {
    this.host.doc.transact(t("command.point"), (d) =>
      d.addObject({ kind: "point", position: point }),
    );
    this.done(t("log.created", { what: count(1, "point") }));
  }
}

export class SegmentTool extends Tool {
  readonly label = t("command.segment");
  private start_: Vec3 | null = null;

  start(): void {
    this.ask(t("prompt.segmentStart"));
  }

  hover(point: Vec3 | null): void {
    this.preview.set(
      this.start_ && point ? [{ kind: "segment", start: this.start_, end: point }] : [],
    );
  }

  pick(point: Vec3): void {
    if (!this.start_) {
      this.start_ = point;
      this.anchor = point;
      this.ask(t("prompt.segmentEnd"));
      return;
    }
    if (samePoint(this.start_, point)) {
      this.host.log(t("error.segmentPoints"), "error");
      return;
    }
    const start = this.start_;
    this.host.doc.transact(t("command.segment"), (d) =>
      d.addObject({ kind: "segment", start, end: point }),
    );
    this.done(t("log.created", { what: count(1, "segment") }));
  }
}

export class PolylineTool extends Tool {
  readonly label = t("command.polyline");
  private vertices: Vec3[] = [];

  start(): void {
    this.ask(t("prompt.polylineStart"));
  }

  hover(point: Vec3 | null): void {
    const vertices = point && this.vertices.length > 0 ? [...this.vertices, point] : this.vertices;
    this.preview.set(vertices.length >= 2 ? [{ kind: "polyline", vertices, closed: false }] : []);
  }

  pick(point: Vec3): void {
    const first = this.vertices[0];
    if (first && this.vertices.length >= 3 && samePoint(first, point)) {
      this.commit(true);
      return;
    }
    const last = this.vertices.at(-1);
    if (last && samePoint(last, point)) return;
    this.vertices.push(point);
    this.anchor = point;
    this.ask(
      this.vertices.length >= 3 ? t("prompt.polylineNextClosable") : t("prompt.polylineNext"),
    );
  }

  word(value: string): boolean {
    if (value === "c" || value === "close") {
      if (this.vertices.length < 3) this.host.log(t("error.closeNeedsThree"), "error");
      else this.commit(true);
      return true;
    }
    if (value === "u" || value === "undo") {
      this.vertices.pop();
      this.anchor = this.vertices.at(-1) ?? null;
      this.ask(this.vertices.length === 0 ? t("prompt.polylineStart") : t("prompt.polylineNext"));
      this.hover(null);
      return true;
    }
    return false;
  }

  enter(): void {
    if (this.vertices.length < 2) {
      this.cancel();
      return;
    }
    this.commit(false);
  }

  private commit(closed: boolean): void {
    const [a, b] = this.vertices as [Vec3, Vec3];
    const geometry: Geometry =
      this.vertices.length === 2 && !closed
        ? { kind: "segment", start: a, end: b }
        : { kind: "polyline", vertices: this.vertices, closed };
    const kind = t(`kind.${geometry.kind}`);
    this.host.doc.transact(kind, (d) => d.addObject(geometry));
    this.done(
      closed
        ? t("log.createdClosed", { kind })
        : t("log.created", { what: count(1, geometry.kind) }),
    );
  }
}

export class RectangleTool extends Tool {
  readonly label = t("command.rectangle");
  private first: Vec3 | null = null;

  start(): void {
    this.ask(t("prompt.rectangleFirst"));
  }

  private shape(corner: Vec3): Geometry | null {
    if (!this.first) return null;
    const plane = this.host.plane();
    return rectangle(this.first, corner, makePlane(this.first, plane.normal, plane.u));
  }

  hover(point: Vec3 | null): void {
    const shape = point && this.shape(point);
    this.preview.set(shape ? [shape] : []);
  }

  pick(point: Vec3): void {
    if (!this.first) {
      this.first = point;
      this.anchor = point;
      this.ask(t("prompt.rectangleOther"));
      return;
    }
    const shape = this.shape(point);
    if (!shape) {
      this.host.log(t("error.cornersDiffer"), "error");
      return;
    }
    this.host.doc.transact(t("command.rectangle"), (d) => d.addObject(shape));
    this.done(t("log.createdClosed", { kind: t("kind.polyline") }));
  }
}

export class BoxTool extends Tool {
  readonly label = t("command.box");
  private first: Vec3 | null = null;
  private second: Vec3 | null = null;

  start(): void {
    this.ask(t("prompt.boxFirst"));
  }

  private basePlane() {
    const plane = this.host.plane();
    return makePlane(this.first as Vec3, plane.normal, plane.u);
  }

  private heightAt(point: Vec3): number {
    return dot(sub(point, this.second as Vec3), this.host.plane().normal);
  }

  hover(point: Vec3 | null): void {
    if (!point || !this.first) {
      this.preview.set([]);
      return;
    }
    if (!this.second) {
      const base = rectangle(this.first, point, this.basePlane());
      this.preview.set(base ? [base] : []);
      return;
    }
    const solid = box(this.first, this.second, this.heightAt(point), this.basePlane());
    this.preview.set(solid ? [solid] : []);
  }

  pick(point: Vec3): void {
    if (!this.first) {
      this.first = point;
      this.anchor = point;
      this.ask(t("prompt.boxOther"));
      return;
    }
    if (!this.second) {
      if (!rectangle(this.first, point, this.basePlane())) {
        this.host.log(t("error.cornersDiffer"), "error");
        return;
      }
      this.second = point;
      this.anchor = point;
      this.ask(t("prompt.boxHeight"), {
        kind: "line",
        origin: point,
        direction: this.host.plane().normal,
      });
      return;
    }
    this.commit(this.heightAt(point));
  }

  number(value: number): boolean {
    if (!this.second) return false;
    this.commit(value);
    return true;
  }

  private commit(height: number): void {
    const solid = box(this.first as Vec3, this.second as Vec3, height, this.basePlane());
    if (!solid) {
      this.host.log(t("error.boxHeight"), "error");
      return;
    }
    this.host.doc.transact(t("command.box"), (d) => d.addObject(solid));
    this.done(t("log.created", { what: count(1, "solid") }));
  }
}
