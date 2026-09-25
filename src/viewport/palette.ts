import { Color } from "three";

export const VIEWPORT_COLORS = {
  background: "#1a1d23",
  gridMinor: "#262a32",
  gridMajor: "#313641",
  axisX: "#c75a52",
  axisY: "#5f9e6b",
  axisZ: "#4f7fc9",
  selection: "#ffd23f",
  hover: "#ffe58a",
  preview: "#4f9dff",
  lockedTint: "#6b7280",
  snap: "#ffd23f",
} as const;

export function displayColor(layerColor: string, locked: boolean): Color {
  const color = new Color(layerColor);
  return locked ? color.lerp(new Color(VIEWPORT_COLORS.lockedTint), 0.6) : color;
}
