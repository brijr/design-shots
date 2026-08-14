# design-tools

A monorepo of small design tools. Each is a browser-only Next.js app that
composes something visual and hands it back — no server, no accounts, no data.

| Tool | What it does |
| --- | --- |
| [`apps/shots`](apps/shots) | Turns a screenshot into a clean product shot. [design-shots.com](https://design-shots.com) |

```bash
pnpm install
pnpm dev                  # every tool
pnpm --filter shots dev   # one tool
pnpm new                  # scaffold another
```

`pnpm new` writes a complete, runnable, on-brand tool into `apps/<name>` —
metadata, OG card, icon, robots, sitemap, and the house layout — so a new tool
starts at the point the last one reached.

The shared layer under `packages/` carries invisible infrastructure only: the
token contract, the control primitives, and tooling config. Each tool owns its
own maths.

Conventions live in [CLAUDE.md](CLAUDE.md), vocabulary in
[CONTEXT.md](CONTEXT.md), decisions in [docs/adr](docs/adr).

## Licence

MIT
