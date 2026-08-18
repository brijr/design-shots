import { TRANSPARENT, type PatternId } from "./types";

const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const;

function hash(x: number, y: number, seed: number): number {
  let value = Math.imul(x ^ seed, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16) ^ y, 0x45d9f3b);
  value ^= value >>> 16;
  return (value >>> 0) / 0xffffffff;
}

function interval(density: number): number {
  return Math.max(2, Math.round(7 - density * 6));
}

export function patternPixel(
  pattern: PatternId,
  x: number,
  y: number,
  density: number,
  ink: number,
  base: number,
  seed: number,
): number {
  const every = interval(density);
  let useInk = false;

  switch (pattern) {
    case "dots":
      useInk = x % every === 0 && y % every === 0;
      break;
    case "horizontal":
      useInk = y % every === 0;
      break;
    case "vertical":
      useInk = x % every === 0;
      break;
    case "crosses": {
      const cx = x % (every + 2);
      const cy = y % (every + 2);
      useInk = (cx === 1 && cy <= 2) || (cy === 1 && cx <= 2);
      break;
    }
    case "checker": {
      const cell = Math.max(1, Math.round((1 - density) * 3) + 1);
      useInk = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      break;
    }
    case "sparse-noise":
      useInk = hash(x, y, seed) < density * 0.48;
      break;
    case "dense-noise":
      useInk = hash(x, y, seed) < 0.35 + density * 0.62;
      break;
    case "alternating":
      useInk = (x + y) % 2 === 0;
      break;
    case "dither": {
      const threshold = BAYER_4[(y % 4) * 4 + (x % 4)] / 16;
      useInk = density > threshold;
      break;
    }
  }

  return useInk ? ink : base === TRANSPARENT ? TRANSPARENT : base;
}
