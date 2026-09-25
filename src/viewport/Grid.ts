import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from "three";
import { fromLocal, type Plane, type Vec3 } from "../geometry";
import { VIEWPORT_COLORS } from "./palette";

const EXTENT = 100;
const MAJOR_EVERY = 10;

function lines(segments: [Vec3, Vec3][], color: string): LineSegments {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(
      segments.flatMap(([a, b]) => [...a, ...b]),
      3,
    ),
  );
  const material = new LineBasicMaterial({ color, depthWrite: false, depthTest: false });
  const object = new LineSegments(geometry, material);
  object.renderOrder = -1;
  return object;
}

const AXIS_COLOR_BY_DIRECTION = (d: Vec3) =>
  Math.abs(d[0]) > 0.5
    ? VIEWPORT_COLORS.axisX
    : Math.abs(d[1]) > 0.5
      ? VIEWPORT_COLORS.axisY
      : VIEWPORT_COLORS.axisZ;

/**
 * The Construction Plane's grid: 1 m lines, heavier every 10 m, with the two
 * world axes in colour. Drawn first without depth testing, so Objects always
 * paint over it.
 */
export function buildGrid(plane: Plane): Group {
  const minor: [Vec3, Vec3][] = [];
  const major: [Vec3, Vec3][] = [];
  for (let i = -EXTENT; i <= EXTENT; i++) {
    if (i === 0) continue;
    const target = i % MAJOR_EVERY === 0 ? major : minor;
    target.push([fromLocal(i, -EXTENT, plane), fromLocal(i, EXTENT, plane)]);
    target.push([fromLocal(-EXTENT, i, plane), fromLocal(EXTENT, i, plane)]);
  }
  const group = new Group();
  group.add(lines(minor, VIEWPORT_COLORS.gridMinor), lines(major, VIEWPORT_COLORS.gridMajor));
  group.add(
    lines(
      [[fromLocal(-EXTENT, 0, plane), fromLocal(EXTENT, 0, plane)]],
      AXIS_COLOR_BY_DIRECTION(plane.u),
    ),
  );
  group.add(
    lines(
      [[fromLocal(0, -EXTENT, plane), fromLocal(0, EXTENT, plane)]],
      AXIS_COLOR_BY_DIRECTION(plane.v),
    ),
  );
  return group;
}

export function disposeGroup(group: Group): void {
  group.traverse((child) => {
    if (child instanceof LineSegments) {
      child.geometry.dispose();
      (child.material as LineBasicMaterial).dispose();
    }
  });
}
