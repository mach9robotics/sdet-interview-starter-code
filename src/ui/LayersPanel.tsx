import {
  Check,
  Ellipsis,
  GripVertical,
  Lightbulb,
  LightbulbOff,
  Lock,
  LockOpen,
  Plus,
} from "lucide-react";
import { useState } from "react";
import {
  Button,
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  Dialog,
  DialogTrigger,
  GridList,
  GridListItem,
  Input,
  MenuTrigger,
  Popover,
  TextField,
  useDragAndDrop,
} from "react-aria-components";
import { LAYER_COLORS, type Layer } from "../document";
import { count as countOf, t } from "../i18n/strings";
import { useApp, useSignalTick, useSignalValue } from "./hooks";
import { ConfirmDialog } from "./kit/ConfirmDialog";
import { IconButton, ToggleIconButton } from "./kit/IconButton";
import { MenuPopover, MenuRow } from "./kit/Menu";
import { Panel } from "./kit/Panel";

const EXTRA_COLORS = [
  "#9aa3b2",
  "#f4f5f7",
  "#8c6b4f",
  "#c94f4f",
  "#3e6fb0",
  "#4b8b5a",
  "#c98a2e",
  "#7a5fb0",
];

export function LayersPanel() {
  const app = useApp();
  const layers = useSignalValue(app.doc.layers);
  const currentId = useSignalValue(app.doc.currentLayerId);
  useSignalTick(app.doc.changed);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Layer | null>(null);

  const counts = new Map<string, number>();
  for (const object of app.doc.state.objects.values())
    counts.set(object.layerId, (counts.get(object.layerId) ?? 0) + 1);

  const update = (layer: Layer, label: string, patch: Partial<Omit<Layer, "id">>) =>
    app.doc.transact(label, (d) => d.updateLayer(layer.id, patch));

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ "text/plain": String(key) })),
    onReorder: (e) => {
      const target = layers.findIndex((l) => l.id === e.target.key);
      const [moving] = [...e.keys];
      if (moving === undefined || target === -1) return;
      const from = layers.findIndex((l) => l.id === moving);
      const to = e.target.dropPosition === "before" ? target : target + 1;
      app.doc.transact(t("undo.reorderLayers"), (d) =>
        d.moveLayer(String(moving), from < to ? to - 1 : to),
      );
    },
  });

  const requestDelete = (layer: Layer) => {
    if ((counts.get(layer.id) ?? 0) === 0)
      app.doc.transact(t("undo.deleteLayer"), (d) => d.removeLayer(layer.id));
    else setDeleting(layer);
  };

  const moveSelectionTo = (layer: Layer) => {
    const ids = [...app.selection.ids.value];
    if (ids.length === 0) return app.tools.log(t("error.selectToMove"), "error");
    app.doc.transact(t("undo.changeLayer"), (d) => {
      for (const id of ids) d.setObjectLayer(id, layer.id);
    });
    app.tools.log(
      t("log.movedToLayer", { what: countOf(ids.length, "object"), layer: layer.name }),
      "info",
    );
  };

  return (
    <Panel
      title={t("layers.title")}
      className="flex-1"
      actions={
        <IconButton
          icon={Plus}
          label={t("layers.new")}
          tooltipPlacement="left"
          onPress={() => {
            const id = app.doc.transact(t("undo.newLayer"), (d) => d.addLayer());
            setRenaming(id);
          }}
        />
      }
    >
      <GridList
        aria-label={t("layers.title")}
        items={layers}
        dependencies={[currentId, [...counts].join(), renaming, layers.length]}
        dragAndDropHooks={dragAndDropHooks}
        className="py-1 outline-none"
      >
        {(layer) => {
          const isCurrent = layer.id === currentId;
          const count = counts.get(layer.id) ?? 0;
          return (
            <GridListItem
              id={layer.id}
              textValue={layer.name}
              className="group flex h-7 items-center gap-0.5 pr-1 pl-0.5 outline-none data-[dragging]:opacity-50 data-[drop-target]:bg-selected data-[focus-visible]:bg-hover data-[hovered]:bg-hover"
            >
              <Button
                slot="drag"
                aria-label={t("layers.reorder", { layer: layer.name })}
                className="flex h-6 w-3.5 items-center justify-center text-icon-muted opacity-0 outline-none group-data-[hovered]:opacity-100 data-[focus-visible]:opacity-100"
              >
                <GripVertical size={12} aria-hidden />
              </Button>
              <ToggleIconButton
                icon={Check}
                label={
                  isCurrent
                    ? t("layers.isCurrent", { layer: layer.name })
                    : t("layers.makeCurrent", { layer: layer.name })
                }
                tooltip={isCurrent ? t("layers.currentTooltip") : t("layers.makeCurrentTooltip")}
                isSelected={isCurrent}
                onChange={() =>
                  !isCurrent &&
                  app.doc.transact(t("undo.currentLayer"), (d) => d.setCurrentLayer(layer.id))
                }
                className={isCurrent ? "" : "text-transparent data-[hovered]:text-icon-muted"}
              />
              <LayerColor
                layer={layer}
                onChange={(color) => update(layer, t("undo.layerColor"), { color })}
              />
              {/* biome-ignore lint/a11y/noStaticElementInteractions: double-click is a shortcut; the row menu's Rename is the accessible path. */}
              <div className="min-w-0 flex-1 px-1.5" onDoubleClick={() => setRenaming(layer.id)}>
                {renaming === layer.id ? (
                  <RenameField
                    name={layer.name}
                    onCommit={(name) => {
                      setRenaming(null);
                      if (name && name !== layer.name)
                        update(layer, t("undo.renameLayer"), { name });
                    }}
                  />
                ) : (
                  <span
                    className={`block truncate text-sm ${layer.visible ? "text-fg" : "text-fg-faint"} ${isCurrent ? "font-medium" : ""}`}
                  >
                    {layer.name}
                  </span>
                )}
              </div>
              <span
                className="w-6 text-right font-mono text-2xs text-fg-faint"
                title={t("layers.objectCount", { count })}
              >
                {count}
              </span>
              <ToggleIconButton
                icon={layer.visible ? Lightbulb : LightbulbOff}
                label={t(layer.visible ? "layers.hide" : "layers.show", { layer: layer.name })}
                tooltip={layer.visible ? t("layers.hideTooltip") : t("layers.showTooltip")}
                isSelected={!layer.visible}
                isDisabled={isCurrent}
                onChange={() =>
                  update(layer, layer.visible ? t("undo.hideLayer") : t("undo.showLayer"), {
                    visible: !layer.visible,
                  })
                }
                className="data-[selected]:bg-transparent data-[selected]:text-icon-muted"
              />
              <ToggleIconButton
                icon={layer.locked ? Lock : LockOpen}
                label={t(layer.locked ? "layers.unlock" : "layers.lock", { layer: layer.name })}
                tooltip={layer.locked ? t("layers.unlockTooltip") : t("layers.lockTooltip")}
                isSelected={layer.locked}
                onChange={() =>
                  update(layer, layer.locked ? t("undo.unlockLayer") : t("undo.lockLayer"), {
                    locked: !layer.locked,
                  })
                }
                className={layer.locked ? "" : "text-icon-muted"}
              />
              <MenuTrigger>
                <IconButton
                  icon={Ellipsis}
                  label={t("layers.options", { layer: layer.name })}
                  tooltip={false}
                />
                <MenuPopover label={t("layers.options", { layer: layer.name })}>
                  <MenuRow onAction={() => moveSelectionTo(layer)}>
                    {t("layers.moveSelectionHere")}
                  </MenuRow>
                  <MenuRow
                    isDisabled={isCurrent}
                    onAction={() =>
                      app.doc.transact(t("undo.currentLayer"), (d) => d.setCurrentLayer(layer.id))
                    }
                  >
                    {t("layers.menuMakeCurrent")}
                  </MenuRow>
                  <MenuRow onAction={() => setRenaming(layer.id)}>{t("layers.rename")}</MenuRow>
                  <MenuRow
                    danger
                    isDisabled={isCurrent || layers.length <= 1}
                    onAction={() => requestDelete(layer)}
                  >
                    {t("layers.delete")}
                  </MenuRow>
                </MenuPopover>
              </MenuTrigger>
            </GridListItem>
          );
        }}
      </GridList>
      <ConfirmDialog
        isOpen={deleting !== null}
        title={t("layers.confirmTitle", { layer: deleting?.name ?? "" })}
        message={t("layers.confirmMessage", { count: counts.get(deleting?.id ?? "") ?? 0 })}
        confirmLabel={t("layers.confirmDelete")}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const layer = deleting;
          setDeleting(null);
          if (layer) app.doc.transact(t("undo.deleteLayer"), (d) => d.removeLayer(layer.id));
        }}
      />
    </Panel>
  );
}

function RenameField({ name, onCommit }: { name: string; onCommit: (name: string) => void }) {
  const [value, setValue] = useState(name);
  return (
    <TextField aria-label={t("layers.name")} value={value} onChange={setValue} autoFocus>
      <Input
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => onCommit(value.trim())}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") onCommit(value.trim());
          if (e.key === "Escape") onCommit(name);
        }}
        className="w-full rounded border border-line-focus bg-app px-1 text-sm text-fg outline-none"
      />
    </TextField>
  );
}

function LayerColor({ layer, onChange }: { layer: Layer; onChange: (color: string) => void }) {
  return (
    <DialogTrigger>
      <Button
        aria-label={t("layers.color", { layer: layer.name })}
        className="flex size-6 items-center justify-center rounded outline-none data-[hovered]:bg-hover data-[focus-visible]:ring-1 data-[focus-visible]:ring-line-focus"
      >
        <ColorSwatch
          color={layer.color}
          className="size-3 rounded-sm shadow-[inset_0_0_0_1px_rgb(0_0_0/0.3)]"
        />
      </Button>
      <Popover
        placement="bottom start"
        offset={4}
        className="rounded-md bg-menu p-2 shadow-elevation-300 outline-none"
      >
        <Dialog aria-label={t("layers.color", { layer: layer.name })} className="outline-none">
          <ColorSwatchPicker
            value={layer.color}
            onChange={(color) => onChange(color.toString("hex"))}
            className="grid grid-cols-8 gap-1"
          >
            {[...LAYER_COLORS, ...EXTRA_COLORS].map((color) => (
              <ColorSwatchPickerItem
                key={color}
                color={color}
                className="rounded outline-none data-[focus-visible]:ring-1 data-[focus-visible]:ring-line-focus data-[selected]:ring-2 data-[selected]:ring-fg"
              >
                <ColorSwatch className="size-5 rounded" />
              </ColorSwatchPickerItem>
            ))}
          </ColorSwatchPicker>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
