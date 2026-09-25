# Lintel — Context

Language for Lintel, a CAD drafting app: what a drawing is made of and how its
parts relate. Glossary only; decisions live in `docs/adr/`.

## Glossary

### Object
Anything a user draws and can select on its own: a Point, Segment, Polyline,
Surface or Solid.

### Point
A single location in space.

### Segment
A straight piece between two endpoints: either an Object on its own or one
link of a Polyline. Exploding a Polyline turns each link into a Segment;
joining Segments that share endpoints chains them into a Polyline.
_Avoid_: line

### Polyline
Two or more Segments chained end to end. Closed when its last endpoint meets
its first. A rectangle is a closed Polyline.

### Vertex
A point where Segments meet or end, or a corner of a Face.
_Avoid_: corner

### Edge
A straight side of a Face. Faces joined into a Surface or Solid share Edges.

### Face
One flat, straight-edged region, possibly with holes. Surfaces and Solids
are made of Faces; a lone Face is a one-Face Surface.

### Surface
One or more Faces joined edge to edge that do not enclose space.

### Solid
Faces joined edge to edge that fully enclose space, with no gaps. Joining
Surfaces that close up produces a Solid; exploding a Solid produces one
Surface per Face.
_Avoid_: volume

### Planar Surface
Making a Face from closed, flat Polylines. A Polyline lying inside another
becomes a hole, which is how a wall gets its window openings.

### Extrude
Sweeping a Segment, Polyline or Surface along a straight line. A Segment or
open Polyline sweeps into a Surface; a closed Polyline or a Surface sweeps
into a Solid, capped at both ends.

### Selection
The Objects currently picked. Tools and the Gumball act on the Selection.
Only whole Objects are picked, never a single Face or Edge.

### Gumball
The widget drawn at the Selection for moving, rotating and scaling it: an
arrow per world axis to move along, an arc per axis to rotate about, a box
per axis to scale along. Clicking a handle without dragging takes an exact
value instead.

### Layer
A named group every Object belongs to exactly one of. Layers form a flat
list, never nested. A Layer gives its Objects their display colour and can
be made current, hidden or locked. New Objects go on the current Layer.

### Hidden
A Layer whose Objects can't be seen, picked or snapped to.

### Locked
A Layer whose Objects can be seen and snapped to but not picked.

### Viewport
The one canvas where the drawing is displayed and drawn in. It shows one
View at a time.

### View
Where the Viewport looks from: Top, Front, Right or Perspective. Top, Front
and Right look straight along a world axis with no perspective; Perspective
can be orbited.

### Construction Plane
The plane a click lands on unless it snaps to something. Each View has a
fixed one through the origin: the ground (world XY) for Top and Perspective,
world XZ for Front, world YZ for Right. Z is up.

### Snap
Pulling a picked point onto an exact position. Snapping happens only while
Shift is held; otherwise a click lands freely on the Construction Plane.
Either an Object Snap or a Grid Snap.

### Object Snap
A Snap onto a feature of an existing Object: a Point, a Vertex, the midpoint
of an Edge or Segment, or the nearest spot along one. An Object Snap can land
off the Construction Plane: snapping to the top of a wall picks a point at
the wall's height.

### Grid Snap
A Snap onto the nearest grid intersection on the Construction Plane.

### Command Prompt
Where a tool says what it needs next ("First corner of box") and where the
user can type it instead of clicking: a position (`4,3,0`), a position
relative to the last point (`@10,0,0`), or a number when the tool asks for
one, such as a height. Its scrollback is the command history.

## Flagged ambiguities

- **"line"** meant both a single straight piece and linework in general.
  Resolved: the single piece is a Segment; a chain is a Polyline.
- **"volume"** meant both the enclosed Object and its measurement. Resolved:
  the Object is a Solid; volume is what you measure of it.
- **"curve"** is Rhino's umbrella for one-dimensional Objects. Not used: this
  version has no curved geometry, so Segment and Polyline are named directly.
