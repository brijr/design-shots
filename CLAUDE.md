# design-tools

A Turborepo of small design tools. Each one is a browser-only Next.js app that
composes something visual and hands it back — no server, no accounts, no data.

## Adding a tool

`pnpm new` is the only supported way. Never copy an app by hand: the metadata,
robots, sitemap and OG card all carry the tool's own name, and a copied app gets
them subtly wrong in ways nothing catches until a link preview is wrong in
public.

```bash
pnpm new                      # prompts for name, title, description
```

Non-interactive, in prompt order — the form an agent should use:

```bash
npx turbo gen tool --args grid "Design Grid" "Preview a grid over a screenshot."
```

`name` becomes the directory, the package name, and the Vercel project. Then:

1. Write `components/tool.tsx` — it ships a working placeholder in the house shape.
2. Rewrite `app/opengraph-image.tsx` so the card shows what the tool does.
3. Create the Vercel project: Root Directory `apps/<name>`, framework Next.js.
   Leave Ignored Build Step **empty** — Vercel skips unaffected workspace
   projects on its own, and `turbo-ignore` is deprecated.
4. Point `SITE` in `app/layout.tsx` at the real domain once it has one.

## Non-negotiables

**Static only.** No route handlers, no server actions, no environment variables,
no database. Every tool composes in the browser and deploys as static files. The
build must show every route as `○ (Static)` with zero functions. This is a cost
and privacy property, not an accident — an earlier version of Shots had a
headless-Chrome endpoint and it was deleted on purpose.

**The preview is the artifact.** If a tool renders a canvas, the on-screen canvas
must be the exported one. Never draw a border, ring or shadow around a preview
that the exported file will not have.

**Design law.** Grayscale — no accent colour, because the only colour on screen
should be the user's own work. Type stays within `text-xs`–`text-xl`. Radius
comes from `--radius` (0.375rem). `shadow-sm` at most. Labels are mono, uppercase,
understated — markings on an instrument.

**Stops, not sliders.** Controls offer two to four named values. Three stops are
three results that work; a slider promises a thousand settings and delivers one
that is right.

**Will never grow:** headline text baked into output, gradient or photo
backgrounds, device bezels, collages, accounts. Each is a fast route to looking
like every other tool of its kind.

## Layout

| Path | Holds |
| --- | --- |
| `apps/<name>` | One deployable tool. Owns its own maths. |
| `packages/ui` | Button, Segmented, Field, Section, cn. Nothing a tool could disagree about — **never the maths**. |
| `packages/theme` | The oklch token contract as CSS. |
| `packages/typescript-config` | `base.json`, `next.json`. |
| `packages/eslint-config` | `next`, `react-library`. |
| `turbo/generators` | The `tool` generator and its templates. |

## Gotchas that fail silently

- **Tailwind does not scan `packages/ui`** unless the app's `globals.css` says
  `@source "../../../packages/ui/src"`. Without it the panel ships unstyled and
  the build is still green.
- **`next typegen` must run before `tsc`** — `LayoutProps<"/">` does not exist on
  a cold clone. That is why `check` is `next typegen && tsc --noEmit`.
- **Versions live in `pnpm-workspace.yaml` under `catalog:`.** An app's
  `package.json` says `"next": "catalog:"` and never a number.
- **Template files are Handlebars.** A doubled opening brace is an
  interpolation, so JSX inline styles must be hoisted into consts.
- **`turbo` does not scope to your shell's cwd; `pnpm` does.** From the root use
  `pnpm --filter <name> dev`, or just `cd apps/<name> && pnpm dev`.
- **`pnpm deploy` is a built-in that shadows the script.** Use `pnpm run deploy`.

## Commands

```bash
pnpm new                      # scaffold a tool
pnpm dev                      # every tool at once
pnpm --filter shots dev       # one tool
pnpm check                    # typegen + tsc across the workspace
pnpm lint
pnpm build
```

Vocabulary lives in `CONTEXT.md`, decisions in `docs/adr/`, and each tool's own
reasoning in its `README.md`.
