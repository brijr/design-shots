# Design Shots

Drop in a screenshot — or point it at a live URL — and get a clean product shot
back. Black or white, nothing else.

```bash
pnpm dev     # http://localhost:3000
```

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

**Density is tracked separately from resolution.** A URL capture is taken at
`deviceScaleFactor: 2`, so its logical size is half its pixel size. Layout works
in logical units, which keeps the 1×/2× control honest — 2× means twice the
source's own resolution, never twice whatever density it happened to arrive at.
Uploads over 2400px wide are assumed to be retina captures.

**Depth adapts to the background.** A drop shadow cannot read against pure
black, so on a black background the artwork gets a hairline of light along its
edge instead. Same control, different honest answer.

### Layout

| Path | Role |
| --- | --- |
| `lib/composition.ts` | Layout maths and the canvas painter. All output pixels originate here. |
| `lib/url.ts` | URL normalisation and the private-network guard. |
| `app/api/capture/route.ts` | Headless Chrome screenshot of a live URL. |
| `components/stage.tsx` | The canvas, the drop target, the empty state. |
| `components/studio.tsx` | State and the instrument panel. |
| `components/ui.tsx` | The four primitives the panel is built from. |

Uploaded and pasted images never leave the browser. Only a URL capture touches
the server, and only the URL is sent.

## URL capture

`POST /api/capture` runs Puppeteer against a real Chromium.

- **Local** — uses the Chrome already installed on the machine. Override the
  path with `CHROME_EXECUTABLE_PATH` if it lives somewhere unusual.
- **Vercel** — falls back to `@sparticuz/chromium`. This works because Vercel
  Functions now allow package sizes up to 5 GB on Fluid Compute. The route sets
  `maxDuration = 60`, and `next.config.ts` marks both packages external so they
  are not bundled.

Requests to `localhost`, `*.local`, and private IP ranges are refused, and the
hostname is resolved and re-checked before Chrome is launched, so the endpoint
cannot be pointed at internal services.

## Design

Grayscale by intent: the interface has no accent colour, because the only
colour on screen should be the user's own work. Tokens live in
`app/globals.css` and follow the system theme. Type stays inside
`text-xs`–`text-xl`; labels are mono and understated, the way markings on an
instrument are.

## Deploying

```bash
vercel
```

Nothing needs configuring. There are no environment variables and no database —
compositions live in the browser tab and nowhere else.
