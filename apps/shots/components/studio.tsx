"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { Stage } from "@/components/stage";
import { Button } from "@design-tools/ui/button";
import { Field } from "@design-tools/ui/field";
import { Section } from "@design-tools/ui/section";
import { Segmented, type Option } from "@design-tools/ui/segmented";
import {
  DEFAULT_COMPOSITION,
  artworkOf,
  guessDensity,
  layout,
  sanitizeComposition,
  type BackgroundId,
  type Composition,
  type CornerId,
  type EdgeId,
  type FrameId,
  type InsetId,
  type RatioId,
  type ShadowId,
  type SizeId,
} from "@/lib/composition";
import { cn } from "@design-tools/ui/cn";

const BACKGROUNDS: readonly Option<BackgroundId>[] = [
  { value: "white", label: "White", swatch: "#ffffff" },
  { value: "grey", label: "Grey", swatch: "#f1f2f4" },
  { value: "charcoal", label: "Charcoal", swatch: "#161616" },
  { value: "black", label: "Black", swatch: "#000000" },
];

const EDGES: readonly Option<EdgeId>[] = [
  { value: "none", label: "None" },
  { value: "hairline", label: "Hairline" },
];

const INSETS: readonly Option<InsetId>[] = [
  { value: "tight", label: "Tight" },
  { value: "even", label: "Even" },
  { value: "wide", label: "Wide" },
];

const SIZE_OPTIONS: readonly Option<SizeId>[] = [
  { value: "full", label: "Full" },
  { value: "medium", label: "Medium" },
  { value: "small", label: "Small" },
];

const CORNERS: readonly Option<CornerId>[] = [
  { value: "none", label: "None" },
  { value: "subtle", label: "Subtle" },
  { value: "round", label: "Round" },
];

const SHADOWS: readonly Option<ShadowId>[] = [
  { value: "none", label: "None" },
  { value: "soft", label: "Soft" },
  { value: "deep", label: "Deep" },
];

const FRAMES: readonly Option<FrameId>[] = [
  { value: "none", label: "Bare" },
  { value: "window", label: "Window" },
];

const RATIO_OPTIONS: readonly Option<RatioId>[] = [
  { value: "auto", label: "Auto" },
  { value: "16:9", label: "16:9" },
  { value: "3:2", label: "3:2" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
];

const SCALES: readonly Option<"1" | "2" | "3">[] = [
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
  { value: "3", label: "3×" },
];

/**
 * Shots are made in sets — a launch thread, a changelog. Remembering the
 * settings (never the image) means the second and third shot match the first
 * without re-picking anything.
 */
const STORAGE_KEY = "design-shots:composition";

function readStored(): Composition | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeComposition(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function Studio() {
  const [art, setArt] = useState<HTMLImageElement | null>(null);
  const [density, setDensity] = useState(1);
  const [composition, setComposition] =
    useState<Composition>(DEFAULT_COMPOSITION);
  const [dragging, setDragging] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const restored = useRef(false);

  const patch = useCallback(
    (next: Partial<Composition>) =>
      setComposition((prev) => ({ ...prev, ...next })),
    [],
  );

  // Remembered settings are applied when an image arrives, not on mount. The
  // panel is inert until then, so there is nothing to restore them into — and
  // reading storage during render would desync the prerendered markup.
  const restoreSettings = useCallback(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readStored();
    if (saved) setComposition(saved);
  }, []);

  const accept = useCallback(
    async (files: FileList) => {
      const file = Array.from(files).find((f) => f.type.startsWith("image/"));
      if (!file) {
        setError("That file is not an image.");
        return;
      }

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);

      const image = new Image();
      image.src = objectUrlRef.current;
      try {
        await image.decode();
      } catch {
        setError("That image could not be read.");
        return;
      }

      restoreSettings();
      setError(null);
      setDensity(guessDensity(image));
      setArt(image);
    },
    [restoreSettings],
  );

  const loadExample = useCallback(async () => {
    const image = new Image();
    image.src = "/example.webp";
    try {
      await image.decode();
    } catch {
      setError("The example could not be loaded.");
      return;
    }

    restoreSettings();
    setError(null);
    setDensity(guessDensity(image));
    setArt(image);
    patch({ label: "bridger.to" });
  }, [restoreSettings, patch]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(composition));
    } catch {
      // Private browsing or a full quota. Losing the preference is survivable.
    }
  }, [composition]);

  // Paste a screenshot straight onto the stage.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;

      event.preventDefault();
      const list = new DataTransfer();
      list.items.add(file);
      void accept(list.files);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const toBlob = () =>
    new Promise<Blob | null>((resolve) =>
      canvasRef.current
        ? canvasRef.current.toBlob(resolve, "image/png")
        : resolve(null),
    );

  const save = useCallback(async () => {
    const blob = await toBlob();
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${slug(composition.label)}.png`;
    anchor.click();
    URL.revokeObjectURL(href);
  }, [composition.label]);

  const copy = useCallback(async () => {
    const blob = await toBlob();
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("This browser will not allow copying images.");
    }
  }, []);

  // ⌘C and ⌘S. Both defer to the browser when the user is typing or has text
  // selected — hijacking copy out from under a selection would be hostile.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!art || !(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key !== "c" && key !== "s") return;

      const typing = ["INPUT", "TEXTAREA"].includes(
        document.activeElement?.tagName ?? "",
      );
      if (typing) return;
      if (key === "c" && window.getSelection()?.toString()) return;

      event.preventDefault();
      void (key === "c" ? copy() : save());
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [art, copy, save]);

  const measured = art ? layout(artworkOf(art, density), composition) : null;

  const clear = () => {
    setArt(null);
    setComposition(DEFAULT_COMPOSITION);
    setError(null);
  };

  // Written once, rendered into the sidebar on desktop and the sheet on the
  // phone. Two containers, one set of controls.
  const controls = (
    <>
      <Section title="Source">
            <Button className="w-full" onClick={() => fileRef.current?.click()}>
              Upload an image
            </Button>
            <p className="text-xs text-muted-foreground">
              <span className="hidden md:inline">
                Or drop one on the stage, or paste from the clipboard.
              </span>
              <span className="md:hidden">Or paste one from the clipboard.</span>
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </Section>

          {/* `inert` blocks focus and pointer in one attribute, and unlike
              aria-hidden it does not leave tabbable controls inside a subtree
              screen readers are told does not exist. */}
          <div
            className={cn("space-y-7 transition-opacity", !art && "opacity-40")}
            inert={!art}
          >
            <Section title="Background">
              <Segmented
                label="Background"
                value={composition.background}
                options={BACKGROUNDS}
                columns={2}
                onChange={(background) => patch({ background })}
              />
            </Section>

            <Section title="Composition">
              <Field label="Inset">
                <Segmented
                  label="Inset"
                  value={composition.inset}
                  options={INSETS}
                  onChange={(inset) => patch({ inset })}
                />
              </Field>
              <Field label="Size">
                <Segmented
                  label="Size"
                  value={composition.size}
                  options={SIZE_OPTIONS}
                  onChange={(size) => patch({ size })}
                />
              </Field>
              <Field label="Corner">
                <Segmented
                  label="Corner"
                  value={composition.corner}
                  options={CORNERS}
                  onChange={(corner) => patch({ corner })}
                />
              </Field>
              <Field label="Edge">
                <Segmented
                  label="Edge"
                  value={composition.edge}
                  options={EDGES}
                  onChange={(edge) => patch({ edge })}
                />
              </Field>
              <Field label="Shadow">
                <Segmented
                  label="Shadow"
                  value={composition.shadow}
                  options={SHADOWS}
                  onChange={(shadow) => patch({ shadow })}
                />
              </Field>
              <Field label="Frame">
                <Segmented
                  label="Frame"
                  value={composition.frame}
                  options={FRAMES}
                  onChange={(frame) => patch({ frame })}
                />
              </Field>
              {composition.frame === "window" && (
                <input
                  value={composition.label}
                  onChange={(event) => patch({ label: event.target.value })}
                  placeholder="acme.com"
                  aria-label="Window caption"
                  spellCheck={false}
                  className={cn(
                    "h-9 w-full rounded-md border border-input bg-transparent px-3",
                    "text-sm placeholder:text-muted-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                />
              )}
              <Field label="Format">
                <Segmented
                  label="Format"
                  value={composition.ratio}
                  options={RATIO_OPTIONS}
                  columns={3}
                  onChange={(ratio) => patch({ ratio })}
                />
              </Field>
            </Section>
          </div>
    </>
  );

  const exportActions = (
    <>
      <div className="flex items-center justify-between">
            <Segmented
              label="Resolution"
              compact
              value={String(composition.scale) as "1" | "2" | "3"}
              options={SCALES}
              onChange={(scale) =>
                patch({ scale: Number(scale) as Composition["scale"] })
              }
            />
            <span className="tabular ml-3 text-right text-xs text-muted-foreground">
              {measured
                ? `${measured.pixelWidth} × ${measured.pixelHeight}`
                : "—"}
            </span>
          </div>
          {/* Copy leads: a shot bound for a post or a thread goes straight to
              the clipboard and never touches the filesystem. */}
          <div className="space-y-2">
            <Button
              variant="default"
              className="w-full justify-between"
              onClick={copy}
              disabled={!art}
            >
              <span className="flex items-center gap-2">
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied" : "Copy image"}
              </span>
              <Shortcut>⌘C</Shortcut>
            </Button>
            <Button
              className="w-full justify-between"
              onClick={save}
              disabled={!art}
            >
              <span className="flex items-center gap-2">
                <Download className="size-4" />
                Save PNG
              </span>
              <Shortcut>⌘S</Shortcut>
            </Button>
          </div>
    </>
  );

  return (
    <main className="flex h-dvh flex-col md:flex-row">
      {/* On the phone the wordmark and Clear get their own slim bar, because
          the sidebar that used to hold them is now a sheet. */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 md:hidden">
        <span className="text-sm font-medium tracking-tight">Design Shots</span>
        {art && (
          <Button variant="ghost" className="-mr-2 h-11 text-xs" onClick={clear}>
            Clear
          </Button>
        )}
      </header>

      <Stage
        art={art}
        density={density}
        composition={composition}
        canvasRef={canvasRef}
        dragging={dragging}
        onFiles={accept}
        onDraggingChange={setDragging}
        onPick={() => fileRef.current?.click()}
        onExample={loadExample}
      />

      {/* The phone's two verbs. Everything else is one tap away in the sheet. */}
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <Button className="flex-1" onClick={() => setSheetOpen(true)}>
          <SlidersHorizontal className="size-4" />
          Adjust
        </Button>
        <Button
          variant="default"
          className="flex-1"
          onClick={copy}
          disabled={!art}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <aside className="hidden shrink-0 flex-col border-border md:flex md:w-[300px] md:border-l">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
          <span className="text-sm font-medium tracking-tight">
            Design Shots
          </span>
          {art && (
            <Button variant="ghost" className="-mr-3 h-8 text-xs" onClick={clear}>
              Clear
            </Button>
          )}
        </header>
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6">
          {controls}
        </div>
        <div className="shrink-0 space-y-3 border-t border-border px-5 py-4">
          {exportActions}
        </div>
      </aside>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Adjust"
        footer={exportActions}
      >
        {controls}
      </Sheet>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void accept(event.target.files);
          event.target.value = "";
        }}
      />
    </main>
  );
}

function Shortcut({ children }: { children: string }) {
  // Hidden on touch: there is no keyboard to press it with.
  return (
    <span className="hidden font-mono text-[10px] tracking-wider opacity-50 md:inline">
      {children}
    </span>
  );
}

function slug(label: string): string {
  const base = label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return base ? `shot-${base.toLowerCase()}` : "shot";
}
