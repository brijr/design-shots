"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  BoxSelect,
  Check,
  Clipboard,
  Copy,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Grid3X3,
  Hand,
  Layers3,
  Minus,
  MousePointer2,
  Palette,
  Pencil,
  Plus,
  Redo2,
  Save,
  Slash,
  Sparkles,
  Square,
  Stamp,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { Button } from "@design-tools/ui/button";
import { cn } from "@design-tools/ui/cn";
import { Field } from "@design-tools/ui/field";
import { Section } from "@design-tools/ui/section";
import { Segmented, type Option } from "@design-tools/ui/segmented";
import { EditorCanvas, type CanvasTool } from "./editor-canvas";
import { PixelEditor, exportCanvas } from "@/lib/editor";
import { createBlankDocument, createStarterDocument } from "@/lib/examples";
import {
  clearAutosave,
  loadAutosave,
  parseProject,
  saveAutosave,
  serializeProject,
} from "@/lib/project";
import { STAMPS } from "@/lib/stamps";
import {
  MAX_COLORS,
  MAX_LAYERS,
  TRANSPARENT,
  type PatternId,
  type PatternTarget,
  type PixelDocument,
  type StampId,
} from "@/lib/types";

type Panel = "pattern" | "stamps" | "palette" | "layers";
type ExportScale = 1 | 2 | 4;

const PATTERNS: readonly { id: PatternId; name: string; glyph: string }[] = [
  { id: "dots", name: "Dots", glyph: "· · ·" },
  { id: "horizontal", name: "Lines H", glyph: "≡" },
  { id: "vertical", name: "Lines V", glyph: "|||" },
  { id: "crosses", name: "Crosses", glyph: "+ +" },
  { id: "checker", name: "Checker", glyph: "▦" },
  { id: "sparse-noise", name: "Sparse", glyph: "·  ." },
  { id: "dense-noise", name: "Dense", glyph: "⁙" },
  { id: "alternating", name: "Alternate", glyph: "⌗" },
  { id: "dither", name: "Dither", glyph: "░" },
] as const;

const DENSITIES: readonly Option<"20" | "35" | "50" | "70" | "85">[] = [
  { value: "20", label: "Sparse" },
  { value: "35", label: "Light" },
  { value: "50", label: "Even" },
  { value: "70", label: "Dense" },
  { value: "85", label: "Packed" },
];

const RANDOMNESS: readonly Option<"0" | "20" | "40" | "70">[] = [
  { value: "0", label: "Ordered" },
  { value: "20", label: "Slight" },
  { value: "40", label: "Loose" },
  { value: "70", label: "Wild" },
];

const BRUSH_SIZES: readonly Option<"1" | "2" | "4">[] = [
  { value: "1", label: "1 px" },
  { value: "2", label: "2 px" },
  { value: "4", label: "4 px" },
];

const TARGETS: readonly Option<PatternTarget>[] = [
  { value: "artwork", label: "Artwork" },
  { value: "selection", label: "Selection" },
];

const EXPORT_SCALES: readonly Option<"1" | "2" | "4">[] = [
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "4", label: "4×" },
];

const TOOLS: readonly {
  id: CanvasTool;
  name: string;
  key: string;
  icon: typeof Pencil;
}[] = [
  { id: "pencil", name: "Pencil", key: "P", icon: Pencil },
  { id: "eraser", name: "Eraser", key: "E", icon: Eraser },
  { id: "line", name: "Line", key: "L", icon: Slash },
  { id: "rectangle", name: "Rectangle", key: "R", icon: Square },
  { id: "select", name: "Select", key: "S", icon: BoxSelect },
  { id: "move", name: "Move selection", key: "M", icon: MousePointer2 },
  { id: "pan", name: "Pan", key: "H", icon: Hand },
] as const;

interface SavedPalette {
  name: string;
  colors: string[];
}

const PALETTES_KEY = "design-pixels:palettes:v1";

function usePhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
}

function readPalettes(): SavedPalette[] {
  try {
    const value = JSON.parse(localStorage.getItem(PALETTES_KEY) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter(
      (palette): palette is SavedPalette =>
        Boolean(
          palette &&
            typeof palette === "object" &&
            "name" in palette &&
            typeof palette.name === "string" &&
            "colors" in palette &&
            Array.isArray(palette.colors) &&
            palette.colors.length >= 2 &&
            palette.colors.length <= MAX_COLORS &&
            palette.colors.every(
              (color: unknown) =>
                typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color),
            ),
        ),
    );
  } catch {
    return [];
  }
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pixels";
}

function IconButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-10 place-items-center rounded-md text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-30",
        active && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function PixelStudio() {
  const [editor, setEditor] = useState<PixelEditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [resumeDocument, setResumeDocument] = useState<PixelDocument | null>(null);
  const [tool, setTool] = useState<CanvasTool>("pencil");
  const [panel, setPanel] = useState<Panel>("pattern");
  const [brushSize, setBrushSize] = useState<1 | 2 | 4>(1);
  const [ink, setInk] = useState(2);
  const [base, setBase] = useState<number>(1);
  const [activeWell, setActiveWell] = useState<"ink" | "base">("ink");
  const [pattern, setPattern] = useState<PatternId>("dots");
  const [target, setTarget] = useState<PatternTarget>("artwork");
  const [density, setDensity] = useState<"20" | "35" | "50" | "70" | "85">("70");
  const [stamp, setStamp] = useState<StampId>("pine");
  const [randomness, setRandomness] = useState<"0" | "20" | "40" | "70">("20");
  const [grid, setGrid] = useState(true);
  const [exportScale, setExportScale] = useState<ExportScale>(4);
  const coordinates = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paletteName, setPaletteName] = useState("Coast");
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
  const projectInput = useRef<HTMLInputElement>(null);
  const phone = usePhone();

  const revision = useSyncExternalStore(
    editor?.subscribe ?? (() => () => undefined),
    editor?.getRevision ?? (() => 0),
    () => 0,
  );
  const document = editor?.getDocument() ?? null;
  const selection = editor?.getSelection() ?? null;

  useEffect(() => {
    Promise.resolve().then(() => setSavedPalettes(readPalettes()));
    loadAutosave()
      .then((saved) => {
        if (saved) setEditor(new PixelEditor(saved));
      })
      .catch(() => setError("The recovered project could not be opened."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!editor) return;
    const timer = window.setTimeout(() => {
      saveAutosave(editor.getDocument()).catch(() => {
        setError("Local recovery is unavailable in this browser.");
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [editor, revision]);

  useEffect(() => {
    if (!editor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA"].includes(
        window.document.activeElement?.tagName ?? "",
      );
      if (typing) return;
      const command = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (command) {
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) editor.redo();
          else editor.undo();
        } else if (key === "c") {
          event.preventDefault();
          editor.copySelection();
        } else if (key === "x") {
          event.preventDefault();
          editor.cutSelection();
        } else if (key === "v") {
          event.preventDefault();
          editor.paste();
        } else if (key === "s") {
          event.preventDefault();
          download(
            new Blob([serializeProject(editor.getDocument())], {
              type: "application/json",
            }),
            `${slug(editor.getDocument().name)}.pixels`,
          );
        }
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        editor.perform({ type: "clear-selection" });
      } else if (event.key === "Escape") editor.setSelection(null);
      else {
        const next = TOOLS.find((candidate) => candidate.key.toLowerCase() === key);
        if (next) setTool(next.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor]);

  const begin = async (kind: "blank" | "starter" | "resume") => {
    const next =
      kind === "blank"
        ? createBlankDocument()
        : kind === "starter"
          ? createStarterDocument()
          : resumeDocument;
    if (!next) return;
    if (kind !== "resume") await clearAutosave().catch(() => undefined);
    setEditor(new PixelEditor(next));
    setResumeDocument(null);
    setError(null);
  };

  const chooseNew = () => {
    if (!editor) return;
    setResumeDocument(editor.getDocument());
    setEditor(null);
  };

  const saveProject = () => {
    if (!editor) return;
    download(
      new Blob([serializeProject(editor.getDocument())], { type: "application/json" }),
      `${slug(editor.getDocument().name)}.pixels`,
    );
  };

  const openProject = async (file: File) => {
    try {
      const next = parseProject(await file.text());
      setEditor(new PixelEditor(next));
      setResumeDocument(null);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That project could not be opened.");
    }
  };

  const makePng = (): HTMLCanvasElement | null =>
    editor ? exportCanvas(editor.getDocument(), exportScale) : null;

  const savePng = () => {
    const canvas = makePng();
    if (!canvas || !editor) return;
    canvas.toBlob((blob) => {
      if (blob) download(blob, `${slug(editor.getDocument().name)}-${exportScale}x.png`);
    }, "image/png");
  };

  const copyPng = () => {
    const canvas = makePng();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      } catch {
        setError("This browser will not allow copying images.");
      }
    }, "image/png");
  };

  const savePalette = () => {
    if (!document || !paletteName.trim()) return;
    const next = [
      ...savedPalettes.filter((candidate) => candidate.name !== paletteName.trim()),
      { name: paletteName.trim(), colors: [...document.palette] },
    ];
    setSavedPalettes(next);
    localStorage.setItem(PALETTES_KEY, JSON.stringify(next));
  };

  if (loading) {
    return <main className="grid h-dvh place-items-center bg-stage text-sm text-muted-foreground">Opening Design Pixels…</main>;
  }

  if (!editor || !document) {
    return (
      <main className="grid h-dvh place-items-center bg-stage p-6">
        <div className="w-full max-w-2xl rounded-lg border border-border bg-background shadow-xl">
          <header className="border-b border-border px-6 py-5">
            <p className="text-base font-medium tracking-tight">Design Pixels</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Block shapes, texture them, then decorate with tiny motifs.
            </p>
          </header>
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            {resumeDocument && (
              <button
                type="button"
                onClick={() => void begin("resume")}
                className="rounded-md border border-border p-5 text-left hover:bg-muted sm:col-span-2"
              >
                <span className="block text-sm font-medium">Continue {resumeDocument.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">Return without replacing the recovered project.</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void begin("blank")}
              className="rounded-md border border-border p-5 text-left hover:bg-muted"
            >
              <span className="block text-sm font-medium">Blank canvas</span>
              <span className="mt-1 block text-xs text-muted-foreground">256 × 256 · one empty layer</span>
            </button>
            <button
              type="button"
              onClick={() => void begin("starter")}
              className="overflow-hidden rounded-md border border-border text-left hover:bg-muted"
            >
              <span className="block bg-[#090b12] px-5 py-4 font-mono text-xs tracking-[0.24em] text-[#8bd06a]">· + · ▲ + ·</span>
              <span className="block px-5 pt-4 text-sm font-medium">Quiet coast starter</span>
              <span className="block px-5 pb-5 pt-1 text-xs text-muted-foreground">Seven editable layers with patterns and motifs.</span>
            </button>
            {resumeDocument ? (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Starting a new canvas replaces local recovery. Download the current project first if you want to keep both.
              </p>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  const footer = (
    <div className="space-y-3">
      <Field label="Export size">
        <Segmented
          label="Export size"
          value={String(exportScale) as "1" | "2" | "4"}
          options={EXPORT_SCALES}
          onChange={(value) => setExportScale(Number(value) as ExportScale)}
        />
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button variant="default" onClick={savePng}>
          <Download className="size-4" /> Export PNG
        </Button>
        <Button aria-label="Copy PNG" onClick={copyPng}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );

  return (
    <main className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-4">
        <span className="mr-2 hidden text-sm font-medium tracking-tight sm:inline">Design Pixels</span>
        <input
          value={document.name}
          aria-label="Project name"
          onChange={(event) => editor.setName(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none sm:max-w-56"
        />
        <div className="hidden items-center gap-1 sm:flex">
          <IconButton label="Undo" disabled={!editor.canUndo()} onClick={() => editor.undo()}><Undo2 className="size-4" /></IconButton>
          <IconButton label="Redo" disabled={!editor.canRedo()} onClick={() => editor.redo()}><Redo2 className="size-4" /></IconButton>
          <IconButton label="Toggle pixel grid" active={grid} onClick={() => setGrid((value) => !value)}><Grid3X3 className="size-4" /></IconButton>
        </div>
        <span ref={coordinates} className="tabular hidden w-20 font-mono text-[10px] text-muted-foreground lg:block">
          256 × 256
        </span>
        <Button variant="ghost" className="hidden sm:inline-flex" onClick={chooseNew}>New</Button>
        <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => projectInput.current?.click()}><Upload className="size-4" /> Open</Button>
        <Button variant="ghost" className="hidden sm:inline-flex" onClick={saveProject}><Save className="size-4" /> Project</Button>
        <Button aria-label="Open project" className="sm:hidden" onClick={() => projectInput.current?.click()}><Upload className="size-4" /></Button>
        <Button className="sm:hidden" onClick={savePng}><Download className="size-4" /> Export</Button>
        <input
          ref={projectInput}
          type="file"
          accept=".pixels,application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void openProject(file);
            event.target.value = "";
          }}
        />
      </header>

      {error && (
        <div role="alert" className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-3 underline">Dismiss</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border py-3 sm:flex">
          {TOOLS.map((candidate) => {
            const Icon = candidate.icon;
            return (
              <IconButton
                key={candidate.id}
                label={`${candidate.name} (${candidate.key})`}
                active={tool === candidate.id}
                onClick={() => setTool(candidate.id)}
              >
                <Icon className="size-4" />
              </IconButton>
            );
          })}
          <div className="my-1 h-px w-7 bg-border" />
          <IconButton label="Stamp tool" active={tool === "stamp"} onClick={() => { setTool("stamp"); setPanel("stamps"); }}><Stamp className="size-4" /></IconButton>
          <div className="mt-auto grid gap-1">
            <button
              type="button"
              aria-label="Active ink color"
              onClick={() => setActiveWell("ink")}
              className={cn("size-7 rounded-sm border-2", activeWell === "ink" ? "border-foreground" : "border-border")}
              style={{ background: document.palette[ink] }}
            />
            <button
              type="button"
              aria-label="Active base color"
              onClick={() => setActiveWell("base")}
              className={cn("size-7 rounded-sm border-2", activeWell === "base" ? "border-foreground" : "border-border")}
              style={{ background: base === TRANSPARENT ? "conic-gradient(#bbb 25%,#fff 0 50%,#bbb 0 75%,#fff 0) 0/8px 8px" : document.palette[base] }}
            />
          </div>
        </nav>

        <EditorCanvas
          editor={editor}
          revision={revision}
          tool={tool}
          color={ink}
          base={base}
          brushSize={brushSize}
          stamp={stamp}
          grid={grid}
          readOnly={phone}
          onCoordinates={(point) => {
            if (coordinates.current) {
              coordinates.current.textContent = point ? `${point.x}, ${point.y}` : "256 × 256";
            }
          }}
        />

        <aside className="hidden w-[300px] shrink-0 flex-col border-l border-border md:flex">
          <div className="grid grid-cols-4 border-b border-border p-1">
            {([
              ["pattern", Sparkles, "Pattern"],
              ["stamps", Stamp, "Stamps"],
              ["palette", Palette, "Palette"],
              ["layers", Layers3, "Layers"],
            ] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                onClick={() => setPanel(id)}
                className={cn("grid h-10 place-items-center rounded-sm text-muted-foreground hover:text-foreground", panel === id && "bg-accent text-foreground")}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {panel === "pattern" && (
              <div className="space-y-7">
                <Section title="Draw">
                  <Field label="Brush size">
                    <Segmented label="Brush size" value={String(brushSize) as "1" | "2" | "4"} options={BRUSH_SIZES} onChange={(value) => setBrushSize(Number(value) as 1 | 2 | 4)} />
                  </Field>
                </Section>
                <Section title="Pattern">
                  <div className="grid grid-cols-3 overflow-hidden rounded-md border border-border">
                    {PATTERNS.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPattern(item.id)}
                        className={cn(
                          "flex h-16 flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground",
                          index % 3 !== 0 && "border-l border-border",
                          index >= 3 && "border-t border-border",
                          pattern === item.id && "bg-accent text-foreground",
                        )}
                      >
                        <span className="font-mono text-base">{item.glyph}</span>{item.name}
                      </button>
                    ))}
                  </div>
                  <Field label="Target"><Segmented label="Pattern target" value={target} options={TARGETS} onChange={setTarget} /></Field>
                  <Field label="Density"><Segmented label="Pattern density" value={density} options={DENSITIES} columns={2} onChange={setDensity} /></Field>
                  <Button
                    variant="default"
                    className="w-full"
                    disabled={target === "selection" && !selection}
                    onClick={() => editor.perform({ type: "pattern", pattern, target, density: Number(density) / 100, ink, base, seed: 41 })}
                  >
                    Apply pattern
                  </Button>
                  {target === "selection" && !selection && <p className="text-xs text-muted-foreground">Make a selection before filling it.</p>}
                </Section>
              </div>
            )}

            {panel === "stamps" && (
              <div className="space-y-7">
                <Section title="Motif">
                  <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border">
                    {STAMPS.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setStamp(item.id); setTool("stamp"); }}
                        className={cn(
                          "flex h-20 items-center gap-3 px-3 text-left text-xs text-muted-foreground",
                          index % 2 !== 0 && "border-l border-border",
                          index >= 2 && "border-t border-border",
                          stamp === item.id && "bg-accent text-foreground",
                        )}
                      >
                        <span className="whitespace-pre font-mono text-[6px] leading-[6px]">{item.rows.join("\n").replaceAll("1", "█").replaceAll("2", "▓").replaceAll(".", " ")}</span>
                        {item.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Choose a motif, then click the canvas to place it.</p>
                </Section>
                <Section title="Scatter">
                  <Field label="Density"><Segmented label="Scatter density" value={density} options={DENSITIES} columns={2} onChange={setDensity} /></Field>
                  <Field label="Randomness"><Segmented label="Scatter randomness" value={randomness} options={RANDOMNESS} columns={2} onChange={setRandomness} /></Field>
                  <Button
                    variant="default"
                    className="w-full"
                    disabled={!selection}
                    onClick={() => editor.perform({ type: "scatter", stamp, density: Number(density) / 100, randomness: Number(randomness) / 100, ink, base, seed: Date.now() })}
                  >
                    Scatter in selection
                  </Button>
                  {!selection && <p className="text-xs text-muted-foreground">Select an area to scatter motifs through it.</p>}
                </Section>
              </div>
            )}

            {panel === "palette" && (
              <div className="space-y-7">
                <Section title="Active colors">
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setActiveWell("ink")} className={cn("rounded-md border p-3 text-left", activeWell === "ink" ? "border-foreground" : "border-border")}>
                      <span className="block h-7 rounded-sm" style={{ background: document.palette[ink] }} />
                      <span className="mt-2 block text-xs">Ink</span>
                    </button>
                    <button type="button" onClick={() => setActiveWell("base")} className={cn("rounded-md border p-3 text-left", activeWell === "base" ? "border-foreground" : "border-border")}>
                      <span className="block h-7 rounded-sm" style={{ background: base === TRANSPARENT ? "conic-gradient(#bbb 25%,#fff 0 50%,#bbb 0 75%,#fff 0) 0/8px 8px" : document.palette[base] }} />
                      <span className="mt-2 block text-xs">Base</span>
                    </button>
                  </div>
                  <Button className="w-full" onClick={() => setBase(TRANSPARENT)}>Transparent base</Button>
                </Section>
                <Section title={`Palette · ${document.palette.length}/${MAX_COLORS}`}>
                  <div className="grid grid-cols-4 gap-2">
                    {document.palette.map((color, index) => (
                      <div key={`${index}-${color}`} className="relative">
                        <button
                          type="button"
                          aria-label={`Use color ${index + 1} as ${activeWell}`}
                          onClick={() => activeWell === "ink" ? setInk(index) : setBase(index)}
                          className={cn("block aspect-square w-full rounded-md border-2", (ink === index || base === index) ? "border-foreground" : "border-border")}
                          style={{ background: color }}
                        />
                        <input
                          type="color"
                          aria-label={`Change color ${index + 1}`}
                          value={color}
                          onChange={(event) => editor.perform({ type: "set-palette-color", index, color: event.target.value })}
                          className="absolute bottom-1 right-1 size-4 cursor-pointer rounded-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button disabled={document.palette.length >= MAX_COLORS} onClick={() => editor.perform({ type: "add-palette-color", color: "#ffffff" })}><Plus className="size-4" /> Add</Button>
                    <Button disabled={document.palette.length <= 2} onClick={() => { editor.perform({ type: "remove-palette-color", index: document.palette.length - 1 }); setInk((value) => Math.min(value, document.palette.length - 2)); if (base !== TRANSPARENT) setBase((value) => Math.min(value, document.palette.length - 2)); }}><Minus className="size-4" /> Remove last</Button>
                  </div>
                </Section>
                <Section title="Saved palettes">
                  <input value={paletteName} onChange={(event) => setPaletteName(event.target.value)} placeholder="Palette name" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  <Button className="w-full" onClick={savePalette}><Save className="size-4" /> Save current palette</Button>
                  {savedPalettes.map((saved) => (
                    <button key={saved.name} type="button" onClick={() => editor.perform({ type: "replace-palette", colors: saved.colors.slice(0, MAX_COLORS) })} className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-xs hover:bg-muted">
                      <span>{saved.name}</span>
                      <span className="flex">{saved.colors.slice(0, 6).map((color, index) => <span key={`${color}-${index}`} className="size-3 rounded-full border border-background" style={{ background: color }} />)}</span>
                    </button>
                  ))}
                </Section>
              </div>
            )}

            {panel === "layers" && (
              <div className="space-y-7">
                <Section title={`Layers · ${document.layers.length}/${MAX_LAYERS}`}>
                  <div className="space-y-1">
                    {[...document.layers].reverse().map((layer) => (
                      <div key={layer.id} className={cn("group flex items-center gap-1 rounded-md border px-1 py-1", document.activeLayerId === layer.id ? "border-foreground bg-accent" : "border-border")}>
                        <IconButton label={layer.visible ? "Hide layer" : "Show layer"} onClick={() => editor.perform({ type: "toggle-layer", id: layer.id })}>{layer.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</IconButton>
                        <input value={layer.name} onFocus={() => editor.setActiveLayer(layer.id)} onChange={(event) => editor.perform({ type: "rename-layer", id: layer.id, name: event.target.value })} className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
                        <button type="button" aria-label="Select layer" onClick={() => editor.setActiveLayer(layer.id)} className="absolute size-0 overflow-hidden">Select</button>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" disabled={document.layers.length >= MAX_LAYERS} onClick={() => editor.perform({ type: "add-layer" })}><Plus className="size-4" /> New layer</Button>
                </Section>
                <Section title="Active layer">
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => editor.perform({ type: "move-layer", id: document.activeLayerId, direction: 1 })}><ArrowUp className="size-4" /> Raise</Button>
                    <Button onClick={() => editor.perform({ type: "move-layer", id: document.activeLayerId, direction: -1 })}><ArrowDown className="size-4" /> Lower</Button>
                    <Button onClick={() => editor.perform({ type: "duplicate-layer", id: document.activeLayerId })}><Clipboard className="size-4" /> Duplicate</Button>
                    <Button onClick={() => editor.perform({ type: "merge-down", id: document.activeLayerId })}><Layers3 className="size-4" /> Merge</Button>
                  </div>
                  <Button className="w-full text-destructive" disabled={document.layers.length <= 1} onClick={() => editor.perform({ type: "delete-layer", id: document.activeLayerId })}><Trash2 className="size-4" /> Delete layer</Button>
                </Section>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border px-5 py-4">{footer}</div>
        </aside>
      </div>
    </main>
  );
}
