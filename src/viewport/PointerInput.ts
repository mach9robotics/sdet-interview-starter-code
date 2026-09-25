import { type Matrix4, Plane as ThreePlane, Vector3 } from "three";
import type { Selection } from "../document";
import type { Geometry, Vec3 } from "../geometry";
import { t } from "../i18n/strings";
import type { CompositeDisposable, ReadonlySignalValue, Signal, SignalValue } from "../signals";
import type { CameraRig } from "./CameraRig";
import type { DrawingScene } from "./DrawingScene";
import { AXIS_NAMES, type DragUpdate, type GumballHandle } from "./Gumball";
import { boxSelect, pickObject, type ScreenRect } from "./picking";
import { rayAt, type ScreenPoint, type ScreenSpace } from "./screen";
import { type Constraint, objectSnap, resolvePoint, type SnapKind } from "./snapping";
import { CONSTRUCTION_PLANES, type ViewName } from "./views";

/** What the active tool, if any, wants from the pointer. */
export type PointRequest =
  | { readonly kind: "plane" }
  | { readonly kind: "line"; readonly origin: Vec3; readonly direction: Vec3 };

/** The tool side of the Viewport; implemented by the ToolManager. */
export interface ViewportInput {
  readonly pointRequest: ReadonlySignalValue<PointRequest | null>;
  readonly preview: ReadonlySignalValue<readonly Geometry[]>;
  readonly toolActive: ReadonlySignalValue<boolean>;
  hover(point: Vec3 | null): void;
  pick(point: Vec3): void;
}

export interface SnapIndicator {
  readonly kind: SnapKind;
  readonly screen: ScreenPoint;
}

export interface SelectionRect extends ScreenRect {
  readonly crossing: boolean;
}

export interface GumballValueRequest {
  readonly handle: GumballHandle;
  readonly label: string;
  readonly unit: string;
  readonly screen: ScreenPoint;
}

export interface TransformRequest {
  readonly matrix: Matrix4;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
}

/** The Viewport's Readouts and requests, which PointerInput writes to. */
export interface PointerOutputs {
  readonly cursor: SignalValue<Vec3 | null>;
  readonly snap: SignalValue<SnapIndicator | null>;
  readonly selectionRect: SignalValue<SelectionRect | null>;
  readonly gumballValueRequested: Signal<GumballValueRequest>;
  readonly transformRequested: Signal<TransformRequest>;
}

export interface PointerInputContext {
  readonly canvas: HTMLCanvasElement;
  readonly scene: DrawingScene;
  readonly rig: CameraRig;
  readonly selection: Selection;
  readonly input: ViewportInput;
  readonly view: ReadonlySignalValue<ViewName>;
  readonly outputs: PointerOutputs;
  screen(): ScreenSpace;
  requestRender(): void;
  refreshGumball(): void;
}

type Gesture =
  | { kind: "navigate"; mode: "orbit" | "pan"; last: ScreenPoint }
  | { kind: "point"; down: ScreenPoint }
  | { kind: "select"; down: ScreenPoint; additive: boolean; subtractive: boolean; box: boolean }
  | {
      kind: "gumball";
      down: ScreenPoint;
      handle: GumballHandle;
      state: NonNullable<ReturnType<DrawingScene["gumball"]["beginDrag"]>>;
      update: DragUpdate | null;
      moved: boolean;
    };

const CLICK_SLOP_PX = 4;

/**
 * Turns pointer, wheel and Shift events on the canvas into camera moves,
 * tool points, selection and Gumball drags. One gesture runs at a time, from
 * pointerdown to pointerup.
 */
export class PointerInput {
  private gesture: Gesture | null = null;
  private pointer: ScreenPoint | null = null;
  private shift = false;

  constructor(private readonly ctx: PointerInputContext) {}

  attach(disposables: CompositeDisposable): void {
    const { canvas } = this.ctx;
    const listen = <K extends keyof HTMLElementEventMap>(
      target: HTMLElement | Window,
      type: K,
      handler: (e: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, handler as EventListener, options);
      disposables.add({
        dispose: () => target.removeEventListener(type, handler as EventListener, options),
      });
    };
    listen(canvas, "pointerdown", (e) => this.onPointerDown(e));
    listen(canvas, "pointermove", (e) => this.onPointerMove(e));
    listen(canvas, "pointerup", (e) => this.onPointerUp(e));
    listen(canvas, "pointerleave", () => this.onPointerLeave());
    listen(canvas, "wheel", (e) => this.onWheel(e), { passive: false });
    listen(canvas, "contextmenu", (e) => e.preventDefault());
    listen(window, "keydown", (e) => this.onShift(e.shiftKey));
    listen(window, "keyup", (e) => this.onShift(e.shiftKey));
  }

  /** Re-resolves the cursor after anything that could change what's under it. */
  refreshHover(): void {
    const at = this.pointer;
    if (!at || this.gesture) return;
    const { input, scene, outputs } = this.ctx;
    const request = input.pointRequest.value;
    const snapping = this.shift && request !== null;
    const resolved = this.resolve(at, snapping);
    outputs.cursor.set(resolved?.point ?? null);
    this.setSnap(
      snapping && resolved?.kind ? { kind: resolved.kind, screen: at } : null,
      resolved?.point,
    );
    if (request) {
      input.hover(resolved?.point ?? null);
      if (scene.gumball.highlight(null)) this.ctx.requestRender();
    } else if (!input.toolActive.value) {
      const handle = scene.gumball.hit(rayAt(at, this.ctx.screen()));
      if (scene.gumball.highlight(handle)) this.ctx.requestRender();
    }
  }

  private localPoint(e: PointerEvent | WheelEvent): ScreenPoint {
    const rect = this.ctx.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private constraint(): Constraint {
    const request = this.ctx.input.pointRequest.value;
    const plane = CONSTRUCTION_PLANES[this.ctx.view.value];
    return !request || request.kind === "plane" ? { kind: "plane", plane } : request;
  }

  private resolve(at: ScreenPoint, snapping: boolean) {
    const screen = this.ctx.screen();
    const ray = rayAt(at, screen);
    return resolvePoint(this.ctx.scene.visible(), ray, at, screen, this.constraint(), snapping);
  }

  private setSnap(indicator: SnapIndicator | null, point?: Vec3): void {
    this.ctx.outputs.snap.set(indicator);
    this.ctx.scene.showSnapMarker(indicator && point ? point : null);
    this.ctx.requestRender();
  }

  private onShift(shift: boolean): void {
    if (shift === this.shift) return;
    this.shift = shift;
    this.refreshHover();
  }

  private onPointerDown(e: PointerEvent): void {
    const at = this.localPoint(e);
    const { canvas, input, scene, view } = this.ctx;
    this.shift = e.shiftKey;
    canvas.setPointerCapture(e.pointerId);
    if (e.button === 2 || e.button === 1) {
      const mode = e.button === 2 && view.value === "perspective" ? "orbit" : "pan";
      this.gesture = { kind: "navigate", mode, last: at };
      return;
    }
    if (e.button !== 0) return;
    if (input.pointRequest.value) {
      this.gesture = { kind: "point", down: at };
      return;
    }
    const ray = rayAt(at, this.ctx.screen());
    const handle = input.toolActive.value ? null : scene.gumball.hit(ray);
    const state = handle && scene.gumball.beginDrag(handle, ray);
    if (handle && state) {
      this.gesture = { kind: "gumball", down: at, handle, state, update: null, moved: false };
      return;
    }
    this.gesture = {
      kind: "select",
      down: at,
      additive: e.shiftKey,
      subtractive: e.metaKey || e.ctrlKey,
      box: false,
    };
  }

  private onPointerMove(e: PointerEvent): void {
    const at = this.localPoint(e);
    this.pointer = at;
    this.shift = e.shiftKey;
    const g = this.gesture;
    switch (g?.kind) {
      case "navigate":
        this.navigate(g, at);
        break;
      case "gumball":
        this.dragGumball(g, at, e.shiftKey);
        break;
      case "select":
        this.dragBox(g, at);
        break;
      default:
        this.refreshHover();
    }
  }

  private navigate(g: Extract<Gesture, { kind: "navigate" }>, at: ScreenPoint): void {
    const dx = at.x - g.last.x;
    const dy = at.y - g.last.y;
    g.last = at;
    if (g.mode === "orbit") this.ctx.rig.orbit(dx, dy);
    else this.ctx.rig.pan(dx, dy);
  }

  private dragGumball(
    g: Extract<Gesture, { kind: "gumball" }>,
    at: ScreenPoint,
    snap: boolean,
  ): void {
    if (!g.moved && Math.hypot(at.x - g.down.x, at.y - g.down.y) < CLICK_SLOP_PX) return;
    g.moved = true;
    const { scene, selection } = this.ctx;
    const screen = this.ctx.screen();
    const ray = rayAt(at, screen);
    const others = scene.visible().filter((v) => !selection.has(v.id));
    const target = snap ? (objectSnap(others, ray, at, screen)?.point ?? null) : null;
    g.update = scene.gumball.drag(g.state, ray, snap, target);
    if (!g.update) return;
    scene.previewTransform(g.update.matrix);
    scene.gumball.group.position.copy(g.state.origin.clone().applyMatrix4(g.update.matrix));
    this.ctx.requestRender();
  }

  private dragBox(g: Extract<Gesture, { kind: "select" }>, at: ScreenPoint): void {
    if (!g.box && Math.hypot(at.x - g.down.x, at.y - g.down.y) < CLICK_SLOP_PX) return;
    g.box = true;
    this.ctx.outputs.selectionRect.set({
      x: Math.min(g.down.x, at.x),
      y: Math.min(g.down.y, at.y),
      width: Math.abs(at.x - g.down.x),
      height: Math.abs(at.y - g.down.y),
      crossing: at.x < g.down.x,
    });
  }

  private onPointerUp(e: PointerEvent): void {
    const at = this.localPoint(e);
    const g = this.gesture;
    this.gesture = null;
    const { canvas } = this.ctx;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    switch (g?.kind) {
      case "point":
        this.finishPoint(g, at, e.shiftKey);
        break;
      case "gumball":
        this.finishGumball(g, at);
        break;
      case "select":
        this.finishSelect(g, at);
        break;
    }
  }

  private finishPoint(
    g: Extract<Gesture, { kind: "point" }>,
    at: ScreenPoint,
    snap: boolean,
  ): void {
    if (Math.hypot(at.x - g.down.x, at.y - g.down.y) > CLICK_SLOP_PX) return;
    const resolved = this.resolve(at, snap);
    if (resolved) this.ctx.input.pick(resolved.point);
  }

  /** A drag commits the transform; a click without movement asks for an exact value instead. */
  private finishGumball(g: Extract<Gesture, { kind: "gumball" }>, at: ScreenPoint): void {
    this.ctx.scene.previewTransform(null);
    this.ctx.refreshGumball();
    const { handle } = g;
    if (!g.moved) {
      this.ctx.outputs.gumballValueRequested.emit({
        handle,
        label: gumballLabel(handle),
        unit: gumballUnit(handle),
        screen: at,
      });
    } else if (g.update) {
      this.ctx.outputs.transformRequested.emit({
        matrix: g.update.matrix,
        label: gumballLabel(handle),
        value: g.update.value,
        unit: gumballUnit(handle),
      });
    }
  }

  private finishSelect(g: Extract<Gesture, { kind: "select" }>, at: ScreenPoint): void {
    const { scene, selection, outputs } = this.ctx;
    const screen = this.ctx.screen();
    const rect = outputs.selectionRect.value;
    const ids =
      g.box && rect
        ? boxSelect(scene.pickable(), rect, rect.crossing, screen)
        : [pickObject(scene.pickable(), at, screen)].filter((id): id is string => id !== null);
    outputs.selectionRect.set(null);
    if (g.subtractive) selection.remove(ids);
    else if (g.additive) selection.add(ids);
    else selection.set(ids);
  }

  private onPointerLeave(): void {
    if (this.gesture) return;
    this.pointer = null;
    this.ctx.outputs.cursor.set(null);
    this.setSnap(null);
    this.ctx.input.hover(null);
    if (this.ctx.scene.gumball.highlight(null)) this.ctx.requestRender();
  }

  /** Zooms toward the ground point under the cursor, or a point ahead of the camera if there is none. */
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const { rig, view } = this.ctx;
    const ray = rayAt(this.localPoint(e), this.ctx.screen());
    let anchor: Vector3 | null = ray.origin.clone();
    if (view.value === "perspective") {
      const camera = rig.camera;
      const forward = camera.getWorldDirection(new Vector3());
      const ground = new ThreePlane(new Vector3(0, 0, 1), 0);
      anchor = ray.intersectPlane(ground, new Vector3());
      if (!anchor || anchor.distanceTo(camera.position) > 2000) {
        const ahead = camera.position.clone().addScaledVector(forward, 10);
        const facing = new ThreePlane().setFromNormalAndCoplanarPoint(forward, ahead);
        anchor = ray.intersectPlane(facing, new Vector3());
      }
    }
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    rig.zoom(Math.exp(delta * 0.0015), anchor);
    this.refreshHover();
  }
}

export function gumballLabel(handle: GumballHandle): string {
  return t(`gumball.${handle.operation}`, { axis: AXIS_NAMES[handle.axis] });
}

export function gumballUnit(handle: GumballHandle): string {
  return { move: "m", rotate: "°", scale: "×" }[handle.operation];
}
