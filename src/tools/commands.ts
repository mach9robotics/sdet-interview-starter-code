import { t } from "../i18n/strings";
import { ExplodeTool, ExtrudeTool, JoinTool, PlanarSurfaceTool } from "./build";
import { BoxTool, PointTool, PolylineTool, RectangleTool, SegmentTool } from "./draw";
import { ArrayTool, CopyTool, MirrorTool } from "./edit";
import type { Tool, ToolHost } from "./Tool";

export type ToolId =
  | "point"
  | "segment"
  | "polyline"
  | "rectangle"
  | "box"
  | "planarSurface"
  | "extrude"
  | "join"
  | "explode"
  | "copy"
  | "mirror"
  | "array";

export type ActionId =
  | "delete"
  | "undo"
  | "redo"
  | "zoomExtents"
  | "zoomSelected"
  | "shaded"
  | "wireframe";

export type CommandId = ToolId | ActionId;

export type CommandGroup = "Draw" | "Build" | "Edit" | "View";

export interface CommandInfo {
  readonly id: CommandId;
  readonly label: string;
  readonly group: CommandGroup;
  readonly aliases: readonly string[];
  readonly shortcut?: string;
}

export const TOOL_FACTORIES: Record<ToolId, (host: ToolHost) => Tool> = {
  point: (h) => new PointTool(h),
  segment: (h) => new SegmentTool(h),
  polyline: (h) => new PolylineTool(h),
  rectangle: (h) => new RectangleTool(h),
  box: (h) => new BoxTool(h),
  planarSurface: (h) => new PlanarSurfaceTool(h),
  extrude: (h) => new ExtrudeTool(h),
  join: (h) => new JoinTool(h),
  explode: (h) => new ExplodeTool(h),
  copy: (h) => new CopyTool(h),
  mirror: (h) => new MirrorTool(h),
  array: (h) => new ArrayTool(h),
};

export const COMMANDS: readonly CommandInfo[] = [
  { id: "point", label: t("command.point"), group: "Draw", aliases: [] },
  { id: "segment", label: t("command.segment"), group: "Draw", aliases: ["line"] },
  { id: "polyline", label: t("command.polyline"), group: "Draw", aliases: ["pline"] },
  { id: "rectangle", label: t("command.rectangle"), group: "Draw", aliases: ["rect"] },
  { id: "box", label: t("command.box"), group: "Draw", aliases: [] },
  {
    id: "planarSurface",
    label: t("command.planarSurface"),
    group: "Build",
    aliases: ["planarsrf", "fill"],
  },
  { id: "extrude", label: t("command.extrude"), group: "Build", aliases: [] },
  { id: "join", label: t("command.join"), group: "Build", aliases: [] },
  { id: "explode", label: t("command.explode"), group: "Build", aliases: [] },
  { id: "copy", label: t("command.copy"), group: "Edit", aliases: [] },
  { id: "mirror", label: t("command.mirror"), group: "Edit", aliases: [] },
  { id: "array", label: t("command.array"), group: "Edit", aliases: [] },
  {
    id: "delete",
    label: t("command.delete"),
    group: "Edit",
    aliases: ["del", "erase"],
    shortcut: "Delete",
  },
  { id: "undo", label: t("command.undo"), group: "Edit", aliases: [], shortcut: "⌘Z" },
  { id: "redo", label: t("command.redo"), group: "Edit", aliases: [], shortcut: "⇧⌘Z" },
  {
    id: "zoomExtents",
    label: t("command.zoomExtents"),
    group: "View",
    aliases: ["z", "zoom", "ze"],
    shortcut: "Z",
  },
  { id: "zoomSelected", label: t("command.zoomSelected"), group: "View", aliases: ["zs"] },
  { id: "shaded", label: t("command.shaded"), group: "View", aliases: [] },
  { id: "wireframe", label: t("command.wireframe"), group: "View", aliases: ["wire"] },
];

export function findCommand(word: string): CommandInfo | undefined {
  const normalized = word.toLowerCase().replace(/\s+/g, "");
  return COMMANDS.find(
    (c) =>
      c.id.toLowerCase() === normalized ||
      c.label.toLowerCase().replace(/\s+/g, "") === normalized ||
      c.aliases.includes(normalized),
  );
}

export const isToolId = (id: CommandId): id is ToolId => id in TOOL_FACTORIES;
