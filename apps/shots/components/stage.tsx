"use client";

import { useEffect, type RefObject } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@design-tools/ui/button";
import { artworkOf, layout, paint, type Composition } from "@/lib/composition";
import { cn } from "@design-tools/ui/cn";

export function Stage({
  art,
  density,
  composition,
  canvasRef,
  dragging,
  onFiles,
  onDraggingChange,
  onPick,
  onExample,
}: {
  art: HTMLImageElement | null;
  density: number;
  composition: Composition;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  dragging: boolean;
  onFiles: (files: FileList) => void;
  onDraggingChange: (dragging: boolean) => void;
  onPick: () => void;
  onExample: () => void;
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
        // Absolutely positioned, so the box is the stage minus its inset and
        // object-contain fits the shot inside it. `max-h-full` cannot do this:
        // the grid row is sized by this very element, making a percentage
        // height circular, so the browser drops it — which is how a tall shot
        // ran a thousand pixels off the bottom while a wide one looked fine.
        //
        // No ring or border either. Anything drawn around the canvas here
        // would be chrome the exported PNG does not have.
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full object-contain p-6 md:p-10"
        />
      ) : (
        <div className="max-w-sm px-6 py-10 text-center">
          <p className="text-xl font-medium tracking-tight">Drop an image</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Or paste one from the clipboard.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Button onClick={onPick}>Choose a file</Button>
            <Button variant="ghost" onClick={onExample}>
              Try an example
            </Button>
          </div>

          <a
            href="https://bridger.to"
            target="_blank"
            rel="noreferrer"
            className="mt-9 inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Built by Bridger
            <ArrowUpRight className="size-3" />
          </a>
        </div>
      )}
    </div>
  );
}
