import {
  BoxGeometry,
  type BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Plane,
  type Ray,
  Raycaster,
  TorusGeometry,
  Vector3,
} from "three";
import type { Vec3 } from "../geometry";
import { VIEWPORT_COLORS } from "./palette";
import { closestOnLine } from "./screen";

export type GumballOperation = "move" | "rotate" | "scale";
export type Axis = 0 | 1 | 2;

export interface GumballHandle {
  readonly operation: GumballOperation;
  readonly axis: Axis;
}

export const AXIS_NAMES = ["X", "Y", "Z"] as const;
const AXIS_COLORS = [VIEWPORT_COLORS.axisX, VIEWPORT_COLORS.axisY, VIEWPORT_COLORS.axisZ];
const SIZE_PX = 110;
const ROTATE_SNAP = MathUtils.degToRad(15);
const SCALE_SNAP = 0.1;
const MOVE_GRID = 1;

const unit = (axis: Axis) =>
  new Vector3(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0);

/** Rotates a +Y-aligned primitive onto `axis`. */
function alongAxis(geometry: BufferGeometry, axis: Axis): BufferGeometry {
  if (axis === 0) geometry.rotateZ(-Math.PI / 2);
  if (axis === 2) geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** A quarter arc in the plane perpendicular to `axis`, spanning the two other axes. */
function arc(radius: number, tube: number, axis: Axis): BufferGeometry {
  const g = new TorusGeometry(radius, tube, 6, 32, Math.PI / 2 - 0.3).rotateZ(0.15);
  if (axis === 0) g.rotateY(-Math.PI / 2);
  if (axis === 1) g.rotateX(Math.PI / 2);
  return g;
}

interface DragState {
  readonly handle: GumballHandle;
  readonly origin: Vector3;
  readonly start: number;
  readonly startVector?: Vector3;
  accumulated: number;
  previousAngle: number;
}

export interface DragUpdate {
  readonly matrix: Matrix4;
  readonly value: number;
}

export function matrixFor(handle: GumballHandle, value: number, origin: Vector3): Matrix4 {
  const axis = unit(handle.axis);
  if (handle.operation === "move") return new Matrix4().makeTranslation(axis.multiplyScalar(value));
  const toOrigin = new Matrix4().makeTranslation(origin.clone().negate());
  const back = new Matrix4().makeTranslation(origin);
  const core =
    handle.operation === "rotate"
      ? new Matrix4().makeRotationAxis(axis, MathUtils.degToRad(value))
      : new Matrix4().makeScale(
          handle.axis === 0 ? value : 1,
          handle.axis === 1 ? value : 1,
          handle.axis === 2 ? value : 1,
        );
  return back.multiply(core).multiply(toOrigin);
}

export class Gumball {
  readonly group = new Group();
  private readonly pickables: Mesh[] = [];
  private readonly materials = new Map<string, { material: MeshBasicMaterial; color: Color }>();
  private hovered: string | null = null;

  constructor() {
    this.group.visible = false;
    for (const axis of [0, 1, 2] as Axis[]) {
      const color = new Color(AXIS_COLORS[axis]);
      const add = (
        operation: GumballOperation,
        visible: BufferGeometry[],
        pick: BufferGeometry,
      ) => {
        const key = `${operation}-${axis}`;
        const material = new MeshBasicMaterial({
          color,
          depthTest: false,
          depthWrite: false,
          transparent: true,
        });
        this.materials.set(key, { material, color });
        for (const g of visible) {
          const mesh = new Mesh(g, material);
          mesh.renderOrder = 10;
          this.group.add(mesh);
        }
        const target = new Mesh(pick, new MeshBasicMaterial({ visible: false }));
        target.userData.handle = { operation, axis } satisfies GumballHandle;
        this.pickables.push(target);
        this.group.add(target);
      };
      const shaft = alongAxis(
        new CylinderGeometry(0.012, 0.012, 0.62, 8).translate(0, 0.52, 0),
        axis,
      );
      const tip = alongAxis(new ConeGeometry(0.05, 0.16, 16).translate(0, 0.91, 0), axis);
      add(
        "move",
        [shaft, tip],
        alongAxis(new CylinderGeometry(0.06, 0.06, 0.62, 8).translate(0, 0.68, 0), axis),
      );
      const cube = alongAxis(new BoxGeometry(0.075, 0.075, 0.075).translate(0, 0.33, 0), axis);
      add(
        "scale",
        [cube],
        alongAxis(new BoxGeometry(0.14, 0.14, 0.14).translate(0, 0.33, 0), axis),
      );
      add("rotate", [arc(0.62, 0.012, axis)], arc(0.62, 0.06, axis));
    }
  }

  get visible(): boolean {
    return this.group.visible;
  }

  get origin(): Vector3 {
    return this.group.position;
  }

  place(origin: Vec3 | null): void {
    this.group.visible = origin !== null;
    if (origin) this.group.position.set(...origin);
  }

  /** Keeps the widget a constant size on screen. */
  fit(worldPerPixel: number): void {
    this.group.scale.setScalar(worldPerPixel * SIZE_PX);
    this.group.updateMatrixWorld(true);
  }

  hit(ray: Ray): GumballHandle | null {
    if (!this.group.visible) return null;
    this.group.updateMatrixWorld(true);
    const [nearest] = new Raycaster(ray.origin, ray.direction).intersectObjects(
      this.pickables,
      false,
    );
    return (nearest?.object.userData.handle as GumballHandle | undefined) ?? null;
  }

  highlight(handle: GumballHandle | null): boolean {
    const key = handle ? `${handle.operation}-${handle.axis}` : null;
    if (key === this.hovered) return false;
    this.hovered = key;
    for (const [k, { material, color }] of this.materials) {
      material.color.copy(k === key ? new Color(VIEWPORT_COLORS.hover) : color);
    }
    return true;
  }

  beginDrag(handle: GumballHandle, ray: Ray): DragState | null {
    const origin = this.origin.clone();
    const axis = unit(handle.axis);
    if (handle.operation === "rotate") {
      const hit = ray.intersectPlane(
        new Plane().setFromNormalAndCoplanarPoint(axis, origin),
        new Vector3(),
      );
      if (!hit) return null;
      return {
        handle,
        origin,
        start: 0,
        startVector: hit.sub(origin),
        accumulated: 0,
        previousAngle: 0,
      };
    }
    const along = closestOnLine(ray, [origin.x, origin.y, origin.z], [axis.x, axis.y, axis.z]);
    if (!along) return null;
    return { handle, origin, start: along.t, accumulated: 0, previousAngle: 0 };
  }

  /**
   * With `snap`, moves land level with `target` (or on whole grid steps),
   * rotations on 15° steps, and scale factors on steps of 0.1.
   */
  drag(state: DragState, ray: Ray, snap: boolean, target: Vec3 | null): DragUpdate | null {
    const { handle, origin } = state;
    const axis = unit(handle.axis);
    if (handle.operation === "rotate") {
      const hit = ray.intersectPlane(
        new Plane().setFromNormalAndCoplanarPoint(axis, origin),
        new Vector3(),
      );
      if (!hit) return null;
      const v0 = state.startVector as Vector3;
      const v = hit.sub(origin);
      const angle = Math.atan2(v0.clone().cross(v).dot(axis), v0.dot(v));
      let delta = angle - state.previousAngle;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;
      state.accumulated += delta;
      state.previousAngle = angle;
      const radians = snap
        ? Math.round(state.accumulated / ROTATE_SNAP) * ROTATE_SNAP
        : state.accumulated;
      const degrees = MathUtils.radToDeg(radians);
      return { matrix: matrixFor(handle, degrees, origin), value: degrees };
    }
    const along = closestOnLine(ray, [origin.x, origin.y, origin.z], [axis.x, axis.y, axis.z]);
    if (!along) return null;
    if (handle.operation === "move") {
      let distance = along.t - state.start;
      if (snap && target) distance = new Vector3(...target).sub(origin).dot(axis);
      else if (snap) distance = Math.round(distance / MOVE_GRID) * MOVE_GRID;
      return { matrix: matrixFor(handle, distance, origin), value: distance };
    }
    if (Math.abs(state.start) < 1e-9) return null;
    let factor = along.t / state.start;
    if (snap) factor = Math.round(factor / SCALE_SNAP) * SCALE_SNAP;
    factor = Math.max(0.01, factor);
    return { matrix: matrixFor(handle, factor, origin), value: factor };
  }
}
