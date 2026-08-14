import type { ReactNode } from "react";
import { cn } from "./cn";

/** A titled group in an instrument panel. The title is a marking, not a heading. */
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
