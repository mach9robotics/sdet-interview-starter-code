import { Maximize } from "lucide-react";
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Input, Label, TextField } from "react-aria-components";
import { t } from "../i18n/strings";
import type { GumballValueRequest } from "../viewport";
import { VIEW_NAMES, type Viewport } from "../viewport";
import { useApp, useSignalValue } from "./hooks";
import { IconButton } from "./kit/IconButton";
import { SegmentedControl } from "./kit/SegmentedControl";

export function ViewportPane() {
  const app = useApp();
  const container = useRef<HTMLDivElement>(null);
  const viewport = useSignalValue(app.viewport);
  const view = useSignalValue(app.view);
  const mode = useSignalValue(app.displayMode);

  useEffect(() => {
    const mounted = app.mountViewport(container.current as HTMLDivElement);
    return () => mounted.dispose();
  }, [app]);

  return (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      <div ref={container} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <SegmentedControl
            label={t("view.group")}
            options={VIEW_NAMES.map((id) => ({ id, label: t(`view.${id}`) }))}
            value={view}
            onChange={(next) => app.view.set(next)}
          />
          <SegmentedControl
            label={t("display.group")}
            options={[
              { id: "shaded", label: t("display.shaded") },
              { id: "wireframe", label: t("display.wireframe") },
            ]}
            value={mode}
            onChange={(next) => app.displayMode.set(next)}
          />
        </div>
        <div className="pointer-events-auto rounded-md bg-app/80 shadow-elevation-200 backdrop-blur">
          <IconButton
            icon={Maximize}
            label={t("command.zoomExtents")}
            tooltip={`${t("command.zoomExtents")} (Z)`}
            tooltipPlacement="left"
            onPress={() => app.tools.run("zoomExtents")}
          />
        </div>
      </div>
      {viewport && <ViewportOverlays viewport={viewport} />}
    </div>
  );
}

function ViewportOverlays({ viewport }: { viewport: Viewport }) {
  const snap = useSignalValue(viewport.snap);
  const rect = useSignalValue(viewport.selectionRect);
  const [request, setRequest] = useState<GumballValueRequest | null>(null);

  useEffect(() => {
    const connection = viewport.gumballValueRequested.connect(setRequest);
    return () => connection.dispose();
  }, [viewport]);

  return (
    <>
      {snap && <SnapLabel kind={t(`snap.${snap.kind}`)} x={snap.screen.x} y={snap.screen.y} />}
      {rect && (
        <div
          className={`pointer-events-none absolute border ${rect.crossing ? "border-dashed border-[#6cc28a] bg-[#6cc28a]/10" : "border-line-selected bg-brand/10"}`}
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
        />
      )}
      {request && (
        <GumballValueEntry
          request={request}
          onSubmit={(value) => {
            viewport.applyGumballValue(request.handle, value);
            setRequest(null);
          }}
          onClose={() => setRequest(null)}
        />
      )}
    </>
  );
}

function GumballValueEntry({
  request,
  onSubmit,
  onClose,
}: {
  request: GumballValueRequest;
  onSubmit: (value: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(request.handle.operation === "scale" ? "1" : "0");
  const [invalid, setInvalid] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const left = useFlippedLeft(form, request.screen.x, 14);
  return (
    <form
      ref={form}
      className="absolute z-10 flex items-center gap-2 rounded-md bg-menu p-1.5 pl-2 shadow-elevation-300"
      style={{ left, top: request.screen.y - 14 }}
      onSubmit={(e) => {
        e.preventDefault();
        const value = Number(text);
        if (text.trim() === "" || !Number.isFinite(value)) return setInvalid(true);
        onSubmit(value);
      }}
    >
      <TextField
        value={text}
        onChange={setText}
        isInvalid={invalid}
        autoFocus
        className="flex items-center gap-2"
      >
        <Label className="text-xs whitespace-nowrap text-fg-muted">
          {request.label} ({request.unit})
        </Label>
        <Input
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          onBlur={onClose}
          className="w-20 rounded border border-line bg-app px-1.5 py-0.5 font-mono text-sm text-fg outline-none focus:border-line-focus data-[invalid]:border-danger"
        />
      </TextField>
    </form>
  );
}

/** Places an overlay right of `x`, or left of it when it would spill past the viewport's edge. */
function useFlippedLeft(element: RefObject<HTMLElement | null>, x: number, gap: number): number {
  const [left, setLeft] = useState(x + gap);
  useLayoutEffect(() => {
    const node = element.current;
    const parentWidth = node?.parentElement?.clientWidth ?? Infinity;
    const width = node?.offsetWidth ?? 0;
    setLeft(x + gap + width > parentWidth ? x - gap - width : x + gap);
  }, [element, x, gap]);
  return left;
}

function SnapLabel({ kind, x, y }: { kind: string; x: number; y: number }) {
  const label = useRef<HTMLDivElement>(null);
  const left = useFlippedLeft(label, x, 12);
  return (
    <div
      ref={label}
      className="pointer-events-none absolute rounded bg-tooltip/90 px-1.5 py-0.5 text-2xs font-medium text-[#ffd23f]"
      style={{ left, top: y + 10 }}
    >
      {kind}
    </div>
  );
}
