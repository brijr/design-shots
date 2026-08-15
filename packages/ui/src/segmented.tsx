"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "./cn";

export interface Option<T extends string> {
  value: T;
  label: string;
  /** Colour chip rendered ahead of the label, for pickers. */
  swatch?: string;
}

/**
 * A few named stops instead of a continuous range. Every stop is a value that
 * works, which a slider cannot promise.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  columns,
  label,
}: {
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  columns?: number;
  label?: string;
}) {
  const cols = columns ?? options.length;
  const group = useRef<HTMLDivElement>(null);

  // Swatches read as a column, so labels of different lengths must not push
  // them off a shared left edge. Centre only when there is nothing to line up.
  const aligned = options.some((option) => option.swatch);

  // A radiogroup is driven with arrow keys, not by tabbing through every
  // option. Without this, reaching the last control means ~20 tab stops.
  const step = (delta: number) => {
    const from = options.findIndex((o) => o.value === value);
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    group.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      [next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!delta) return;
    event.preventDefault();
    step(delta);
  };

  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="grid overflow-hidden rounded-md border border-border"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-11 items-center gap-2 text-xs transition-colors md:h-9",
              aligned ? "justify-start px-3" : "justify-center px-2",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              i % cols !== 0 && "border-l border-border",
              i >= cols && "border-t border-border",
              active
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.swatch && (
              <span
                aria-hidden
                className="size-3 rounded-full border border-border"
                style={{ background: option.swatch }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}