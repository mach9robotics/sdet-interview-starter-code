import { MathUtils, OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import type { Box3 } from "../geometry";
import { ORTHO_FRAMING, type ViewName } from "./views";

const FAR = 20000;
const FOV = 45;
const MIN_HALF_HEIGHT = 0.05;
const MAX_HALF_HEIGHT = 5000;

interface OrthoState {
  center: Vector3;
  halfHeight: number;
}

interface PerspectiveState {
  target: Vector3;
  distance: number;
  azimuth: number;
  elevation: number;
}

export interface Tween {
  cancel(): void;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export class CameraRig {
  readonly perspective = new PerspectiveCamera(FOV, 1, 0.05, FAR);
  readonly ortho = new OrthographicCamera(-1, 1, 1, -1, 0.05, FAR);
  private view: ViewName = "perspective";
  private width = 1;
  private height = 1;
  private orthoStates: Record<Exclude<ViewName, "perspective">, OrthoState> = {
    top: { center: new Vector3(0, 0, 0), halfHeight: 12 },
    front: { center: new Vector3(0, 0, 4), halfHeight: 12 },
    right: { center: new Vector3(0, 0, 4), halfHeight: 12 },
  };
  private perspectiveState: PerspectiveState = {
    target: new Vector3(0, 0, 0),
    distance: 34,
    azimuth: MathUtils.degToRad(-55),
    elevation: MathUtils.degToRad(28),
  };
  private tween: number | null = null;

  constructor(private readonly onChange: () => void) {
    this.perspective.up.set(0, 0, 1);
    this.apply();
  }

  get camera(): PerspectiveCamera | OrthographicCamera {
    return this.view === "perspective" ? this.perspective : this.ortho;
  }

  get currentView(): ViewName {
    return this.view;
  }

  setView(view: ViewName): void {
    this.cancelTween();
    this.view = view;
    this.apply();
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.apply();
  }

  /** World units covered by one screen pixel at `point`. */
  worldPerPixel(point: Vector3): number {
    if (this.view !== "perspective") return (this.orthoState().halfHeight * 2) / this.height;
    const distance = point.distanceTo(this.perspective.position);
    return (2 * distance * Math.tan(MathUtils.degToRad(FOV / 2))) / this.height;
  }

  pan(dxPixels: number, dyPixels: number): void {
    this.cancelTween();
    const camera = this.camera;
    camera.updateMatrixWorld();
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const pivot =
      this.view === "perspective" ? this.perspectiveState.target : this.orthoState().center;
    const wpp = this.worldPerPixel(pivot);
    const shift = right.multiplyScalar(-dxPixels * wpp).add(up.multiplyScalar(dyPixels * wpp));
    pivot.add(shift);
    this.apply();
  }

  orbit(dxPixels: number, dyPixels: number): void {
    if (this.view !== "perspective") return;
    this.cancelTween();
    const s = this.perspectiveState;
    s.azimuth -= dxPixels * 0.006;
    s.elevation = MathUtils.clamp(
      s.elevation + dyPixels * 0.006,
      -Math.PI / 2 + 0.01,
      Math.PI / 2 - 0.01,
    );
    this.apply();
  }

  /** Zooms toward `anchor`, the world point under the cursor, keeping it fixed on screen. */
  zoom(factor: number, anchor: Vector3 | null): void {
    this.cancelTween();
    if (this.view === "perspective") {
      const s = this.perspectiveState;
      const next = MathUtils.clamp(s.distance * factor, 0.2, FAR / 4);
      const applied = next / s.distance;
      if (anchor) s.target.sub(anchor).multiplyScalar(applied).add(anchor);
      s.distance = next;
    } else {
      const s = this.orthoState();
      const next = MathUtils.clamp(s.halfHeight * factor, MIN_HALF_HEIGHT, MAX_HALF_HEIGHT);
      const applied = next / s.halfHeight;
      if (anchor) {
        const framing = ORTHO_FRAMING[this.view as Exclude<ViewName, "perspective">];
        const look = new Vector3(...framing.look);
        const offset = s.center.clone().sub(anchor);
        const inPlane = offset.clone().sub(look.clone().multiplyScalar(offset.dot(look)));
        s.center.sub(inPlane).add(inPlane.multiplyScalar(applied));
      }
      s.halfHeight = next;
    }
    this.apply();
  }

  /** Frames `bounds` in the current View over ~250 ms. */
  zoomExtents(bounds: Box3 | null): void {
    const min = new Vector3(...(bounds?.min ?? [-10, -10, 0]));
    const max = new Vector3(...(bounds?.max ?? [10, 10, 3]));
    const center = min.clone().add(max).multiplyScalar(0.5);
    const radius = Math.max(min.distanceTo(max) / 2, 1);
    const aspect = this.width / this.height;
    if (this.view === "perspective") {
      const s = this.perspectiveState;
      const fitFov = Math.min(
        FOV,
        2 * MathUtils.radToDeg(Math.atan(Math.tan(MathUtils.degToRad(FOV / 2)) * aspect)),
      );
      const distance = (radius / Math.sin(MathUtils.degToRad(fitFov / 2))) * 1.3;
      this.animate(s.target.clone(), s.distance, center, distance, (target, value) => {
        s.target.copy(target);
        s.distance = value;
      });
    } else {
      const framing = ORTHO_FRAMING[this.view as Exclude<ViewName, "perspective">];
      const upAxis = new Vector3(...framing.up);
      const side = new Vector3(...framing.look).cross(upAxis);
      const size = max.clone().sub(min);
      const halfW = Math.abs(size.dot(side)) / 2;
      const halfH = Math.abs(size.dot(upAxis)) / 2;
      const halfHeight = Math.max(halfH, halfW / aspect, 0.5) * 1.3;
      const s = this.orthoState();
      this.animate(s.center.clone(), s.halfHeight, center, halfHeight, (c, value) => {
        s.center.copy(c);
        s.halfHeight = value;
      });
    }
  }

  private animate(
    fromPoint: Vector3,
    fromValue: number,
    toPoint: Vector3,
    toValue: number,
    set: (point: Vector3, value: number) => void,
  ): void {
    this.cancelTween();
    const start = performance.now();
    const duration = 250;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const k = easeInOut(t);
      set(fromPoint.clone().lerp(toPoint, k), fromValue + (toValue - fromValue) * k);
      this.apply();
      this.tween = t < 1 ? requestAnimationFrame(step) : null;
    };
    this.tween = requestAnimationFrame(step);
  }

  private cancelTween(): void {
    if (this.tween !== null) cancelAnimationFrame(this.tween);
    this.tween = null;
  }

  private orthoState(): OrthoState {
    return this.orthoStates[this.view as Exclude<ViewName, "perspective">];
  }

  private apply(): void {
    const aspect = this.width / this.height;
    if (this.view === "perspective") {
      const s = this.perspectiveState;
      const offset = new Vector3(
        Math.cos(s.elevation) * Math.cos(s.azimuth),
        Math.cos(s.elevation) * Math.sin(s.azimuth),
        Math.sin(s.elevation),
      ).multiplyScalar(s.distance);
      this.perspective.position.copy(s.target).add(offset);
      this.perspective.aspect = aspect;
      this.perspective.near = Math.max(0.01, s.distance / 1000);
      this.perspective.lookAt(s.target);
      this.perspective.updateProjectionMatrix();
    } else {
      const framing = ORTHO_FRAMING[this.view];
      const s = this.orthoState();
      const look = new Vector3(...framing.look);
      this.ortho.up.set(...framing.up);
      this.ortho.position.copy(s.center).sub(look.clone().multiplyScalar(FAR / 2));
      this.ortho.lookAt(s.center);
      this.ortho.left = -s.halfHeight * aspect;
      this.ortho.right = s.halfHeight * aspect;
      this.ortho.top = s.halfHeight;
      this.ortho.bottom = -s.halfHeight;
      this.ortho.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
    this.onChange();
  }
}
