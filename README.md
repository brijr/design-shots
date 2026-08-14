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

**The preview must never flatter the file.** The stage draws no ring, border,
or shadow around the canvas, because none of that would be in the exported PNG.
This matters more than it sounds: an early version put a `ring-1` on the canvas
element, which meant a white screenshot on a white background looked correctly
bounded on screen and exported as a featureless white rectangle.

**Edge is a control, not a special case.** The hairline along the artwork's
boundary is the only thing separating a light UI from a white background, or a
dark one from black — so it is a first-class control rather than behaviour
hidden inside the shadow setting. It flips polarity with the background: dark
on light surfaces, light on dark ones.

**Shadow is only ever a drop shadow.** It reads on white and paper, faintly on
charcoal, and not at all on pure black — where nothing can be darker than the
background. That is the honest answer rather than a special case, and it is why
charcoal exists alongside black.

**Settings are remembered, images are not.** Shots are made in sets, so the
composition persists to `localStorage` and is applied when the next image
arrives. The image itself is never stored anywhere.

### Layout

| Path | Role |
| --- | --- |
| `lib/composition.ts` | Layout maths and the canvas painter. All output pixels originate here. |
| `public/example.webp` | The "try an example" shot — a real capture of [bridger.to](https://bridger.to), loaded only on click. |
| `components/stage.tsx` | The canvas, the drop target, the empty state. |
| `components/studio.tsx` | State and the instrument panel. |
| `components/ui.tsx` | The four primitives the panel is built from. |

Copy is the primary action (`⌘C`) — a shot bound for a post goes to the
clipboard and never touches the filesystem. `⌘S` saves a PNG. Both defer to the
browser while you are typing or have text selected.

## Design

Grayscale by intent: the interface has no accent colour, because the only
colour on screen should be the user's own work. Tokens live in
`app/globals.css` and follow the system theme. Type stays inside
`text-xs`–`text-xl`; labels are mono and understated, the way markings on an
instrument are.

Every control offers a few good values rather than a continuous range. A
slider promises a thousand settings and delivers one that is right; three
named stops are three compositions that work. The four backgrounds are
neutrals for the same reason.

Things this will not grow: headline text on the shot, gradient or photo
backgrounds, device bezels, collages, and accounts. Each is a fast route to
looking like every other screenshot tool.

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
