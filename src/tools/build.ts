import {
  boundsCenter,
  boundsOf,
  dot,
  explode,
  extrude,
  type Geometry,
  geometryVertices,
  join,
  planarSurfaces,
  profileNormal,
  scale,
  sub,
  type Vec3,
} from "../geometry";
import { count, t } from "../i18n/strings";
import { SelectionTool } from "./Tool";

export class PlanarSurfaceTool extends SelectionTool {
  readonly label = t("command.planarSurface");
  protected readonly verb = t("verb.fill");

  /** The Polylines become the Surface's boundary, so they're used up, like a Surface is by Extrude. */
  protected proceed(ids: string[]): void {
    const inputs = this.geometries(ids).flatMap(({ id, geometry: g }) =>
      g.kind === "polyline" && g.closed ? [{ id, loop: g.vertices }] : [],
    );
    if (inputs.length === 0) {
      this.done(t("error.planarNeedsClosed"));
      return;
    }
    const { surfaces, skippedLoops } = planarSurfaces(inputs.map((i) => i.loop));
    const used = inputs.filter((_, index) => !skippedLoops.includes(index));
    if (surfaces.length > 0) {
      const created = this.host.doc.transact(t("command.planarSurface"), (d) => {
        const layer = d.object(used[0].id)?.layerId;
        const added = surfaces.map((s) => d.addObject(s, layer));
        for (const input of used) d.removeObject(input.id);
        return added;
      });
      this.host.selection.set(created);
    }
    const skipped = skippedLoops.length;
    const created = t("log.created", { what: count(surfaces.length, "surface") });
    const note =
      skipped === 0
        ? ""
        : t(skipped === 1 ? "log.skippedNotFlatOne" : "log.skippedNotFlat", {
            what: count(skipped, "polyline"),
          });
    this.done(note ? `${created} ${note}` : created);
  }
}

interface Profile {
  readonly id: string;
  readonly geometry: Geometry;
  readonly direction: Vec3;
}

export class ExtrudeTool extends SelectionTool {
  readonly label = t("command.extrude");
  protected readonly verb = t("verb.extrude");
  private profiles: Profile[] = [];
  private origin: Vec3 = [0, 0, 0];

  protected proceed(ids: string[]): void {
    const fallback = this.host.plane().normal;
    this.profiles = this.geometries(ids).flatMap(({ id, geometry }) =>
      geometry.kind === "segment" || geometry.kind === "polyline" || geometry.kind === "surface"
        ? [{ id, geometry, direction: profileNormal(geometry) ?? fallback }]
        : [],
    );
    const first = this.profiles[0];
    if (!first) {
      this.done(t("error.extrudeNeedsProfiles"));
      return;
    }
    this.origin = boundsCenter(
      boundsOf(geometryVertices(first.geometry)) as NonNullable<ReturnType<typeof boundsOf>>,
    );
    this.anchor = this.origin;
    this.ask(t("prompt.extrudeDistance"), {
      kind: "line",
      origin: this.origin,
      direction: first.direction,
    });
  }

  private results(distance: number): { profile: Profile; geometry: Geometry }[] {
    return this.profiles.flatMap((profile) => {
      const geometry = extrude(profile.geometry, scale(profile.direction, distance));
      return geometry ? [{ profile, geometry }] : [];
    });
  }

  private distanceTo(point: Vec3): number {
    return dot(sub(point, this.origin), this.profiles[0].direction);
  }

  hover(point: Vec3 | null): void {
    this.preview.set(
      point && this.profiles.length > 0
        ? this.results(this.distanceTo(point)).map((r) => r.geometry)
        : [],
    );
  }

  pick(point: Vec3): void {
    this.commit(this.distanceTo(point));
  }

  number(value: number): boolean {
    if (this.profiles.length === 0) return false;
    this.commit(value);
    return true;
  }

  /** Extruding a Surface uses it up: it becomes the new Solid's bottom Face. */
  private commit(distance: number): void {
    const results = this.results(distance);
    if (results.length === 0) {
      this.host.log(t("error.extrudeNothing"), "error");
      return;
    }
    const created = this.host.doc.transact(t("command.extrude"), (d) =>
      results.map(({ profile, geometry }) => {
        const id = d.addObject(geometry, d.object(profile.id)?.layerId);
        if (profile.geometry.kind === "surface") d.removeObject(profile.id);
        return id;
      }),
    );
    this.host.selection.set(created);
    const kinds = results.map((r) => r.geometry.kind);
    const solids = kinds.filter((k) => k === "solid").length;
    const surfaces = kinds.length - solids;
    const parts = [
      solids > 0 ? count(solids, "solid") : null,
      surfaces > 0 ? count(surfaces, "surface") : null,
    ].filter((part): part is string => part !== null);
    const what = parts.length === 2 ? t("log.and", { a: parts[0], b: parts[1] }) : parts[0];
    this.done(t("log.created", { what }));
  }
}

export class JoinTool extends SelectionTool {
  readonly label = t("command.join");
  protected readonly verb = t("verb.join");

  protected proceed(ids: string[]): void {
    const items = this.geometries(ids);
    const results = join(items.map((i) => i.geometry));
    if (results.length === 0) {
      this.done(t("error.joinNothing"));
      return;
    }
    const created = this.host.doc.transact(t("command.join"), (d) =>
      results.map(({ inputs, output }) => {
        const inputIds = inputs.map((i) => items[i].id);
        const id = d.addObject(output, d.object(inputIds[0])?.layerId);
        for (const inputId of inputIds) d.removeObject(inputId);
        return id;
      }),
    );
    this.host.selection.set(created);
    const joined = results.reduce((n, r) => n + r.inputs.length, 0);
    const into = results.map((r) => t(`kind.a.${r.output.kind}`)).join(", ");
    this.done(t("log.joined", { what: count(joined, "object"), into }));
  }
}

export class ExplodeTool extends SelectionTool {
  readonly label = t("command.explode");
  protected readonly verb = t("verb.explode");

  protected proceed(ids: string[]): void {
    const pieces = this.geometries(ids).flatMap(({ id, geometry }) => {
      const parts = explode(geometry);
      return parts ? [{ id, parts }] : [];
    });
    if (pieces.length === 0) {
      this.done(t("error.explodeNothing"));
      return;
    }
    const created = this.host.doc.transact(t("command.explode"), (d) =>
      pieces.flatMap(({ id, parts }) => {
        const layer = d.object(id)?.layerId;
        d.removeObject(id);
        return parts.map((p) => d.addObject(p, layer));
      }),
    );
    this.host.selection.set(created);
    this.done(
      t("log.exploded", {
        what: count(pieces.length, "object"),
        into: count(created.length, "piece"),
      }),
    );
  }
}
