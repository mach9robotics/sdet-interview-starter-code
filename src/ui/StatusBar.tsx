import type { Vec3 } from "../geometry";
import { t } from "../i18n/strings";
import type { ReadonlySignalValue } from "../signals";
import { useApp, useSignalValue } from "./hooks";

function Coordinate({ axis, value }: { axis: string; value: number | null }) {
  return (
    <span className="inline-flex gap-1">
      <span className="text-fg-faint">{axis}</span>
      <span className="inline-block w-[72px] text-right text-fg">
        {value === null ? "—" : value.toFixed(3)}
      </span>
    </span>
  );
}

function CursorReadout() {
  const app = useApp();
  const viewport = useSignalValue(app.viewport);
  return viewport ? <CursorCoordinates cursor={viewport.cursor} /> : null;
}

function CursorCoordinates({ cursor }: { cursor: ReadonlySignalValue<Vec3 | null> }) {
  const point = useSignalValue(cursor);
  return (
    <output aria-label={t("status.cursor")} className="flex items-center gap-3 font-mono">
      <Coordinate axis="X" value={point?.[0] ?? null} />
      <Coordinate axis="Y" value={point?.[1] ?? null} />
      <Coordinate axis="Z" value={point?.[2] ?? null} />
      <span className="text-fg-faint">m</span>
    </output>
  );
}

export function StatusBar() {
  const app = useApp();
  const view = useSignalValue(app.view);
  const selection = useSignalValue(app.selection.ids);
  const layers = useSignalValue(app.doc.layers);
  const currentId = useSignalValue(app.doc.currentLayerId);
  const current = layers.find((l) => l.id === currentId);

  return (
    <footer className="flex h-6 shrink-0 items-center gap-5 border-t border-line-subtle bg-app px-3 text-xs text-fg-muted">
      <CursorReadout />
      <span>{t(`view.${view}`)}</span>
      <span>{t("status.grid")}</span>
      <span>
        {t("status.layer")} <span className="text-fg">{current?.name}</span>
      </span>
      <span>
        {selection.size === 0
          ? t("status.noSelection")
          : t("status.selected", { count: selection.size })}
      </span>
      <span className="ml-auto text-fg-faint">{t("status.shiftHint")}</span>
    </footer>
  );
}
