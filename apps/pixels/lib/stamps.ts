import type { StampId } from "./types";

export interface Stamp {
  id: StampId;
  name: string;
  rows: readonly string[];
}

export const STAMPS: readonly Stamp[] = [
  {
    id: "pine",
    name: "Pine",
    rows: ["....1....", "...111...", "..11111..", "...111...", ".1111111.", "...111...", "111111111", "....1....", "....1...."],
  },
  {
    id: "bush",
    name: "Bush",
    rows: ["..1111...", ".111111..", "11111111.", ".111111..", "..1111..."],
  },
  {
    id: "flower",
    name: "Flower",
    rows: [".1.1.", "11111", ".111.", "11111", ".1.1.", "..1..", "..1.."],
  },
  {
    id: "window",
    name: "Window",
    rows: ["1111111", "1221221", "1221221", "1111111", "1221221", "1221221", "1111111"],
  },
  {
    id: "door",
    name: "Door",
    rows: ["1111111", "1222221", "1222221", "1222221", "1222121", "1222221", "1111111"],
  },
  {
    id: "pillar",
    name: "Pillar",
    rows: ["1111111", ".11111.", "..121..", "..121..", "..121..", "..121..", ".11111.", "1111111"],
  },
  {
    id: "rooftop",
    name: "Rooftop",
    rows: ["....1....", "...111...", "..11111..", ".1111111.", "111111111"],
  },
  {
    id: "rock",
    name: "Rock",
    rows: ["...11...", ".111111.", "11121111", "12222221", ".111111."],
  },
  {
    id: "wave",
    name: "Wave",
    rows: ["..11.....", ".1..1..11", "1....11..", ".........", ".11...11."],
  },
  {
    id: "star",
    name: "Star",
    rows: ["..1..", "..1..", "11111", ".111.", ".1.1."],
  },
] as const;

export function stampById(id: StampId): Stamp {
  const stamp = STAMPS.find((candidate) => candidate.id === id);
  if (!stamp) throw new Error(`Unknown stamp: ${id}`);
  return stamp;
}
