export const en = {
  "app.untitled": "Untitled drawing",

  "kind.point": "Point",
  "kind.segment": "Segment",
  "kind.polyline": "Polyline",
  "kind.surface": "Surface",
  "kind.solid": "Solid",
  "kind.a.point": "a Point",
  "kind.a.segment": "a Segment",
  "kind.a.polyline": "a Polyline",
  "kind.a.surface": "a Surface",
  "kind.a.solid": "a Solid",

  "noun.point.one": "Point",
  "noun.point.other": "Points",
  "noun.segment.one": "Segment",
  "noun.segment.other": "Segments",
  "noun.polyline.one": "Polyline",
  "noun.polyline.other": "Polylines",
  "noun.surface.one": "Surface",
  "noun.surface.other": "Surfaces",
  "noun.solid.one": "Solid",
  "noun.solid.other": "Solids",
  "noun.object.one": "object",
  "noun.object.other": "objects",
  "noun.piece.one": "piece",
  "noun.piece.other": "pieces",
  "noun.copy.one": "copy",
  "noun.copy.other": "copies",

  "view.top": "Top",
  "view.front": "Front",
  "view.right": "Right",
  "view.perspective": "Perspective",
  "view.group": "View",
  "display.group": "Display mode",
  "display.shaded": "Shaded",
  "display.wireframe": "Wireframe",

  "snap.Point": "Point",
  "snap.Vertex": "Vertex",
  "snap.Midpoint": "Midpoint",
  "snap.Edge": "Edge",
  "snap.Grid": "Grid",

  "gumball.move": "Move {axis}",
  "gumball.rotate": "Rotate {axis}",
  "gumball.scale": "Scale {axis}",

  "command.point": "Point",
  "command.segment": "Segment",
  "command.polyline": "Polyline",
  "command.rectangle": "Rectangle",
  "command.box": "Box",
  "command.planarSurface": "Planar Surface",
  "command.extrude": "Extrude",
  "command.join": "Join",
  "command.explode": "Explode",
  "command.copy": "Copy",
  "command.mirror": "Mirror",
  "command.array": "Array",
  "command.delete": "Delete",
  "command.undo": "Undo",
  "command.redo": "Redo",
  "command.zoomExtents": "Zoom Extents",
  "command.zoomSelected": "Zoom Selected",
  "command.shaded": "Shaded",
  "command.wireframe": "Wireframe",

  "prompt.idle": "Command",
  "prompt.idlePlaceholder": "Type a command, e.g. box",
  "prompt.activePlaceholder": "Type a value, or click in the viewport",
  "prompt.region": "Command prompt",
  "prompt.history": "Command history",
  "prompt.selectObjects": "Select objects to {verb}, then press Enter",
  "prompt.pointLocation": "Location of point",
  "prompt.segmentStart": "Start of segment",
  "prompt.segmentEnd": "End of segment",
  "prompt.polylineStart": "Start of polyline",
  "prompt.polylineNext": "Next point (Enter to finish, U to undo)",
  "prompt.polylineNextClosable": "Next point (Enter to finish, C to close, U to undo)",
  "prompt.rectangleFirst": "First corner of rectangle",
  "prompt.rectangleOther": "Other corner of rectangle",
  "prompt.boxFirst": "First corner of base",
  "prompt.boxOther": "Other corner of base",
  "prompt.boxHeight": "Height (type a number or pick a point)",
  "prompt.extrudeDistance": "Extrusion distance (type a number or pick a point)",
  "prompt.copyFrom": "Point to copy from",
  "prompt.copyTo": "Point to copy to (Enter to finish)",
  "prompt.mirrorStart": "Start of mirror plane",
  "prompt.mirrorEnd": "End of mirror plane",
  "prompt.arrayCount": "Number of items, including the original (Enter for 3)",
  "prompt.arrayFirst": "First reference point",
  "prompt.arraySecond": "Second reference point (spacing between items)",

  "verb.fill": "fill",
  "verb.extrude": "extrude",
  "verb.join": "join",
  "verb.explode": "explode",
  "verb.copy": "copy",
  "verb.mirror": "mirror",
  "verb.array": "array",

  "log.command": "Command: {name}",
  "log.cancelled": "Cancelled.",
  "log.created": "Created {what}.",
  "log.createdClosed": "Created 1 closed {kind}.",
  "log.and": "{a} and {b}",
  "log.skippedNotFlat": "Skipped {what} that aren't flat.",
  "log.skippedNotFlatOne": "Skipped {what} that isn't flat.",
  "log.joined": "Joined {what} into {into}.",
  "log.exploded": "Exploded {what} into {into}.",
  "log.made": "Made {what}.",
  "log.mirrored": "Mirrored {what}.",
  "log.deleted": "Deleted {what}.",
  "log.undid": "Undid {label}.",
  "log.redid": "Redid {label}.",
  "log.movedToLayer": "Moved {what} to {layer}.",
  "log.transform": "{label} {value}",

  "error.segmentPoints": "A Segment needs two different points.",
  "error.closeNeedsThree": "Closing needs at least three points.",
  "error.cornersDiffer": "The corners must differ in both directions.",
  "error.boxHeight": "A Box needs a height other than zero.",
  "error.planarNeedsClosed": "Planar Surface needs closed Polylines.",
  "error.extrudeNeedsProfiles": "Extrude needs Segments, Polylines or Surfaces.",
  "error.extrudeNothing": "Nothing to extrude at that distance.",
  "error.joinNothing": "Nothing to join: no shared endpoints or Edges.",
  "error.explodeNothing": "Nothing to explode.",
  "error.pickDifferentEnd": "Pick a different end point.",
  "error.pickDifferentPoint": "Pick a different point.",
  "error.arrayCount": "The number of items must be a whole number of at least 2.",
  "error.unknownCommand": 'Unknown command "{text}".',
  "error.noPointHere": "This step doesn't take a point.",
  "error.noNumberHere": "This step doesn't take a number.",
  "error.notAnOption": '"{text}" isn\'t an option here.',
  "error.noAnchor": "There's no previous point for @ to be relative to.",
  "error.unknownInput": 'Unknown input "{text}".',
  "error.selectToDelete": "Select objects to delete first.",
  "error.selectToMove": "Select objects to move onto a layer first.",
  "error.nothingToUndo": "Nothing to undo.",
  "error.nothingToRedo": "Nothing to redo.",

  "undo.newLayer": "New layer",
  "undo.deleteLayer": "Delete layer",
  "undo.reorderLayers": "Reorder layers",
  "undo.changeLayer": "Change layer",
  "undo.currentLayer": "Current layer",
  "undo.layerColor": "Layer color",
  "undo.renameLayer": "Rename layer",
  "undo.hideLayer": "Hide layer",
  "undo.showLayer": "Show layer",
  "undo.lockLayer": "Lock layer",
  "undo.unlockLayer": "Unlock layer",

  "layers.title": "Layers",
  "layers.new": "New layer",
  "layers.reorder": "Reorder {layer}",
  "layers.isCurrent": "{layer} is the current layer",
  "layers.makeCurrent": "Make {layer} current",
  "layers.currentTooltip": "Current layer",
  "layers.makeCurrentTooltip": "Make current",
  "layers.color": "{layer} color",
  "layers.hide": "Hide {layer}",
  "layers.show": "Show {layer}",
  "layers.hideTooltip": "Hide",
  "layers.showTooltip": "Show",
  "layers.lock": "Lock {layer}",
  "layers.unlock": "Unlock {layer}",
  "layers.lockTooltip": "Lock",
  "layers.unlockTooltip": "Unlock",
  "layers.options": "{layer} options",
  "layers.moveSelectionHere": "Move selection here",
  "layers.menuMakeCurrent": "Make current",
  "layers.rename": "Rename",
  "layers.delete": "Delete layer",
  "layers.name": "Layer name",
  "layers.objectCount": "{count} objects",
  "layers.confirmTitle": 'Delete layer "{layer}"?',
  "layers.confirmMessage": "This also deletes the {count} objects on it. You can undo this.",
  "layers.confirmDelete": "Delete",

  "properties.title": "Properties",
  "properties.nothing": "Nothing selected",
  "properties.type": "Type",
  "properties.object": "Object",
  "properties.layer": "Layer",
  "properties.varies": "Varies",
  "properties.vertices": "Vertices",
  "properties.faces": "Faces",
  "properties.closed": "Closed",
  "properties.yes": "Yes",
  "properties.no": "No",
  "properties.location": "Location",
  "properties.center": "Center",
  "properties.size": "Size",
  "properties.length": "Length",
  "properties.area": "Area",
  "properties.volume": "Volume",

  "status.cursor": "Cursor position",
  "status.grid": "Grid 1 m",
  "status.layer": "Layer",
  "status.noSelection": "No selection",
  "status.selected": "{count} selected",
  "status.shiftHint": "Hold Shift to snap",

  "toolbar.label": "Tools",
  "dialog.cancel": "Cancel",
} as const;

export type StringKey = keyof typeof en;
export type StringTable = Record<StringKey, string>;
export type NounKey =
  | "point"
  | "segment"
  | "polyline"
  | "surface"
  | "solid"
  | "object"
  | "piece"
  | "copy";

interface Locale {
  readonly strings: StringTable;
  /** True when `count` takes the singular form. */
  readonly singular: (count: number) => boolean;
}

const LOCALES: Record<string, Locale> = {
  en: { strings: en, singular: (n) => n === 1 },
};

const ACTIVE_LOCALE = "en";

const active = (): Locale => LOCALES[ACTIVE_LOCALE] ?? (LOCALES.en as Locale);

export function t(key: StringKey, params: Record<string, string | number> = {}): string {
  return active().strings[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** "3 Solids", "1 Surface": the count followed by the noun in the right form. */
export function count(n: number, noun: NounKey): string {
  const form = active().singular(n) ? "one" : "other";
  return `${n} ${active().strings[`noun.${noun}.${form}`]}`;
}
