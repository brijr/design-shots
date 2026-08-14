"use client";

import { useEffect, type RefObject } from "react";
import { artworkOf, layout, paint, type Composition } from "@/lib/composition";
import { cn } from "@/lib/utils";

export function Stage({
  art,
  density,
  composition,
  canvasRef,
  busy,
  dragging,
  onFiles,
  onDraggingChange,
  onPick,
}: {
  art: HTMLImageElement | null;
  density: number;
  composition: Composition;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  busy: boolean;
  dragging: boolean;
  onFiles: (files: FileList) => void;
  onDraggingChange: (dragging: boolean) => void;
  onPick: () => void;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !art) return;

    const l = layout(artworkOf(art, density), composition);
    canvas.width = l.pixelWidth;
    canvas.height = l.pixelHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) paint(ctx, art, composition, l);
  }, [art, density, composition, canvasRef]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDraggingChange(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        onDraggingChange(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDraggingChange(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative grid min-h-0 min-w-0 flex-1 place-items-center overflow-hidden p-6 md:p-10",
        "bg-stage transition-colors",
        dragging && "bg-accent",
      )}
    >
      {art ? (
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full rounded-[1px] ring-1 ring-border"
        />
      ) : (
        <button
          onClick={onPick}
          className="group max-w-sm rounded-md px-6 py-10 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="block text-xl font-medium tracking-tight">
            Drop a screenshot
          </span>
          <span className="mt-2 block text-sm text-muted-foreground">
            Or paste one, or capture a live URL from the panel. Your image never
            leaves this device — the shot is composed here.
          </span>
          <span className="mt-5 inline-flex h-9 items-center rounded-md border border-border px-3 text-sm transition-colors group-hover:bg-muted">
            Choose a file
          </span>
        </button>
      )}

      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-stage/80">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Capturing
          </span>
        </div>
      )}
    </div>
  );
}
