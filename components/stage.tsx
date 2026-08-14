"use client";

import { useEffect, type RefObject } from "react";
import { Button } from "@/components/ui";
import { artworkOf, layout, paint, type Composition } from "@/lib/composition";
import { cn } from "@/lib/utils";

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
        // No ring, no border. Anything drawn around the canvas here would be
        // chrome the exported PNG does not have, and the preview must not
        // flatter the file.
        <canvas ref={canvasRef} className="max-h-full max-w-full" />
      ) : (
        <div className="max-w-sm px-6 py-10 text-center">
          <p className="text-xl font-medium tracking-tight">
            Drop a screenshot
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Or paste one from the clipboard. Nothing is ever uploaded — there is
            no server, and the shot is composed in this tab.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Button onClick={onPick}>Choose a file</Button>
            <Button variant="ghost" onClick={onExample}>
              Try an example
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
