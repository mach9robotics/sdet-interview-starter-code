import { Color, WebGLRenderer } from "three";
import type { DrawingDocument, Selection } from "../document";
import type { Vec3 } from "../geometry";
import { CompositeDisposable, Signal, SignalValue } from "../signals";
import { CameraRig } from "./CameraRig";
import { DrawingScene } from "./DrawingScene";
import { type GumballHandle, matrixFor } from "./Gumball";
import { type DisplayMode, LINE_RESOLUTION } from "./ObjectVisual";
import {
  type GumballValueRequest,
  gumballLabel,
  gumballUnit,
  PointerInput,
  type SelectionRect,
  type SnapIndicator,
  type TransformRequest,
  type ViewportInput,
} from "./PointerInput";
import { VIEWPORT_COLORS } from "./palette";
import type { ScreenSpace } from "./screen";
import { CONSTRUCTION_PLANES, type ViewName } from "./views";

/**
 * The canvas: owns the renderer and camera, keeps the DrawingScene in step
 * with the document, and hands pointer input to PointerInput. Frames render
 * only on request, and only through render().
 */
export class Viewport {
  readonly canvas: HTMLCanvasElement;
  readonly cursor = new SignalValue<Vec3 | null>(null);
  readonly snap = new SignalValue<SnapIndicator | null>(null);
  readonly selectionRect = new SignalValue<SelectionRect | null>(null);
  readonly gumballValueRequested = new Signal<GumballValueRequest>();
  readonly transformRequested = new Signal<TransformRequest>();

  private readonly renderer: WebGLRenderer;
  private readonly rig: CameraRig;
  private readonly scene: DrawingScene;
  private readonly pointer: PointerInput;
  private readonly disposables = new CompositeDisposable();
  private width = 1;
  private height = 1;
  private frame: number | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly doc: DrawingDocument,
    private readonly selection: Selection,
    private readonly input: ViewportInput,
    readonly view: SignalValue<ViewName>,
    readonly displayMode: SignalValue<DisplayMode>,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;
    this.renderer.setClearColor(new Color(VIEWPORT_COLORS.background));
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("aria-label", "Viewport");
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none";
    container.appendChild(this.canvas);

    this.rig = new CameraRig(() => this.requestRender());
    this.rig.setView(view.value);
    this.scene = new DrawingScene(doc, selection);
    this.scene.showGrid(CONSTRUCTION_PLANES[view.value]);
    this.pointer = new PointerInput({
      canvas: this.canvas,
      scene: this.scene,
      rig: this.rig,
      selection,
      input,
      view,
      outputs: this,
      screen: () => this.screen(),
      requestRender: () => this.requestRender(),
      refreshGumball: () => this.refreshGumball(),
    });
    this.restyle();
    this.refreshGumball();
    this.bind();
  }

  zoomExtents(): void {
    this.rig.zoomExtents(this.scene.visibleBounds());
  }

  zoomSelected(): void {
    this.rig.zoomExtents(this.scene.selectionBounds() ?? this.scene.visibleBounds());
  }

  /** Applies a typed Gumball value to the Selection. */
  applyGumballValue(handle: GumballHandle, value: number): void {
    const { gumball } = this.scene;
    if (!gumball.visible) return;
    this.transformRequested.emit({
      matrix: matrixFor(handle, value, gumball.origin.clone()),
      label: gumballLabel(handle),
      value,
      unit: gumballUnit(handle),
    });
  }

  requestRender(): void {
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  }

  dispose(): void {
    this.disposables.dispose();
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.scene.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private bind(): void {
    this.disposables.add(
      this.doc.changed.connect((change) => {
        this.scene.sync(change);
        this.restyle();
        this.refreshGumball();
      }),
      this.selection.ids.connect(() => {
        this.restyle();
        this.refreshGumball();
      }),
      this.displayMode.connect(() => this.restyle()),
      this.input.toolActive.connect(() => this.refreshGumball()),
      this.input.pointRequest.connect(() => this.pointer.refreshHover()),
      this.input.preview.connect((geometries) => {
        this.scene.showPreview(geometries);
        this.requestRender();
      }),
      this.view.connect((view) => {
        this.rig.setView(view);
        this.scene.showGrid(CONSTRUCTION_PLANES[view]);
        this.pointer.refreshHover();
        this.requestRender();
      }),
    );
    this.pointer.attach(this.disposables);
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.container);
    this.disposables.add({ dispose: () => observer.disconnect() });
    this.resize();
  }

  private screen(): ScreenSpace {
    return { camera: this.rig.camera, width: this.width, height: this.height };
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(this.width, this.height);
    LINE_RESOLUTION.set(this.width, this.height);
    this.rig.resize(this.width, this.height);
    this.requestRender();
  }

  private restyle(): void {
    this.scene.restyle(this.displayMode.value);
    this.requestRender();
  }

  /** The Gumball shows on a non-empty Selection while no tool is running. */
  private refreshGumball(): void {
    this.scene.placeGumball(this.selection.size > 0 && !this.input.toolActive.value);
    this.requestRender();
  }

  private render(): void {
    this.scene.render(this.renderer, this.rig.camera, (at) => this.rig.worldPerPixel(at));
  }
}
