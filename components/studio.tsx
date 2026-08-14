"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Download } from "lucide-react";
import { Stage } from "@/components/stage";
import { Button, Section, Segmented, Slider, type Option } from "@/components/ui";
import {
  DEFAULT_COMPOSITION,
  INSET_RANGE,
  RADIUS_RANGE,
  artworkOf,
  guessDensity,
  layout,
  type BackgroundId,
  type Composition,
  type FrameId,
  type RatioId,
  type ShadowId,
} from "@/lib/composition";
import { cn } from "@/lib/utils";

type ViewportId = "desktop" | "tablet" | "mobile";

const BACKGROUNDS: readonly Option<BackgroundId>[] = [
  { value: "white", label: "White", swatch: "#ffffff" },
  { value: "black", label: "Black", swatch: "#000000" },
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

const VIEWPORT_OPTIONS: readonly Option<ViewportId>[] = [
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
  { value: "mobile", label: "Mobile" },
];

const SCALES: readonly Option<"1" | "2">[] = [
  { value: "1", label: "1×" },
  { value: "2", label: "2×" },
];

export function Studio() {
  const [art, setArt] = useState<HTMLImageElement | null>(null);
  const [density, setDensity] = useState(1);
  const [composition, setComposition] =
    useState<Composition>(DEFAULT_COMPOSITION);
  const [url, setUrl] = useState("");
  const [viewport, setViewport] = useState<ViewportId>("desktop");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const patch = useCallback(
    (next: Partial<Composition>) =>
      setComposition((prev) => ({ ...prev, ...next })),
    [],
  );

  const loadImage = useCallback(async (src: string, sourceDensity?: number) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    setDensity(sourceDensity ?? guessDensity(image));
    setArt(image);
  }, []);

  const acceptFiles = useCallback(
    async (files: FileList) => {
      const file = Array.from(files).find((f) => f.type.startsWith("image/"));
      if (!file) {
        setError("That file is not an image.");
        return;
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = URL.createObjectURL(file);
      setError(null);
      await loadImage(objectUrlRef.current);
      patch({ label: "", frame: "none" });
    },
    [loadImage, patch],
  );

  const capture = useCallback(async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, viewport }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Capture failed.");
      await loadImage(data.image, 2); // captured at deviceScaleFactor 2
      // A live site reads as a product shot with its chrome on.
      patch({ label: data.label, frame: "window" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Capture failed.");
    } finally {
      setBusy(false);
    }
  }, [url, viewport, busy, loadImage, patch]);

  // Paste an image straight onto the stage, or paste a URL into the field.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const data = event.clipboardData;
      if (!data) return;

      const image = Array.from(data.items).find((item) =>
        item.type.startsWith("image/"),
      );
      if (image) {
        const file = image.getAsFile();
        if (file) {
          event.preventDefault();
          const list = new DataTransfer();
          list.items.add(file);
          void acceptFiles(list.files);
        }
        return;
      }

      const editing = document.activeElement?.tagName === "INPUT";
      const text = data.getData("text").trim();
      if (!editing && /^https?:\/\/\S+$/i.test(text)) setUrl(text);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [acceptFiles]);

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

  const save = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${slug(composition.label)}.png`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  const copy = async () => {
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
  };

  const measured = art ? layout(artworkOf(art, density), composition) : null;

  return (
    <main className="flex h-dvh flex-col md:flex-row">
      <Stage
        art={art}
        density={density}
        composition={composition}
        canvasRef={canvasRef}
        busy={busy}
        dragging={dragging}
        onFiles={acceptFiles}
        onDraggingChange={setDragging}
        onPick={() => fileRef.current?.click()}
      />

      <aside className="flex shrink-0 flex-col border-border md:w-[300px] md:border-l">
        <header className="flex h-14 shrink-0 items-center justify-between border-y border-border px-5 md:border-t-0">
          <span className="text-sm font-medium tracking-tight">
            Design Shots
          </span>
          {art && (
            <Button
              variant="ghost"
              className="-mr-3 h-8 text-xs"
              onClick={() => {
                setArt(null);
                setComposition(DEFAULT_COMPOSITION);
                setUrl("");
              }}
            >
              Clear
            </Button>
          )}
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6">
          <Section title="Source">
            <div className="flex gap-2">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && capture()}
                placeholder="example.com"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                className={cn(
                  "h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3",
                  "text-sm placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
              <Button
                onClick={capture}
                disabled={!url.trim() || busy}
                aria-label="Capture URL"
                className="w-9 px-0"
              >
                <ArrowRight className="size-4" />
              </Button>
            </div>

            <Segmented
              label="Capture width"
              value={viewport}
              options={VIEWPORT_OPTIONS}
              onChange={setViewport}
            />

            <Button
              className="w-full"
              onClick={() => fileRef.current?.click()}
            >
              Upload an image
            </Button>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </Section>

          <div
            className={cn(
              "space-y-7 transition-opacity",
              !art && "pointer-events-none opacity-40 select-none",
            )}
            aria-hidden={!art}
          >
            <Section title="Background">
              <Segmented
                label="Background"
                value={composition.background}
                options={BACKGROUNDS}
                onChange={(background) => patch({ background })}
              />
            </Section>

            <Section title="Composition">
              <Slider
                label="Inset"
                readout={`${Math.round(composition.inset * 100)}%`}
                value={composition.inset}
                min={INSET_RANGE.min}
                max={INSET_RANGE.max}
                step={INSET_RANGE.step}
                onChange={(inset) => patch({ inset })}
              />
              <Slider
                label="Corner"
                readout={measured ? `${measured.radius} px` : "—"}
                value={composition.radius}
                min={RADIUS_RANGE.min}
                max={RADIUS_RANGE.max}
                step={RADIUS_RANGE.step}
                onChange={(radius) => patch({ radius })}
              />
              <Segmented
                label="Shadow"
                value={composition.shadow}
                options={SHADOWS}
                onChange={(shadow) => patch({ shadow })}
              />
              <Segmented
                label="Frame"
                value={composition.frame}
                options={FRAMES}
                onChange={(frame) => patch({ frame })}
              />
              <Segmented
                label="Format"
                value={composition.ratio}
                options={RATIO_OPTIONS}
                columns={3}
                onChange={(ratio) => patch({ ratio })}
              />
            </Section>
          </div>
        </div>

        <div className="shrink-0 space-y-3 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <Segmented
              label="Resolution"
              value={String(composition.scale) as "1" | "2"}
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
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={save}
              disabled={!art}
            >
              <Download className="size-4" />
              Save PNG
            </Button>
            <Button
              onClick={copy}
              disabled={!art}
              aria-label="Copy to clipboard"
              className="w-9 px-0"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          if (event.target.files?.length) void acceptFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </main>
  );
}

function slug(label: string): string {
  const base = label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return base ? `shot-${base.toLowerCase()}` : "shot";
}
