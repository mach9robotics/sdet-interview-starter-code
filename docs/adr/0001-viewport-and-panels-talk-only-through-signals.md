# 0001 — The viewport and panels talk only through signals

Status: accepted (2026-09-23)

## Context

The Viewport is plain three.js; the panels (toolbar, layers, properties,
Command Prompt) are React. Both read and change the same drawing. Three ways
to connect them were considered:

1. **React Three Fiber** — the scene as React components. Rejected: CAD
   needs direct control over when frames render, how picking works, and how
   Gumball drags feel, and R3F re-renders on React's schedule.
2. **Direct calls** — panels hold references into the three.js scene.
   Rejected: every panel becomes coupled to scene internals, and render
   timing gets spread across components.
3. **Signals** — the document model and Viewport emit typed signals; panels
   subscribe and issue commands. Chosen.

For the signal primitive itself: TC39 Signals is Stage 1 with no browser
support; `EventTarget` is untyped and has no value-holding counterpart; a
private in-house library can't ship in this repo. So the app carries its own
small `Signal<T>` / `SignalValue<T>` / `CompositeDisposable`.

## Decision

- React never imports three.js or touches the scene. The Viewport never
  imports React.
- State flows out through signals (`SignalValue` for current state, `Signal`
  for events); intent flows in as commands on the document model.
- Every subscription returns a disposable; components dispose on unmount.

## Consequences

- One quick direct call from a panel into the scene breaks the boundary. Add
  a signal or a command instead.
- Frames render only in response to signals, so there is one place that
  decides when the canvas is up to date.
