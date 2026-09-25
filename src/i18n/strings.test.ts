import { describe, expect, it } from "vitest";
import { count, t } from "./strings";

describe("strings", () => {
  it("fills named parameters", () => {
    expect(t("layers.makeCurrent", { layer: "Walls" })).toBe("Make Walls current");
  });

  it("leaves unknown placeholders visible rather than blank", () => {
    expect(t("layers.makeCurrent")).toBe("Make {layer} current");
  });

  it("picks singular or plural by count", () => {
    expect(count(1, "solid")).toBe("1 Solid");
    expect(count(3, "copy")).toBe("3 copies");
    expect(count(0, "object")).toBe("0 objects");
  });
});
