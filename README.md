# Lintel

A small CAD drafting app for the browser. Draw Points, Segments and
Polylines; turn closed outlines into Surfaces; extrude them into Solids; move,
rotate and scale with a gumball; and organise everything on layers.

The words this app uses (Segment, Surface, Solid, Construction Plane, Snap,
and so on) are defined in [CONTEXT.md](CONTEXT.md). Architecture decisions
live in [docs/adr/](docs/adr/).

## Running it

Requires Node 22 or later.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Your drawing autosaves to the browser's
local storage, so a reload brings it back.

| Script | What it does |
|---|---|
| `npm run dev` | Development server on port 5173 |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run preview` | Serve the production build on port 5173 |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | Biome: formatting and lint rules |
| `npm run format` | Biome: apply formatting and safe fixes |

## Using it

**Mouse.** Left-click picks points and selects. Right-drag orbits in the
Perspective view and pans in Top, Front and Right. Middle-drag pans. The
wheel zooms toward the cursor.

**Keyboard.** `1`–`4` switch between Top, Front, Right and Perspective. `Z`
zooms to fit. `Delete` deletes the Selection. `Esc` cancels the running tool,
or clears the Selection. `⌘Z` / `⇧⌘Z` undo and redo (`Ctrl` on Windows and
Linux). `⌘A` selects everything that isn't Hidden or Locked.

**Command Prompt.** Everything in the toolbar can also be typed: `box`,
`polyline`, `extrude`, and so on. Pressing Enter at an empty prompt repeats
the last command. While a tool is asking for a point, type it instead of
clicking:

| Input | Meaning |
|---|---|
| `4,3,0` | A world position |
| `4,3` | A position on the current View's Construction Plane |
| `@10,0,0` | Relative to the last point picked (also `@10,0`) |
| `2.5` | A number, when the tool asks for one (a height, a distance, a count) |

**Snapping.** Clicks land freely on the Construction Plane. Hold `Shift` to
snap to the nearest Point, Vertex, edge midpoint or spot along an edge, or
to the 1 m grid if nothing is close.

**Selection.** Click to select, `Shift`-click to add, `⌘`/`Ctrl`-click to
remove. Drag left-to-right to select what's fully inside the box;
right-to-left to select anything it touches.

**Gumball.** Appears on the Selection when no tool is running. Drag an arrow
to move, an arc to rotate, a small box to scale. Hold `Shift` while dragging
to snap. Click a handle without dragging to type an exact value.

## Tools

| Group | Tools |
|---|---|
| Draw | Point, Segment, Polyline, Rectangle, Box |
| Build | Planar Surface, Extrude, Join, Explode |
| Edit | Copy, Mirror, Array, Delete, Undo, Redo |
| View | Zoom Extents, Zoom Selected, Shaded, Wireframe |

A wall with window openings, for example: in the Front view, draw the wall's
outline and the window rectangles inside it, select them, run Planar Surface
(the inner rectangles become holes), then Extrude by the wall's thickness.

## Code map

| Folder | What's there |
|---|---|
| `src/geometry` | Pure geometry: planes, faces, extrusion, join/explode, measurement |
| `src/document` | The drawing: Objects, Layers, undo history, autosave, Selection |
| `src/tools` | One class per tool, the command registry, typed-input parsing |
| `src/viewport` | three.js: `Viewport` wires `DrawingScene` (what's drawn) to `PointerInput` (what the mouse does); plus the camera, picking, snapping and the gumball |
| `src/ui` | React panels, and the small component kit they're built from |
| `src/signals` | The typed signals the Viewport and panels communicate through |
| `src/app` | The composition root that wires the rest together |
