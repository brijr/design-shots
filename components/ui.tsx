"use client";

import { useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */

export function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A named control. Stacked segmented rows look alike, so each one says what it
 * governs — "None" means something different under Corner than under Shadow.
 */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type ButtonVariant = "default" | "outline" | "ghost";

export function Button({
  variant = "outline",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3",
        "text-sm font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40",
        variant === "default" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" &&
          "border border-border text-foreground hover:bg-muted",
        variant === "ghost" && "text-muted-foreground hover:text-foreground",
        className,
      )}
    />
  );
}

/* -------------------------------------------------------------------------- */

export interface Option<T extends string> {
  value: T;
  label: string;
  /** Colour chip rendered ahead of the label, for the background picker. */
  swatch?: string;
}

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
              "flex h-9 items-center gap-2 text-xs transition-colors",
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

