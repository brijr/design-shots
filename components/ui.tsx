"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
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
  return (
    <div
      role="radiogroup"
      aria-label={label}
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
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 px-2 text-xs transition-colors",
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

/* -------------------------------------------------------------------------- */

export function Slider({
  label,
  readout,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  readout: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="tabular text-xs text-muted-foreground">{readout}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
