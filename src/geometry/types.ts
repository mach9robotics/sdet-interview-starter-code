export type Vec3 = readonly [number, number, number];

export type Loop = readonly Vec3[];

export interface Face {
  readonly outer: Loop;
  readonly holes: readonly Loop[];
}

export type Geometry =
  | { readonly kind: "point"; readonly position: Vec3 }
  | { readonly kind: "segment"; readonly start: Vec3; readonly end: Vec3 }
  | { readonly kind: "polyline"; readonly vertices: Loop; readonly closed: boolean }
  | { readonly kind: "surface"; readonly faces: readonly Face[] }
  | { readonly kind: "solid"; readonly faces: readonly Face[] };

export type GeometryKind = Geometry["kind"];
