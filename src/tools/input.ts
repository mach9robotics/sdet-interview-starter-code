import { add, fromLocal, type Plane, scale, type Vec3 } from "../geometry";
import { t } from "../i18n/strings";

export type ParsedInput =
  | { readonly kind: "empty" }
  | { readonly kind: "point"; readonly point: Vec3 }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "word"; readonly value: string }
  | { readonly kind: "error"; readonly message: string };

const NUMBER = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)`;
const COORDINATES = new RegExp(
  `^(@)?\\s*(${NUMBER})\\s*,\\s*(${NUMBER})(?:\\s*,\\s*(${NUMBER}))?$`,
);
const SINGLE = new RegExp(`^${NUMBER}$`);

/**
 * `x,y,z` is a world position; `u,v` is a position on the View's Construction
 * Plane. A leading `@` makes either relative to `anchor`, the last point picked.
 */
export function parseInput(text: string, plane: Plane, anchor: Vec3 | null): ParsedInput {
  const trimmed = text.trim();
  if (trimmed === "") return { kind: "empty" };
  const coordinates = COORDINATES.exec(trimmed);
  if (coordinates) {
    const [, relative, a, b, c] = coordinates;
    const x = Number(a);
    const y = Number(b);
    if (relative && !anchor) return { kind: "error", message: t("error.noAnchor") };
    if (c !== undefined) {
      const offset: Vec3 = [x, y, Number(c)];
      return { kind: "point", point: relative ? add(anchor as Vec3, offset) : offset };
    }
    const point = relative
      ? add(anchor as Vec3, add(scale(plane.u, x), scale(plane.v, y)))
      : fromLocal(x, y, { ...plane, origin: [0, 0, 0] });
    return { kind: "point", point };
  }
  if (SINGLE.test(trimmed)) return { kind: "number", value: Number(trimmed) };
  if (/^[a-z][a-z ]*$/i.test(trimmed))
    return { kind: "word", value: trimmed.toLowerCase().replace(/\s+/g, "") };
  return { kind: "error", message: t("error.unknownInput", { text: trimmed }) };
}
