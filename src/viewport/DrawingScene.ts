import {
  BufferGeometry,
  type Camera,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  type Matrix4,
  Points,
  PointsMaterial,
  Scene,
  type Vector3,
  type WebGLRenderer,
} from "three";
import type { DocumentChange, DrawingDocument, Selection } from "../document";
import {
  type Box3,
  boundsCenter,
  boundsOf,
  type Geometry,
  type Plane,
  type Vec3,
} from "../geometry";
import { buildGrid, disposeGroup } from "./Grid";
import { Gumball } from "./Gumball";
import { type DisplayMode, ObjectVisual } from "./ObjectVisual";
import { VIEWPORT_COLORS } from "./palette";

/**
 * Everything the Viewport draws: one ObjectVisual per document Object, the
 * grid, and an overlay (tool preview, Gumball, snap marker) drawn on top.
 */
export class DrawingScene {
  readonly gumball = new Gumball();
  private readonly scene = new Scene();
  private readonly overlay = new Scene();
  private readonly objectsRoot = new Group();
  private readonly previewRoot = new Group();
  private readonly snapMarker: Points;
  private readonly visuals = new Map<string, ObjectVisual>();
  private previewVisuals: ObjectVisual[] = [];
  private grid: Group | null = null;

  constructor(
    private readonly doc: DrawingDocument,
    private readonly selection: Selection,
  ) {
    this.scene.add(new HemisphereLight(0xffffff, 0x3a3f4a, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.6);
    sun.position.set(0.45, -0.8, 1);
    this.scene.add(sun, this.objectsRoot);

    const markerGeometry = new BufferGeometry();
    markerGeometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0], 3));
    this.snapMarker = new Points(
      markerGeometry,
      new PointsMaterial({
        color: VIEWPORT_COLORS.snap,
        size: 9,
        sizeAttenuation: false,
        depthTest: false,
      }),
    );
    this.snapMarker.visible = false;
    this.snapMarker.renderOrder = 20;
    this.overlay.add(this.previewRoot, this.gumball.group, this.snapMarker);

    for (const object of doc.state.objects.values()) this.addVisual(object.id);
  }

  sync(change: DocumentChange): void {
    for (const id of [...change.removed, ...change.updated]) this.removeVisual(id);
    for (const id of [...change.added, ...change.updated]) this.addVisual(id);
  }

  restyle(mode: DisplayMode): void {
    for (const [id, visual] of this.visuals) {
      const object = this.doc.object(id);
      const layer = object && this.doc.layer(object.layerId);
      if (!layer) continue;
      visual.group.visible = layer.visible;
      visual.style({
        layerColor: layer.color,
        locked: layer.locked,
        selected: this.selection.has(id),
        mode,
      });
    }
  }

  showGrid(plane: Plane): void {
    if (this.grid) {
      this.scene.remove(this.grid);
      disposeGroup(this.grid);
    }
    this.grid = buildGrid(plane);
    this.scene.add(this.grid);
  }

  showPreview(geometries: readonly Geometry[]): void {
    for (const visual of this.previewVisuals) {
      this.previewRoot.remove(visual.group);
      visual.dispose();
    }
    this.previewVisuals = geometries.map((g, i) => {
      const visual = new ObjectVisual(`preview-${i}`, g);
      visual.style({
        layerColor: VIEWPORT_COLORS.preview,
        locked: false,
        selected: false,
        mode: "wireframe",
      });
      this.previewRoot.add(visual.group);
      return visual;
    });
  }

  showSnapMarker(point: Vec3 | null): void {
    this.snapMarker.visible = point !== null;
    if (point) this.snapMarker.position.set(...point);
  }

  /** Draws the Selection moved by `matrix` without touching the document; null puts it back. */
  previewTransform(matrix: Matrix4 | null): void {
    for (const id of this.selection.ids.value) {
      const group = this.visuals.get(id)?.group;
      if (!group) continue;
      group.matrixAutoUpdate = matrix === null;
      if (matrix) group.matrix.copy(matrix);
      else group.matrix.identity();
      group.matrixWorldNeedsUpdate = true;
    }
  }

  /** Centres the Gumball on the Selection, or hides it. */
  placeGumball(show: boolean): void {
    const bounds = show ? this.selectionBounds() : null;
    this.gumball.place(bounds ? boundsCenter(bounds) : null);
  }

  /** Objects a user can see: snap targets. */
  visible(): ObjectVisual[] {
    return [...this.visuals.values()].filter((v) => v.group.visible);
  }

  /** Objects a user can see and pick: not on a Hidden or Locked Layer. */
  pickable(): ObjectVisual[] {
    return this.visible().filter((v) => {
      const object = this.doc.object(v.id);
      return object ? !this.doc.layer(object.layerId)?.locked : false;
    });
  }

  visibleBounds(): Box3 | null {
    return boundsOf(this.visible().flatMap((v) => v.vertices));
  }

  selectionBounds(): Box3 | null {
    const selected = [...this.selection.ids.value].flatMap((id) => this.visuals.get(id) ?? []);
    return boundsOf(selected.flatMap((v) => v.vertices));
  }

  render(renderer: WebGLRenderer, camera: Camera, worldPerPixel: (at: Vector3) => number): void {
    if (this.gumball.visible) this.gumball.fit(worldPerPixel(this.gumball.origin));
    renderer.clear();
    renderer.render(this.scene, camera);
    renderer.clearDepth();
    renderer.render(this.overlay, camera);
  }

  dispose(): void {
    for (const visual of this.visuals.values()) visual.dispose();
    for (const visual of this.previewVisuals) visual.dispose();
    if (this.grid) disposeGroup(this.grid);
  }

  private addVisual(id: string): void {
    const object = this.doc.object(id);
    if (!object) return;
    const visual = new ObjectVisual(id, object.geometry);
    this.visuals.set(id, visual);
    this.objectsRoot.add(visual.group);
  }

  private removeVisual(id: string): void {
    const visual = this.visuals.get(id);
    if (!visual) return;
    this.objectsRoot.remove(visual.group);
    visual.dispose();
    this.visuals.delete(id);
  }
}
