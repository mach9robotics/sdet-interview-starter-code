import {
  ArrowUpFromLine,
  Box,
  Columns3,
  Copy,
  Dot,
  FlipHorizontal2,
  Link2,
  type LucideIcon,
  PaintBucket,
  RectangleHorizontal,
  Redo2,
  Slash,
  Trash2,
  Undo2,
  Unlink2,
  Waypoints,
} from "lucide-react";
import { Fragment } from "react";
import { Toolbar as AriaToolbar, Separator } from "react-aria-components";
import { t } from "../i18n/strings";
import { COMMANDS, type CommandId } from "../tools";
import { useApp, useSignalValue } from "./hooks";
import { IconButton, ToggleIconButton } from "./kit/IconButton";

const ICONS: Partial<Record<CommandId, LucideIcon>> = {
  point: Dot,
  segment: Slash,
  polyline: Waypoints,
  rectangle: RectangleHorizontal,
  box: Box,
  planarSurface: PaintBucket,
  extrude: ArrowUpFromLine,
  join: Link2,
  explode: Unlink2,
  copy: Copy,
  mirror: FlipHorizontal2,
  array: Columns3,
  delete: Trash2,
  undo: Undo2,
  redo: Redo2,
};

const GROUPS = ["Draw", "Build", "Edit"] as const;

export function Toolbar() {
  const app = useApp();
  const activeId = useSignalValue(app.tools.activeId);
  const undoLabel = useSignalValue(app.doc.undoLabel);
  const redoLabel = useSignalValue(app.doc.redoLabel);

  const disabled = (id: CommandId) =>
    (id === "undo" && !undoLabel) || (id === "redo" && !redoLabel);
  const tooltip = (id: CommandId, label: string, shortcut?: string) => {
    const detail =
      id === "undo" && undoLabel
        ? ` ${undoLabel}`
        : id === "redo" && redoLabel
          ? ` ${redoLabel}`
          : "";
    return shortcut ? `${label}${detail} (${shortcut})` : `${label}${detail}`;
  };

  return (
    <AriaToolbar
      aria-label={t("toolbar.label")}
      orientation="vertical"
      className="flex w-11 shrink-0 flex-col items-center gap-0.5 border-r border-line-subtle bg-panel py-2"
    >
      {GROUPS.map((group, index) => (
        <Fragment key={group}>
          {index > 0 && <Separator orientation="horizontal" className="my-1.5 h-px w-6 bg-line" />}
          {COMMANDS.filter((c) => c.group === group).map((command) => {
            const icon = ICONS[command.id];
            if (!icon) return null;
            const label = tooltip(command.id, command.label, command.shortcut);
            if (command.group === "Edit" && ["delete", "undo", "redo"].includes(command.id)) {
              return (
                <IconButton
                  key={command.id}
                  icon={icon}
                  label={command.label}
                  tooltip={label}
                  size="md"
                  isDisabled={disabled(command.id)}
                  onPress={() => app.tools.run(command.id)}
                />
              );
            }
            return (
              <ToggleIconButton
                key={command.id}
                icon={icon}
                label={command.label}
                tooltip={label}
                size="md"
                isSelected={activeId === command.id}
                onChange={(selected) => (selected ? app.tools.run(command.id) : app.tools.escape())}
              />
            );
          })}
        </Fragment>
      ))}
    </AriaToolbar>
  );
}
