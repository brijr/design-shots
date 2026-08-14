import type { ReactNode } from "react";

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
