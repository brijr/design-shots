import { patternPixel } from "./patterns";
import { stampById } from "./stamps";
import {
  CANVAS_SIZE,
  MAX_COLORS,
  MAX_LAYERS,
  PIXEL_COUNT,
  TRANSPARENT,
  cloneDocument,
  inside,
  layerById,
  makeLayer,
  normalizeRect,
  pointIndex,
  type EditorCommand,
  type PixelDocument,
  type PixelLayer,
  type Point,
  type Rect,
  type StampId,
} from "./types";

interface PixelChange {
  index: number;
  before: number;
  after: number;
}

interface HistoryEntry {
  label: string;
  undo: () => void;
  redo: () => void;
}

interface ClipboardPixels {
  width: number;
  height: number;
  pixels: Uint8Array;
}

const HISTORY_LIMIT = 100;

function linePoints(from: Point, to: Point): Point[] {
  const points: Point[] = [];
  let x = from.x;
  let y = from.y;
  const dx = Math.abs(to.x - x);
  const sx = x < to.x ? 1 : -1;
  const dy = -Math.abs(to.y - y);
  const sy = y < to.y ? 1 : -1;
  let error = dx + dy;
  while (true) {
    points.push({ x, y });
    if (x === to.x && y === to.y) break;
    const twice = error * 2;
    if (twice >= dy) {
      error += dy;
      x += sx;
    }
    if (twice <= dx) {
      error += dx;
      y += sy;
    }
  }
  return points;
}

function stampPoints(
  stampId: StampId,
  at: Point,
  ink: number,
  base: number,
): Array<{ point: Point; color: number }> {
  const stamp = stampById(stampId);
  const left = at.x - Math.floor(stamp.rows[0].length / 2);
  const top = at.y - Math.floor(stamp.rows.length / 2);
  const points: Array<{ point: Point; color: number }> = [];
  stamp.rows.forEach((row, y) => {
    [...row].forEach((value, x) => {
      if (value === ".") return;
      points.push({
        point: { x: left + x, y: top + y },
        color: value === "1" ? ink : base,
      });
    });
  });
  return points;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export class PixelEditor {
  private document: PixelDocument;
  private selection: Rect | null = null;
  private clipboard: ClipboardPixels | null = null;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private listeners = new Set<() => void>();
  private revision = 0;

  constructor(document: PixelDocument) {
    this.document = cloneDocument(document);
  }

  getDocument = (): PixelDocument => this.document;
  getSelection = (): Rect | null => this.selection;
  getRevision = (): number => this.revision;
  canUndo = (): boolean => this.undoStack.length > 0;
  canRedo = (): boolean => this.redoStack.length > 0;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
  }

  private remember(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.emit();
  }

  private replaceDocument(next: PixelDocument): void {
    this.document = cloneDocument(next);
  }

  private structural(label: string, change: () => void): void {
    const before = cloneDocument(this.document);
    change();
    const after = cloneDocument(this.document);
    this.remember({
      label,
      undo: () => this.replaceDocument(before),
      redo: () => this.replaceDocument(after),
    });
  }

  private pixels(label: string, changes: Map<number, number>): void {
    const layerId = this.document.activeLayerId;
    const layer = layerById(this.document, layerId);
    const patch: PixelChange[] = [];
    changes.forEach((after, index) => {
      const before = layer.pixels[index];
      if (before === after) return;
      patch.push({ index, before, after });
      layer.pixels[index] = after;
    });
    if (!patch.length) return;
    const apply = (key: "before" | "after") => {
      const target = layerById(this.document, layerId);
      patch.forEach((item) => {
        target.pixels[item.index] = item[key];
      });
    };
    this.remember({ label, undo: () => apply("before"), redo: () => apply("after") });
  }

  private brush(changes: Map<number, number>, point: Point, color: number, size: number): void {
    const offset = Math.floor(size / 2);
    for (let y = point.y - offset; y < point.y - offset + size; y += 1) {
      for (let x = point.x - offset; x < point.x - offset + size; x += 1) {
        const candidate = { x, y };
        if (inside(candidate)) changes.set(pointIndex(candidate), color);
      }
    }
  }

  private validColor(color: number): boolean {
    return (
      color === TRANSPARENT ||
      (Number.isInteger(color) && color >= 0 && color < this.document.palette.length)
    );
  }

  setSelection(rect: Rect | null): void {
    this.selection = rect;
    this.emit();
  }

  setActiveLayer(id: string): void {
    layerById(this.document, id);
    this.document.activeLayerId = id;
    this.emit();
  }

  setName(name: string): void {
    this.document.name = name.trimStart().slice(0, 80);
    this.emit();
  }

  perform(command: EditorCommand): void {
    switch (command.type) {
      case "draw-stroke": {
        if (!this.validColor(command.color)) return;
        const changes = new Map<number, number>();
        for (let index = 1; index < command.points.length; index += 1) {
          linePoints(command.points[index - 1], command.points[index]).forEach((point) =>
            this.brush(changes, point, command.color, command.size),
          );
        }
        if (command.points.length === 1) {
          this.brush(changes, command.points[0], command.color, command.size);
        }
        this.pixels(command.color === TRANSPARENT ? "Erase" : "Draw", changes);
        break;
      }
      case "line": {
        if (!this.validColor(command.color)) return;
        const changes = new Map<number, number>();
        linePoints(command.from, command.to).forEach((point) =>
          this.brush(changes, point, command.color, command.size),
        );
        this.pixels("Line", changes);
        break;
      }
      case "rectangle": {
        if (!this.validColor(command.color)) return;
        const rect = normalizeRect(command.from, command.to);
        const changes = new Map<number, number>();
        for (let inset = 0; inset < command.size; inset += 1) {
          const left = rect.x + inset;
          const right = rect.x + rect.width - 1 - inset;
          const top = rect.y + inset;
          const bottom = rect.y + rect.height - 1 - inset;
          linePoints({ x: left, y: top }, { x: right, y: top }).forEach((point) =>
            this.brush(changes, point, command.color, 1),
          );
          linePoints({ x: left, y: bottom }, { x: right, y: bottom }).forEach((point) =>
            this.brush(changes, point, command.color, 1),
          );
          linePoints({ x: left, y: top }, { x: left, y: bottom }).forEach((point) =>
            this.brush(changes, point, command.color, 1),
          );
          linePoints({ x: right, y: top }, { x: right, y: bottom }).forEach((point) =>
            this.brush(changes, point, command.color, 1),
          );
        }
        this.pixels("Rectangle", changes);
        break;
      }
      case "pattern": {
        if (!this.validColor(command.ink) || !this.validColor(command.base)) return;
        const changes = new Map<number, number>();
        const layer = layerById(this.document, this.document.activeLayerId);
        const area = this.selection ?? { x: 0, y: 0, width: CANVAS_SIZE, height: CANVAS_SIZE };
        if (command.target === "selection" && !this.selection) return;
        for (let y = area.y; y < area.y + area.height; y += 1) {
          for (let x = area.x; x < area.x + area.width; x += 1) {
            const index = y * CANVAS_SIZE + x;
            if (command.target === "artwork" && layer.pixels[index] === TRANSPARENT) continue;
            changes.set(
              index,
              patternPixel(
                command.pattern,
                x,
                y,
                command.density,
                command.ink,
                command.base,
                command.seed,
              ),
            );
          }
        }
        this.pixels("Pattern", changes);
        break;
      }
      case "stamp": {
        if (!this.validColor(command.ink) || !this.validColor(command.base)) return;
        const changes = new Map<number, number>();
        stampPoints(command.stamp, command.at, command.ink, command.base).forEach(
          ({ point, color }) => {
            if (inside(point) && color !== TRANSPARENT) changes.set(pointIndex(point), color);
          },
        );
        this.pixels("Stamp", changes);
        break;
      }
      case "scatter": {
        if (!this.validColor(command.ink) || !this.validColor(command.base)) return;
        if (!this.selection) return;
        const stamp = stampById(command.stamp);
        const rng = random(command.seed);
        const changes = new Map<number, number>();
        const cellWidth = stamp.rows[0].length + 3;
        const cellHeight = stamp.rows.length + 3;
        const columns = Math.max(1, Math.floor(this.selection.width / cellWidth));
        const rows = Math.max(1, Math.floor(this.selection.height / cellHeight));
        const chance = Math.min(1, command.density * 1.3);
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            if (rng() > chance) continue;
            const jitterX = Math.round((rng() - 0.5) * cellWidth * command.randomness);
            const jitterY = Math.round((rng() - 0.5) * cellHeight * command.randomness);
            const at = {
              x: this.selection.x + Math.round((column + 0.5) * this.selection.width / columns) + jitterX,
              y: this.selection.y + Math.round((row + 0.5) * this.selection.height / rows) + jitterY,
            };
            stampPoints(command.stamp, at, command.ink, command.base).forEach(
              ({ point, color }) => {
                if (
                  inside(point) &&
                  color !== TRANSPARENT &&
                  point.x >= this.selection!.x &&
                  point.y >= this.selection!.y &&
                  point.x < this.selection!.x + this.selection!.width &&
                  point.y < this.selection!.y + this.selection!.height
                ) {
                  changes.set(pointIndex(point), color);
                }
              },
            );
          }
        }
        this.pixels("Scatter", changes);
        break;
      }
      case "move-selection":
        this.moveSelection(command.dx, command.dy);
        break;
      case "clear-selection": {
        if (!this.selection) return;
        const changes = new Map<number, number>();
        this.forSelection((index) => changes.set(index, TRANSPARENT));
        this.pixels("Clear selection", changes);
        break;
      }
      case "set-palette-color":
        if (!/^#[0-9a-f]{6}$/i.test(command.color)) return;
        this.structural("Change color", () => {
          this.document.palette[command.index] = command.color;
        });
        break;
      case "add-palette-color":
        if (
          this.document.palette.length < MAX_COLORS &&
          /^#[0-9a-f]{6}$/i.test(command.color)
        ) {
          this.structural("Add color", () => this.document.palette.push(command.color));
        }
        break;
      case "remove-palette-color":
        this.removePaletteColor(command.index);
        break;
      case "replace-palette":
        if (
          command.colors.length >= 2 &&
          command.colors.length <= MAX_COLORS &&
          command.colors.every((color) => /^#[0-9a-f]{6}$/i.test(color))
        ) {
          this.structural("Apply palette", () => {
            this.document.palette = [...command.colors];
            this.document.layers.forEach((layer) => {
              for (let index = 0; index < layer.pixels.length; index += 1) {
                if (
                  layer.pixels[index] !== TRANSPARENT &&
                  layer.pixels[index] >= command.colors.length
                ) {
                  layer.pixels[index] = 0;
                }
              }
            });
          });
        }
        break;
      case "add-layer":
        if (this.document.layers.length < MAX_LAYERS) {
          this.structural("Add layer", () => {
            const next = makeLayer(command.name ?? `Layer ${this.document.layers.length + 1}`);
            this.document.layers.push(next);
            this.document.activeLayerId = next.id;
          });
        }
        break;
      case "rename-layer":
        this.structural("Rename layer", () => {
          layerById(this.document, command.id).name = command.name.trim().slice(0, 40) || "Layer";
        });
        break;
      case "toggle-layer":
        this.structural("Toggle layer", () => {
          const layer = layerById(this.document, command.id);
          layer.visible = !layer.visible;
        });
        break;
      case "duplicate-layer":
        this.duplicateLayer(command.id);
        break;
      case "delete-layer":
        this.deleteLayer(command.id);
        break;
      case "move-layer":
        this.moveLayer(command.id, command.direction);
        break;
      case "merge-down":
        this.mergeDown(command.id);
        break;
    }
  }

  private forSelection(visitor: (index: number, x: number, y: number) => void): void {
    if (!this.selection) return;
    for (let y = this.selection.y; y < this.selection.y + this.selection.height; y += 1) {
      for (let x = this.selection.x; x < this.selection.x + this.selection.width; x += 1) {
        visitor(y * CANVAS_SIZE + x, x, y);
      }
    }
  }

  copySelection(): boolean {
    if (!this.selection) return false;
    const layer = layerById(this.document, this.document.activeLayerId);
    const pixels = new Uint8Array(this.selection.width * this.selection.height);
    pixels.fill(TRANSPARENT);
    this.forSelection((index, x, y) => {
      pixels[(y - this.selection!.y) * this.selection!.width + x - this.selection!.x] =
        layer.pixels[index];
    });
    this.clipboard = { width: this.selection.width, height: this.selection.height, pixels };
    return true;
  }

  cutSelection(): boolean {
    if (!this.copySelection()) return false;
    this.perform({ type: "clear-selection" });
    return true;
  }

  paste(at?: Point): boolean {
    if (!this.clipboard) return false;
    const origin = at ?? (this.selection ? { x: this.selection.x + 2, y: this.selection.y + 2 } : { x: 0, y: 0 });
    const changes = new Map<number, number>();
    for (let y = 0; y < this.clipboard.height; y += 1) {
      for (let x = 0; x < this.clipboard.width; x += 1) {
        const point = { x: origin.x + x, y: origin.y + y };
        if (!inside(point)) continue;
        changes.set(pointIndex(point), this.clipboard.pixels[y * this.clipboard.width + x]);
      }
    }
    this.pixels("Paste", changes);
    this.selection = normalizeRect(origin, {
      x: origin.x + this.clipboard.width - 1,
      y: origin.y + this.clipboard.height - 1,
    });
    this.emit();
    return true;
  }

  private moveSelection(dx: number, dy: number): void {
    if (!this.selection || (!dx && !dy)) return;
    const layer = layerById(this.document, this.document.activeLayerId);
    const source = this.selection;
    const captured: Array<{ x: number; y: number; color: number }> = [];
    this.forSelection((index, x, y) => captured.push({ x, y, color: layer.pixels[index] }));
    const changes = new Map<number, number>();
    captured.forEach(({ x, y }) => changes.set(y * CANVAS_SIZE + x, TRANSPARENT));
    captured.forEach(({ x, y, color }) => {
      const point = { x: x + dx, y: y + dy };
      if (inside(point)) changes.set(pointIndex(point), color);
    });
    this.pixels("Move selection", changes);
    this.selection = normalizeRect(
      { x: source.x + dx, y: source.y + dy },
      { x: source.x + dx + source.width - 1, y: source.y + dy + source.height - 1 },
    );
    this.emit();
  }

  private removePaletteColor(index: number): void {
    if (this.document.palette.length <= 2 || index < 0 || index >= this.document.palette.length) return;
    this.structural("Remove color", () => {
      this.document.palette.splice(index, 1);
      this.document.layers.forEach((layer) => {
        for (let i = 0; i < layer.pixels.length; i += 1) {
          if (layer.pixels[i] === index) layer.pixels[i] = 0;
          else if (layer.pixels[i] !== TRANSPARENT && layer.pixels[i] > index) layer.pixels[i] -= 1;
        }
      });
    });
  }

  private duplicateLayer(id: string): void {
    if (this.document.layers.length >= MAX_LAYERS) return;
    this.structural("Duplicate layer", () => {
      const index = this.document.layers.findIndex((layer) => layer.id === id);
      const source = layerById(this.document, id);
      const duplicate: PixelLayer = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} copy`,
        pixels: source.pixels.slice(),
      };
      this.document.layers.splice(index + 1, 0, duplicate);
      this.document.activeLayerId = duplicate.id;
    });
  }

  private deleteLayer(id: string): void {
    if (this.document.layers.length <= 1) return;
    this.structural("Delete layer", () => {
      const index = this.document.layers.findIndex((layer) => layer.id === id);
      this.document.layers.splice(index, 1);
      if (this.document.activeLayerId === id) {
        this.document.activeLayerId = this.document.layers[Math.max(0, index - 1)].id;
      }
    });
  }

  private moveLayer(id: string, direction: -1 | 1): void {
    const index = this.document.layers.findIndex((layer) => layer.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= this.document.layers.length) return;
    this.structural("Reorder layer", () => {
      const [layer] = this.document.layers.splice(index, 1);
      this.document.layers.splice(next, 0, layer);
    });
  }

  private mergeDown(id: string): void {
    const index = this.document.layers.findIndex((layer) => layer.id === id);
    if (index <= 0) return;
    this.structural("Merge layer", () => {
      const top = this.document.layers[index];
      const bottom = this.document.layers[index - 1];
      for (let i = 0; i < PIXEL_COUNT; i += 1) {
        if (top.pixels[i] !== TRANSPARENT) bottom.pixels[i] = top.pixels[i];
      }
      this.document.layers.splice(index, 1);
      this.document.activeLayerId = bottom.id;
    });
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    entry.undo();
    this.redoStack.push(entry);
    this.emit();
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    entry.redo();
    this.undoStack.push(entry);
    this.emit();
  }
}

export function composite(document: PixelDocument): Uint8ClampedArray {
  const output = new Uint8ClampedArray(PIXEL_COUNT * 4);
  for (const layer of document.layers) {
    if (!layer.visible) continue;
    for (let index = 0; index < PIXEL_COUNT; index += 1) {
      const colorIndex = layer.pixels[index];
      if (colorIndex === TRANSPARENT) continue;
      const color = document.palette[colorIndex];
      const offset = index * 4;
      output[offset] = Number.parseInt(color.slice(1, 3), 16);
      output[offset + 1] = Number.parseInt(color.slice(3, 5), 16);
      output[offset + 2] = Number.parseInt(color.slice(5, 7), 16);
      output[offset + 3] = 255;
    }
  }
  return output;
}

export function paintDocument(canvas: HTMLCanvasElement, document: PixelDocument): void {
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return;
  const pixels = new Uint8ClampedArray(composite(document));
  context.putImageData(new ImageData(pixels, CANVAS_SIZE, CANVAS_SIZE), 0, 0);
}

export function exportCanvas(pixelDocument: PixelDocument, scale: 1 | 2 | 4): HTMLCanvasElement {
  const source = window.document.createElement("canvas");
  paintDocument(source, pixelDocument);
  const output = window.document.createElement("canvas");
  output.width = CANVAS_SIZE * scale;
  output.height = CANVAS_SIZE * scale;
  const context = output.getContext("2d");
  if (!context) return output;
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, output.width, output.height);
  return output;
}
