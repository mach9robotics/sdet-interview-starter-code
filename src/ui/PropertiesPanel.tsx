import type { ReactNode } from "react";
import {
  area,
  boundsCenter,
  boundsOf,
  boundsSize,
  curveLength,
  geometryVertices,
  type Vec3,
  volume,
} from "../geometry";
import { t } from "../i18n/strings";
import { useApp, useSignalTick, useSignalValue } from "./hooks";
import { Panel } from "./kit/Panel";

const n = (value: number) => value.toFixed(3);
const vec = (v: Vec3) => `${n(v[0])}, ${n(v[1])}, ${n(v[2])}`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="truncate text-fg-muted">{label}</dt>
      <dd className="m-0 truncate font-mono text-fg">{children}</dd>
    </>
  );
}

export function PropertiesPanel() {
  const app = useApp();
  const ids = useSignalValue(app.selection.ids);
  useSignalTick(app.doc.changed);
  const objects = [...ids].map((id) => app.doc.object(id)).filter((o) => o !== undefined);

  if (objects.length === 0) {
    return (
      <Panel title={t("properties.title")} className="flex-1">
        <p className="px-3 py-2 text-sm text-fg-faint">{t("properties.nothing")}</p>
      </Panel>
    );
  }

  const bounds = boundsOf(objects.flatMap((o) => geometryVertices(o.geometry)));
  const single = objects.length === 1 ? objects[0] : undefined;
  const layerIds = new Set(objects.map((o) => o.layerId));
  const layer = layerIds.size === 1 ? app.doc.layer([...layerIds][0]) : undefined;
  const kinds = new Map<string, number>();
  for (const o of objects)
    kinds.set(t(`kind.${o.geometry.kind}`), (kinds.get(t(`kind.${o.geometry.kind}`)) ?? 0) + 1);

  const g = single?.geometry;
  const length = g ? curveLength(g) : null;
  const surfaceArea = g ? area(g) : null;
  const solidVolume = g ? volume(g) : null;

  return (
    <Panel title={t("properties.title")} className="flex-1">
      <dl className="m-0 grid grid-cols-[88px_1fr] gap-x-2 gap-y-1 px-3 py-2 text-sm">
        <Row label={t("properties.type")}>
          {single
            ? t(`kind.${single.geometry.kind}`)
            : [...kinds].map(([k, c]) => `${c} ${k}`).join(", ")}
        </Row>
        {single && <Row label={t("properties.object")}>{single.id}</Row>}
        <Row label={t("properties.layer")}>
          {layer ? (
            <span className="inline-flex items-center gap-1.5 font-sans">
              <span className="size-2.5 rounded-sm" style={{ background: layer.color }} />
              {layer.name}
            </span>
          ) : (
            t("properties.varies")
          )}
        </Row>
        {g && g.kind !== "point" && (
          <Row label={t("properties.vertices")}>{geometryVertices(g).length}</Row>
        )}
        {g && (g.kind === "surface" || g.kind === "solid") && (
          <Row label={t("properties.faces")}>{g.faces.length}</Row>
        )}
        {g?.kind === "polyline" && (
          <Row label={t("properties.closed")}>
            {g.closed ? t("properties.yes") : t("properties.no")}
          </Row>
        )}
        {g?.kind === "point" ? (
          <Row label={t("properties.location")}>{vec(g.position)}</Row>
        ) : (
          bounds && (
            <>
              <Row label={t("properties.center")}>{vec(boundsCenter(bounds))}</Row>
              <Row label={t("properties.size")}>{vec(boundsSize(bounds))}</Row>
            </>
          )
        )}
        {length !== null && <Row label={t("properties.length")}>{n(length)} m</Row>}
        {surfaceArea !== null && <Row label={t("properties.area")}>{n(surfaceArea)} m²</Row>}
        {solidVolume !== null && <Row label={t("properties.volume")}>{n(solidVolume)} m³</Row>}
      </dl>
    </Panel>
  );
}
