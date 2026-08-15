"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@design-tools/ui/cn";

/** Past this much drag, releasing dismisses rather than springs back. */
const DISMISS_DISTANCE = 110;
/** A fast flick dismisses even from a short drag, in px per ms. */
const DISMISS_VELOCITY = 0.5;

/**
 * A bottom sheet, for the phone. Everything that makes one feel native rather
 * than like a div that moved — drag physics, the scrim, scroll containment,
 * focus return, the home-indicator inset — lives in here, so callers only
 * decide whether it is open.
 *
 * Mobile only: above `md` the panel is a sidebar and this renders nothing.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  footer,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; startedAt: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Every dismissal goes through here. Resetting the drag offset as we close —
  // rather than reacting to `open` afterwards — is what stops a sheet dragged
  // halfway down from reopening halfway down.
  const close = useCallback(() => {
    setOffset(0);
    onOpenChange(false);
  }, [onOpenChange]);

  // Escape closes, and focus moves into the sheet so the next tab lands inside
  // it rather than on the page behind.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    panel.current?.focus({ preventScroll: true });

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startedAt: event.timeStamp };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    // Downward only. Dragging up should not stretch the sheet off its rail.
    setOffset(Math.max(0, event.clientY - drag.current.startY));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const travelled = Math.max(0, event.clientY - drag.current.startY);
    const elapsed = Math.max(1, event.timeStamp - drag.current.startedAt);
    drag.current = null;
    setDragging(false);

    const flicked = travelled / elapsed > DISMISS_VELOCITY && travelled > 24;
    if (travelled > DISMISS_DISTANCE || flicked) close();
    else setOffset(0);
  };

  return (
    <div className="md:hidden" aria-hidden={!open}>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close settings"
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/25 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        inert={!open}
        style={{ transform: open ? `translateY(${offset}px)` : undefined }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col",
          "rounded-t-sheet border-t border-border bg-background outline-none",
          // The curve iOS uses to settle a sheet: quick to leave, slow to land.
          !dragging &&
            "transition-transform duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          !open && "translate-y-full",
        )}
      >
        {/* The whole header is the drag handle, not just the grabber — a 5px
            target is a target you miss. touch-none stops the browser claiming
            the gesture as a scroll. */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
        >
          <div className="flex justify-center pt-2.5">
            <span className="h-1 w-9 rounded-full bg-border" />
          </div>
          <div className="flex items-center justify-between px-5 pb-3 pt-2">
            <span className="text-sm font-medium tracking-tight">{title}</span>
            <button
              type="button"
              onClick={close}
              className="-mr-2 h-11 px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Done
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 pb-6">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 space-y-3 border-t border-border px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
