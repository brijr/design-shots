# Context

Glossary of canonical terms for the design-tools monorepo. Vocabulary only —
implementation lives in code, decisions in `docs/adr/`.

## Tool

One deployable browser-only app under `apps/<name>`. A tool composes something
visual and hands it back. It owns its own maths and its own reasoning; it
borrows its face. Directory name, package name, and Vercel project name are the
same word.

## Shared layer

The packages under `packages/`. Invisible infrastructure only: the token
contract, the primitives, and tooling config. The shared layer holds nothing a
tool could reasonably disagree about, and never a tool's maths.

## Token contract

The set of semantic CSS variable names — and their light/dark plumbing — that
every tool implements, in `@design-tools/theme`. Tools may add their own tokens
locally; Shots adds `--stage`, the field its artboard sits on.

## Primitive

A control from `@design-tools/ui`: Button, Segmented, Field, Section. Shared
because an instrument you have to learn twice is two instruments.

## Stop

A named discrete value on a control — "Tight", "Even", "Wide". Tools offer
stops, not ranges. Every stop is a result that works, which a continuous slider
cannot promise.

## Instrument panel

The fixed right-hand column of labelled controls. Its markings are mono and
understated; its face is ergonomics, not identity.

## Stage

The field the user's work sits on. It draws no chrome the exported artifact
would not have.

## Template

`turbo/generators/templates/tool` — the shape every new tool is born in, and the
second consumer of every shared primitive.
