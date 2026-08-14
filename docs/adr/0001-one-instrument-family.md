# 0001 — Tools are one instrument family

Date: 2026-08-14
Status: accepted

## Context

The sibling repo `design-sites` records two rules this repo appears to break:
*"Plain pnpm — no Turborepo"*, and *"abstractions are grown from at least two
consumers, never speculated from one."* Both were right there. Restating them
here, rather than quietly contradicting them, is the point of this record.

## Decision

**Use Turborepo.** design-sites deploys Astro to Cloudflare Workers Builds,
which has no Turborepo integration, so a task runner would have been overhead.
design-tools deploys Next to Vercel, where Turborepo is first-class: workspace
project skipping, remote caching, and `turbo gen` — which is the whole spin-up
story — all come free.

**Share the face.** design-sites apps are publications *about* design; their
subject is visual difference, so looking alike would undercut the subject
matter. There, the palette is identity. design-tools apps are instruments;
their subject is the user's own work. An instrument's face is not its identity,
it is its ergonomics — and the grayscale exists precisely so it disappears
behind whatever sits on the stage. Two tools that look different are two tools
you have to learn twice.

The rule is unchanged. What flipped is what counts as identity, because the
product flipped.

**On two consumers.** This repo has two on day one. Every export of
`@design-tools/ui` is used by `apps/shots` *and* by the generator template —
the contract every future tool is born under. That is self-enforcing in both
directions: an abstraction only the template uses is dead weight and gets
deleted; one both use has been proven against two independent call sites.

## Consequences

The risk is over-sharing. The guardrail: `@design-tools/ui` holds nothing a
tool could disagree about — buttons, stops, sections. **Never the maths.**
`lib/composition.ts` stays inside `apps/shots` permanently. The moment a shared
component grows a tool-specific prop, it comes back out.

Deliberately not shared yet: the stage-and-panel layout. It is abstracted from
one example today. When a second tool has worn the same shape and it still
fits, promote it — that is the two-consumer rule doing its job rather than
being argued around.
