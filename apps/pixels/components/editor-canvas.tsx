"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@design-tools/ui/cn";
import { PixelEditor, paintDocument } from "@/lib/editor";
import {
  CANVAS_SIZE,
  TRANSPARENT,
  normalizeRect,
  type Point,
  type StampId,
} from "@/lib/types";

export type CanvasTool =
  | "pencil"
  | "eraser"
  | "line"
  | "rectangle"
  | "select"
  | "move"
  | "pan"
  | "stamp";

const ZOOMS = [1, 2, 4, 8, 12, 16, 24, 32] as const;

interface DragState {
  start: Point;
  last: Point;
  points: Point[];
  panStart?: { x: number; y: number };
}

interface TouchGesture {
  distance: number;
  center: { x: number; y: number };
  zoom: number;
  pan: { x: number; y: number };
}

export function EditorCanvas({
  editor,
  revision,
  tool,
  color,
  base,
  brushSize,
  stamp,
  grid,
  readOnly = false,
  onCoordinates,
}: {
  editor: PixelEditor;
  revision: number;
  tool: CanvasTool;
  color: number;
  base: number;
  brushSize: 1 | 2 | 4;
  stamp: StampId;
  grid: boolean;
  readOnly?: boolean;
  onCoordinates?: (point: Point | null) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const touchGesture = useRef<TouchGesture | null>(null);
  const [zoom, setZoom] = useState(2);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draft, setDraft] = useState<ReturnType<typeof normalizeRect> | null>(null);
  const [space, setSpace] = useState(false);

  useEffect(() => {
    if (canvas.current) paintDocument(canvas.current, editor.getDocument());
  }, [editor, revision]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const typing = ["INPUT", "TEXTAREA"].includes(
        document.activeElement?.tagName ?? "",
      );
      if (typing) return;
      setSpace(event.type === "keydown");
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const pointAt = (clientX: number, clientY: number): Point => {
    const box = canvas.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(255, Math.floor((clientX - box.left) / zoom))),
      y: Math.max(0, Math.min(255, Math.floor((clientY - box.top) / zoom))),
    };
  };

  const changeZoom = (direction: -1 | 1) => {
    const index = ZOOMS.findIndex((value) => value === zoom);
    const next = Math.max(0, Math.min(ZOOMS.length - 1, index + direction));
    setZoom(ZOOMS[next]);
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) changeZoom(event.deltaY > 0 ? -1 : 1);
    else setPan((current) => ({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "touch") {
      touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touches.current.size === 2) {
        const [first, second] = [...touches.current.values()];
        touchGesture.current = {
          distance: Math.hypot(second.x - first.x, second.y - first.y),
          center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
          zoom,
          pan,
        };
        drag.current = null;
        return;
      }
    }
    const point = pointAt(event.clientX, event.clientY);
    const panning = readOnly || space || tool === "pan";
    drag.current = {
      start: point,
      last: point,
      points: [point],
      panStart: panning ? { x: event.clientX - pan.x, y: event.clientY - pan.y } : undefined,
    };
    if (tool === "stamp" && !panning && event.pointerType !== "touch") {
      editor.perform({ type: "stamp", stamp, at: point, ink: color, base });
      drag.current = null;
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" && touches.current.has(event.pointerId)) {
      touches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchGesture.current && touches.current.size >= 2) {
        const [first, second] = [...touches.current.values()];
        const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
        const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
        const desired = touchGesture.current.zoom * (distance / touchGesture.current.distance);
        const nextZoom = ZOOMS.reduce((closest, candidate) =>
          Math.abs(candidate - desired) < Math.abs(closest - desired) ? candidate : closest,
        );
        setZoom(nextZoom);
        setPan({
          x: touchGesture.current.pan.x + center.x - touchGesture.current.center.x,
          y: touchGesture.current.pan.y + center.y - touchGesture.current.center.y,
        });
        return;
      }
    }
    const point = pointAt(event.clientX, event.clientY);
    onCoordinates?.(point);
    if (!drag.current) return;
    if (drag.current.panStart) {
      setPan({
        x: event.clientX - drag.current.panStart.x,
        y: event.clientY - drag.current.panStart.y,
      });
      return;
    }
    drag.current.last = point;
    if (tool === "pencil" || tool === "eraser") {
      const previous = drag.current.points.at(-1);
      if (!previous || previous.x !== point.x || previous.y !== point.y) {
        drag.current.points.push(point);
      }
    } else if (tool === "select" || tool === "move" || tool === "rectangle") {
      setDraft(normalizeRect(drag.current.start, point));
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      touches.current.delete(event.pointerId);
      if (touchGesture.current) {
        if (touches.current.size < 2) touchGesture.current = null;
        drag.current = null;
        return;
      }
    }
    const current = drag.current;
    drag.current = null;
    if (!current || current.panStart) return;
    if (tool === "stamp" && event.pointerType === "touch") {
      editor.perform({ type: "stamp", stamp, at: current.last, ink: color, base });
    } else if (tool === "pencil" || tool === "eraser") {
      editor.perform({
        type: "draw-stroke",
        points: current.points,
        color: tool === "eraser" ? TRANSPARENT : color,
        size: brushSize,
      });
    } else if (tool === "line") {
      editor.perform({
        type: "line",
        from: current.start,
        to: current.last,
        color,
        size: brushSize,
      });
    } else if (tool === "rectangle") {
      editor.perform({
        type: "rectangle",
        from: current.start,
        to: current.last,
        color,
        size: brushSize,
      });
    } else if (tool === "select") {
      editor.setSelection(normalizeRect(current.start, current.last));
    } else if (tool === "move" && editor.getSelection()) {
      editor.perform({
        type: "move-selection",
        dx: current.last.x - current.start.x,
        dy: current.last.y - current.start.y,
      });
    }
    setDraft(null);
  };

  const selection = draft ?? editor.getSelection();

  return (
    <div
      ref={stage}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => onCoordinates?.(null)}
      className={cn(
        "relative min-h-0 min-w-0 flex-1 overflow-hidden bg-stage touch-none",
        space || tool === "pan" || readOnly ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair",
      )}
    >
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
          style={{
            width: CANVAS_SIZE * zoom,
            height: CANVAS_SIZE * zoom,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <canvas
            ref={canvas}
            className="pixelated absolute inset-0 size-full bg-[conic-gradient(#ddd_25%,#fff_0_50%,#ddd_0_75%,#fff_0)] bg-[length:16px_16px] dark:bg-[conic-gradient(#252525_25%,#181818_0_50%,#252525_0_75%,#181818_0)]"
          />
          {grid && zoom >= 8 && (
            <div
              aria-hidden
              className="pixel-grid pointer-events-none absolute inset-0"
              style={{ "--pixel-size": `${zoom}px` } as React.CSSProperties}
            />
          )}
          {selection && (
            <div
              aria-label={`${selection.width} by ${selection.height} pixel selection`}
              className="pointer-events-none absolute border border-white outline outline-1 outline-black/70"
              style={{
                left: selection.x * zoom,
                top: selection.y * zoom,
                width: selection.width * zoom,
                height: selection.height * zoom,
              }}
            />
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md border border-border bg-background/90 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => changeZoom(-1)}
          className="grid size-8 place-items-center rounded-sm hover:bg-muted"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="tabular w-12 text-center font-mono text-[10px] text-muted-foreground">
          {zoom}×
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => changeZoom(1)}
          className="grid size-8 place-items-center rounded-sm hover:bg-muted"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
