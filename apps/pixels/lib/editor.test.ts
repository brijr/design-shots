import { describe, expect, it } from "vitest";
import { PixelEditor, composite } from "./editor";
import { createBlankDocument } from "./examples";
import { parseProject, serializeProject } from "./project";
import { CANVAS_SIZE, TRANSPARENT } from "./types";

function pixel(editor: PixelEditor, x: number, y: number): number {
  return editor.getDocument().layers[0].pixels[y * CANVAS_SIZE + x];
}

describe("PixelEditor", () => {
  it("groups a stroke into one undoable command", () => {
    const editor = new PixelEditor(createBlankDocument());
    editor.perform({
      type: "draw-stroke",
      points: [
        { x: 2, y: 2 },
        { x: 5, y: 2 },
      ],
      color: 2,
      size: 1,
    });

    expect([2, 3, 4, 5].map((x) => pixel(editor, x, 2))).toEqual([2, 2, 2, 2]);
    editor.undo();
    expect([2, 3, 4, 5].map((x) => pixel(editor, x, 2))).toEqual([
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
      TRANSPARENT,
    ]);
    editor.redo();
    expect(pixel(editor, 5, 2)).toBe(2);
  });

  it("rejects colors outside the indexed palette", () => {
    const editor = new PixelEditor(createBlankDocument());
    editor.perform({
      type: "draw-stroke",
      points: [{ x: 8, y: 8 }],
      color: 18,
      size: 1,
    });
    expect(pixel(editor, 8, 8)).toBe(TRANSPARENT);
    expect(editor.canUndo()).toBe(false);
  });

  it("textures artwork without filling transparent pixels", () => {
    const editor = new PixelEditor(createBlankDocument());
    editor.perform({
      type: "draw-stroke",
      points: [
        { x: 10, y: 10 },
        { x: 12, y: 10 },
      ],
      color: 1,
      size: 1,
    });
    editor.setSelection({ x: 9, y: 9, width: 5, height: 3 });
    editor.perform({
      type: "pattern",
      pattern: "alternating",
      target: "artwork",
      density: 0.5,
      ink: 2,
      base: 3,
      seed: 1,
    });

    expect(pixel(editor, 9, 9)).toBe(TRANSPARENT);
    expect([10, 11, 12].map((x) => pixel(editor, x, 10))).toEqual([2, 3, 2]);
  });

  it("fills a selection and moves it with clipping", () => {
    const editor = new PixelEditor(createBlankDocument());
    editor.setSelection({ x: 254, y: 254, width: 2, height: 2 });
    editor.perform({
      type: "pattern",
      pattern: "alternating",
      target: "selection",
      density: 0.5,
      ink: 2,
      base: 3,
      seed: 1,
    });
    editor.perform({ type: "move-selection", dx: 1, dy: 1 });

    expect(pixel(editor, 254, 254)).toBe(TRANSPARENT);
    expect(pixel(editor, 255, 255)).toBe(2);
  });

  it("keeps hidden layers out of the composite", () => {
    const editor = new PixelEditor(createBlankDocument());
    editor.perform({
      type: "draw-stroke",
      points: [{ x: 0, y: 0 }],
      color: 2,
      size: 1,
    });
    const id = editor.getDocument().activeLayerId;
    editor.perform({ type: "toggle-layer", id });

    expect(composite(editor.getDocument()).slice(0, 4)).toEqual(
      new Uint8ClampedArray([0, 0, 0, 0]),
    );
  });
});

describe("project files", () => {
  it("round-trips palette and layer bytes", () => {
    const source = createBlankDocument();
    source.layers[0].pixels[42] = 3;
    const parsed = parseProject(serializeProject(source));

    expect(parsed.palette).toEqual(source.palette);
    expect(parsed.layers[0].pixels).toEqual(source.layers[0].pixels);
  });

  it("rejects an unsupported version without returning a partial document", () => {
    const raw = serializeProject(createBlankDocument()).replace(
      '"version":1',
      '"version":2',
    );
    expect(() => parseProject(raw)).toThrow("version is not supported");
  });
});
