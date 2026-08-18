export const CANVAS_SIZE = 256;
export const PIXEL_COUNT = CANVAS_SIZE * CANVAS_SIZE;
export const TRANSPARENT = 255;
export const MAX_COLORS = 16;
export const MAX_LAYERS = 16;

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export interface PixelLayer {
  id: string;
  name: string;
  visible: boolean;
  pixels: Uint8Array;
}

export interface PixelDocument {
  name: string;
  width: typeof CANVAS_SIZE;
  height: typeof CANVAS_SIZE;
  palette: string[];
  layers: PixelLayer[];
  activeLayerId: string;
}

export type PatternId =
  | "dots"
  | "horizontal"
  | "vertical"
  | "crosses"
  | "checker"
  | "sparse-noise"
  | "dense-noise"
  | "alternating"
  | "dither";

export type PatternTarget = "artwork" | "selection";

export type StampId =
  | "pine"
  | "bush"
  | "flower"
  | "window"
  | "door"
  | "pillar"
  | "rooftop"
  | "rock"
  | "wave"
  | "star";

export type EditorCommand =
  | {
      type: "draw-stroke";
      points: Point[];
      color: number;
      size: 1 | 2 | 4;
    }
  | { type: "line"; from: Point; to: Point; color: number; size: 1 | 2 | 4 }
  | {
      type: "rectangle";
      from: Point;
      to: Point;
      color: number;
      size: 1 | 2 | 4;
    }
  | {
      type: "pattern";
      pattern: PatternId;
      target: PatternTarget;
      density: number;
      ink: number;
      base: number;
      seed: number;
    }
  | {
      type: "stamp";
      stamp: StampId;
      at: Point;
      ink: number;
      base: number;
    }
  | {
      type: "scatter";
      stamp: StampId;
      density: number;
      randomness: number;
      ink: number;
      base: number;
      seed: number;
    }
  | { type: "move-selection"; dx: number; dy: number }
  | { type: "clear-selection" }
  | { type: "set-palette-color"; index: number; color: string }
  | { type: "add-palette-color"; color: string }
  | { type: "remove-palette-color"; index: number }
  | { type: "replace-palette"; colors: string[] }
  | { type: "add-layer"; name?: string }
  | { type: "rename-layer"; id: string; name: string }
  | { type: "toggle-layer"; id: string }
  | { type: "duplicate-layer"; id: string }
  | { type: "delete-layer"; id: string }
  | { type: "move-layer"; id: string; direction: -1 | 1 }
  | { type: "merge-down"; id: string };

export function layerById(document: PixelDocument, id: string): PixelLayer {
  const layer = document.layers.find((candidate) => candidate.id === id);
  if (!layer) throw new Error(`Unknown layer: ${id}`);
  return layer;
}

export function pointIndex(point: Point): number {
  return point.y * CANVAS_SIZE + point.x;
}

export function inside(point: Point): boolean {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < CANVAS_SIZE &&
    point.y < CANVAS_SIZE
  );
}

export function normalizeRect(from: Point, to: Point): Rect {
  const left = Math.max(0, Math.min(from.x, to.x));
  const top = Math.max(0, Math.min(from.y, to.y));
  const right = Math.min(CANVAS_SIZE - 1, Math.max(from.x, to.x));
  const bottom = Math.min(CANVAS_SIZE - 1, Math.max(from.y, to.y));
  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

export function cloneDocument(document: PixelDocument): PixelDocument {
  return {
    ...document,
    palette: [...document.palette],
    layers: document.layers.map((layer) => ({
      ...layer,
      pixels: layer.pixels.slice(),
    })),
  };
}

export function makeLayer(name: string): PixelLayer {
  const pixels = new Uint8Array(PIXEL_COUNT);
  pixels.fill(TRANSPARENT);
  return { id: crypto.randomUUID(), name, visible: true, pixels };
}
