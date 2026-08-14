# Design Shots

Drop in a screenshot and get a clean product shot back. Black or white,
nothing else.

```bash
pnpm dev     # http://localhost:3000
```

There is no server. No API routes, no database, no environment variables, no
account. Your image is read by the browser, composed on a canvas in the same
tab, and handed back to you — it never touches a network.

## How it works

**One renderer, no drift.** `lib/composition.ts` holds a single pure function,
`paint(ctx, image, composition, layout)`. The canvas you see on the stage is
rendered at full export resolution and merely scaled down by CSS, so the
"Save PNG" button just calls `toBlob()` on the canvas already on screen. There
is no second export path that can disagree with the preview.

**Sizes are fractions, not pixels.** Inset and corner radius are stored as
fractions of the artwork's long edge. A composition therefore looks identical
whether the source is an 800px screenshot or a 3200px retina capture. The panel
still reports the resolved pixel value, because that is what a designer wants
to read.

**Density is tracked apart from resolution.** A retina screenshot carries twice
the pixels of the layout it depicts, so layout works in logical units. That
keeps the 1×/2× control honest — 2× means twice the source's own resolution,
never twice whatever density it happened to arrive at. Images over 2400px wide
are assumed to be retina captures.

**Depth adapts to the background.** A drop shadow cannot read against pure
black, so on a black background the artwork gets a hairline of light along its
edge instead. Same control, different honest answer.

### Layout

| Path | Role |
| --- | --- |
| `lib/composition.ts` | Layout maths and the canvas painter. All output pixels originate here. |
| `components/stage.tsx` | The canvas, the drop target, the empty state. |
| `components/studio.tsx` | State and the instrument panel. |
| `components/ui.tsx` | The four primitives the panel is built from. |

## Design

Grayscale by intent: the interface has no accent colour, because the only
colour on screen should be the user's own work. Tokens live in
`app/globals.css` and follow the system theme. Type stays inside
`text-xs`–`text-xl`; labels are mono and understated, the way markings on an
instrument are.

## A note on URL capture

An earlier version could screenshot a live URL with headless Chromium. It
worked, and it was removed on purpose: a public, unauthenticated endpoint that
boots a browser on demand is an open invitation to spend someone else's money,
and keeping it meant the privacy claim above had to be qualified. Taking your
own screenshot costs one keystroke, and paste already works.

The build now emits static files only, so this deploys free anywhere.

## Deploying

```bash
vercel
```

## Licence

MIT
