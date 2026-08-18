import {
  CANVAS_SIZE,
  PIXEL_COUNT,
  TRANSPARENT,
  type PixelDocument,
  type PixelLayer,
} from "./types";
import { patternPixel } from "./patterns";
import { stampById } from "./stamps";

export const STARTER_PALETTE = [
  "#090b12",
  "#22335f",
  "#6579d8",
  "#2d7b68",
  "#8bd06a",
  "#9b753b",
  "#c7815e",
  "#f0b98f",
] as const;

function layer(name: string): PixelLayer {
  const pixels = new Uint8Array(PIXEL_COUNT);
  pixels.fill(TRANSPARENT);
  return { id: crypto.randomUUID(), name, visible: true, pixels };
}

function set(layer: PixelLayer, x: number, y: number, color: number): void {
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  layer.pixels[y * CANVAS_SIZE + x] = color;
}

function fill(
  target: PixelLayer,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
): void {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) set(target, px, py, color);
  }
}

function line(
  target: PixelLayer,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: number,
): void {
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) {
    set(target, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const twice = error * 2;
    if (twice >= dy) {
      error += dy;
      x0 += sx;
    }
    if (twice <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function place(
  target: PixelLayer,
  stampId: "pine" | "flower",
  x: number,
  y: number,
  ink: number,
): void {
  const stamp = stampById(stampId);
  stamp.rows.forEach((row, py) => {
    [...row].forEach((value, px) => {
      if (value === "1" || value === "2") set(target, x + px, y + py, ink);
    });
  });
}

export function createBlankDocument(): PixelDocument {
  const base = layer("Layer 1");
  return {
    name: "Untitled coast",
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    palette: [...STARTER_PALETTE],
    layers: [base],
    activeLayerId: base.id,
  };
}

export function createStarterDocument(): PixelDocument {
  const background = layer("Background");
  const sky = layer("Sky");
  const mountains = layer("Mountains");
  const forest = layer("Forest");
  const buildings = layer("Buildings");
  const plants = layer("Plants");
  const frame = layer("Frame");

  fill(background, 0, 0, 256, 256, 0);
  fill(sky, 18, 18, 220, 105, 1);
  for (let y = 18; y < 123; y += 1) {
    for (let x = 18; x < 238; x += 1) {
      sky.pixels[y * 256 + x] = patternPixel("dots", x, y, 0.5, 2, 1, 1);
    }
  }

  const peaks = [
    [18, 126, 69, 70, 112, 126],
    [72, 126, 130, 61, 183, 126],
    [142, 126, 200, 76, 238, 126],
  ];
  peaks.forEach(([left, bottom, peak, top, right]) => {
    for (let x = left; x <= right; x += 1) {
      const edge =
        x <= peak
          ? bottom - ((bottom - top) * (x - left)) / (peak - left)
          : top + ((bottom - top) * (x - peak)) / (right - peak);
      for (let y = Math.round(edge); y <= bottom; y += 1) {
        set(
          mountains,
          x,
          y,
          patternPixel("dither", x, y, 0.66, 2, 1, 3),
        );
      }
    }
  });

  for (let row = 0; row < 4; row += 1) {
    const y = 116 + row * 18;
    for (let x = 22 + (row % 2) * 6; x < 232; x += 15) {
      place(forest, "pine", x, y, row < 2 ? 4 : 3);
    }
  }

  const homes = [
    { x: 28, y: 153, w: 48, h: 47 },
    { x: 92, y: 132, w: 55, h: 68 },
    { x: 164, y: 143, w: 61, h: 57 },
  ];
  homes.forEach((home, index) => {
    const color = index === 1 ? 6 : 7;
    fill(buildings, home.x, home.y, home.w, home.h, color);
    fill(buildings, home.x + 3, home.y + 4, home.w - 6, home.h - 7, 0);
    line(buildings, home.x - 4, home.y, home.x + home.w + 4, home.y, color);
    for (let x = home.x + 7; x < home.x + home.w - 5; x += 10) {
      line(buildings, x, home.y + 5, x, home.y + home.h - 4, color);
    }
    fill(buildings, home.x + 10, home.y + 18, 10, 11, color);
    fill(buildings, home.x + 12, home.y + 20, 6, 7, 0);
  });

  for (let x = 21; x < 235; x += 12) {
    place(plants, x % 24 === 9 ? "flower" : "pine", x, 202 + (x % 3), x % 4 ? 5 : 4);
  }

  line(frame, 12, 12, 243, 12, 5);
  line(frame, 12, 243, 243, 243, 5);
  line(frame, 12, 12, 12, 243, 5);
  line(frame, 243, 12, 243, 243, 5);
  line(frame, 15, 15, 240, 15, 5);
  line(frame, 15, 240, 240, 240, 5);
  line(frame, 15, 15, 15, 240, 5);
  line(frame, 240, 15, 240, 240, 5);

  const layers = [background, sky, mountains, forest, buildings, plants, frame];
  return {
    name: "A quiet coast",
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    palette: [...STARTER_PALETTE],
    layers,
    activeLayerId: plants.id,
  };
}
