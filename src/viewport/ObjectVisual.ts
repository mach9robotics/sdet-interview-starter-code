import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  Vector2,
} from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import {
  type Edge,
  type Geometry,
  geometryEdges,
  geometryVertices,
  type Triangle,
  triangulateFace,
  type Vec3,
} from "../geometry";
import { displayColor, VIEWPORT_COLORS } from "./palette";

export type DisplayMode = "shaded" | "wireframe";

/** Shared by every line material so one resize updates them all. */
export const LINE_RESOLUTION = new Vector2(1, 1);

const LINE_WIDTH = 1.5;
const SELECTED_LINE_WIDTH = 2.5;

export interface VisualStyle {
  readonly layerColor: string;
  readonly locked: boolean;
  readonly selected: boolean;
  readonly mode: DisplayMode;
}

/** Everything the viewport knows about one Object: what to draw and what to pick or snap to. */
export class ObjectVisual {
  readonly group = new Group();
  readonly vertices: Vec3[];
  readonly edges: Edge[];
  readonly triangles: Triangle[];
  private readonly lineMaterial = new LineMaterial({ linewidth: LINE_WIDTH });
  private readonly meshMaterial = new MeshStandardMaterial({
    side: DoubleSide,
    roughness: 0.85,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  private readonly pointMaterial = new PointsMaterial({ size: 7, sizeAttenuation: false });
  private mesh: Mesh | null = null;

  constructor(
    readonly id: string,
    readonly geometry: Geometry,
  ) {
    this.lineMaterial.uniforms.resolution = { value: LINE_RESOLUTION };
    this.vertices = geometryVertices(geometry);
    this.edges = geometryEdges(geometry);
    this.triangles =
      geometry.kind === "surface" || geometry.kind === "solid"
        ? geometry.faces.flatMap(triangulateFace)
        : [];
    this.build();
  }

  private build(): void {
    const g = this.geometry;
    if (g.kind === "point") {
      const buffer = new BufferGeometry();
      buffer.setAttribute("position", new Float32BufferAttribute([...g.position], 3));
      this.group.add(new Points(buffer, this.pointMaterial));
      return;
    }
    if (g.kind === "segment" || g.kind === "polyline") {
      this.group.add(this.lines());
      return;
    }
    const faces = new BufferGeometry();
    faces.setAttribute("position", new Float32BufferAttribute(this.triangles.flat(2), 3));
    faces.computeVertexNormals();
    this.mesh = new Mesh(faces, this.meshMaterial);
    this.group.add(this.mesh, this.lines());
  }

  private lines(): LineSegments2 {
    const geometry = new LineSegmentsGeometry().setPositions(
      this.edges.flatMap((e) => [...e.start, ...e.end]),
    );
    return new LineSegments2(geometry, this.lineMaterial);
  }

  style({ layerColor, locked, selected, mode }: VisualStyle): void {
    const base = displayColor(layerColor, locked);
    const highlight = new Color(VIEWPORT_COLORS.selection);
    const isLinear = this.mesh === null;
    this.pointMaterial.color.copy(selected ? highlight : base);
    this.lineMaterial.linewidth = selected ? SELECTED_LINE_WIDTH : LINE_WIDTH;
    if (isLinear) {
      this.lineMaterial.color.copy(selected ? highlight : base);
      return;
    }
    const mesh = this.mesh as Mesh;
    mesh.visible = mode === "shaded";
    this.meshMaterial.color.copy(base);
    this.meshMaterial.emissive.copy(selected ? highlight : new Color(0x000000));
    this.meshMaterial.emissiveIntensity = selected ? 0.25 : 0;
    const edgeColor = mode === "shaded" ? base.clone().multiplyScalar(0.35) : base;
    this.lineMaterial.color.copy(selected ? highlight : edgeColor);
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof Mesh || child instanceof Points) child.geometry.dispose();
    });
    this.lineMaterial.dispose();
    this.meshMaterial.dispose();
    this.pointMaterial.dispose();
  }
}
