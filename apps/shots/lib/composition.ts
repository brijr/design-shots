// Ids are declared as arrays so the runtime can check a stored value against
// the same list the type is derived from. They cannot drift apart.
export const BACKGROUND_IDS = ["white", "grey", "charcoal", "black"] as const;
export const INSET_IDS = ["tight", "even", "wide"] as const;
export const CORNER_IDS = ["none", "subtle", "round"] as const;
export const EDGE_IDS = ["none", "hairline"] as const;
export const SHADOW_IDS = ["none", "soft", "deep"] as const;
export const FRAME_IDS = ["none", "window"] as const;
export const RATIO_IDS = ["auto", "16:9", "3:2", "4:3", "1:1", "4:5"] as const;

export type BackgroundId = (typeof BACKGROUND_IDS)[number];
export type InsetId = (typeof INSET_IDS)[number];
export type CornerId = (typeof CORNER_IDS)[number];
export type EdgeId = (typeof EDGE_IDS)[number];
export type ShadowId = (typeof SHADOW_IDS)[number];
export type FrameId = (typeof FRAME_IDS)[number];
export type RatioId = (typeof RATIO_IDS)[number];

export interface Composition {
  background: BackgroundId;
  inset: InsetId;
  corner: CornerId;
  edge: EdgeId;
  shadow: ShadowId;
  frame: FrameId;
  ratio: RatioId;
  scale: 1 | 2;
  /** Caption shown in the window bar. */
  label: string;
}

export const DEFAULT_COMPOSITION: Composition = {
  background: "white",
  inset: "even",
  corner: "subtle",
  edge: "none",
  shadow: "none",
  frame: "none",
  ratio: "auto",
  scale: 2,
  label: "",
};

/**
 * Three stops each, as fractions of the artwork's long edge. Choosing from a
 * few good values beats dialling in an arbitrary one — every stop here is a
 * composition that works, which a continuous slider cannot promise.
 */
export const INSETS: Record<InsetId, number> = {
  tight: 0.045,
  even: 0.09,
  wide: 0.18,
};

export const CORNERS: Record<CornerId, number> = {
  none: 0,
  subtle: 0.012,
  round: 0.03,
};

export const RATIOS: Record<RatioId, number | null> = {
  auto: null,
  "16:9": 16 / 9,
  "3:2": 3 / 2,
  "4:3": 4 / 3,
  "1:1": 1,
  "4:5": 4 / 5,
};

/**
 * Compositions are restored from storage, which may hold a shape written by an
 * older build — an id that has since been renamed or dropped. Anything not
 * recognised falls back to the default rather than reaching the painter, where
 * an unknown background would be a missing surface and a blank canvas.
 */
export function sanitizeComposition(raw: unknown): Composition {
  const input = (typeof raw === "object" && raw ? raw : {}) as Record<
    string,
    unknown
  >;

  const pick = <T extends string>(key: string, allowed: readonly T[]): T => {
    const value = input[key];
    return allowed.includes(value as T)
      ? (value as T)
      : (DEFAULT_COMPOSITION[key as keyof Composition] as T);
  };

  return {
    background: pick("background", BACKGROUND_IDS),
    inset: pick("inset", INSET_IDS),
    corner: pick("corner", CORNER_IDS),
    edge: pick("edge", EDGE_IDS),
    shadow: pick("shadow", SHADOW_IDS),
    frame: pick("frame", FRAME_IDS),
    ratio: pick("ratio", RATIO_IDS),
    scale: input.scale === 1 ? 1 : 2,
    label: "",
  };
}

/** Hard ceiling on either output dimension, to keep the canvas sane. */
const MAX_EDGE = 5000;

export interface Layout {
  /** Output size in CSS-independent design units (before `scale`). */
  width: number;
  height: number;
  /** Final exported pixel size. */
  pixelWidth: number;
  pixelHeight: number;
  effectiveScale: number;
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  barHeight: number;
  radius: number;
  longEdge: number;
}

export interface Artwork {
  width: number;
  height: number;
}

/**
 * A retina capture carries twice the pixels of the layout it depicts. Working
 * in logical units keeps `scale` honest: 2× means twice the source's own
 * resolution, never twice whatever density it happened to arrive at.
 */
export function artworkOf(image: HTMLImageElement, density: number): Artwork {
  return {
    width: Math.round(image.naturalWidth / density),
    height: Math.round(image.naturalHeight / density),
  };
}

/** Images this wide are, in practice, retina screen captures. */
export function guessDensity(image: HTMLImageElement): number {
  return image.naturalWidth >= 2400 ? 2 : 1;
}

export function layout(art: Artwork, c: Composition): Layout {
  const barHeight =
    c.frame === "window" ? Math.max(28, Math.round(art.width * 0.03)) : 0;

  const cardWidth = art.width;
  const cardHeight = art.height + barHeight;
  const longEdge = Math.max(cardWidth, cardHeight);

  const pad = Math.round(INSETS[c.inset] * longEdge);
  let width = cardWidth + pad * 2;
  let height = cardHeight + pad * 2;

  const ratio = RATIOS[c.ratio];
  if (ratio) {
    // Grow the short axis to reach the ratio. The artwork is never cropped.
    if (width / height < ratio) width = Math.round(height * ratio);
    else height = Math.round(width / ratio);
  }

  const effectiveScale = Math.min(
    c.scale,
    MAX_EDGE / Math.max(width, height),
  );

  return {
    width,
    height,
    pixelWidth: Math.round(width * effectiveScale),
    pixelHeight: Math.round(height * effectiveScale),
    effectiveScale,
    cardX: Math.round((width - cardWidth) / 2),
    cardY: Math.round((height - cardHeight) / 2),
    cardWidth,
    cardHeight,
    barHeight,
    radius: Math.round(CORNERS[c.corner] * longEdge),
    longEdge,
  };
}

/**
 * Four neutrals, no accent. `edge` is the hairline drawn along the artwork's
 * own boundary — the only thing separating a white screenshot from a white
 * background, or a dark one from black.
 */
const SURFACE = {
  white: {
    page: "#ffffff",
    bar: "#f2f2f2",
    hairline: "#e3e3e3",
    dot: "#d2d2d2",
    caption: "#9b9b9b",
    plate: "#ffffff",
    edge: "rgba(0,0,0,0.13)",
  },
  grey: {
    page: "#f1f2f4",
    bar: "#e7e9ed",
    hairline: "#dbdee4",
    dot: "#c7cbd3",
    caption: "#8b9099",
    plate: "#ffffff",
    edge: "rgba(0,0,0,0.12)",
  },
  charcoal: {
    page: "#161616",
    bar: "#232323",
    hairline: "#303030",
    dot: "#3f3f3f",
    caption: "#767676",
    plate: "#0f0f0f",
    edge: "rgba(255,255,255,0.11)",
  },
  black: {
    page: "#000000",
    bar: "#1c1c1c",
    hairline: "#2b2b2b",
    dot: "#3a3a3a",
    caption: "#6f6f6f",
    plate: "#0e0e0e",
    edge: "rgba(255,255,255,0.12)",
  },
} as const;

const SHADOW = {
  none: { blur: 0, offset: 0, alpha: 0 },
  soft: { blur: 0.055, offset: 0.026, alpha: 0.18 },
  deep: { blur: 0.115, offset: 0.058, alpha: 0.26 },
} as const;

/**
 * Paints one composition. This is the only place pixels are produced — the
 * on-screen preview and the downloaded PNG are the same canvas, so what is
 * seen is literally what is saved.
 */
export function paint(
  ctx: CanvasRenderingContext2D,
  art: CanvasImageSource,
  c: Composition,
  l: Layout,
): void {
  const skin = SURFACE[c.background];
  const shadow = SHADOW[c.shadow];

  ctx.setTransform(l.effectiveScale, 0, 0, l.effectiveScale, 0, 0);
  ctx.clearRect(0, 0, l.width, l.height);

  ctx.fillStyle = skin.page;
  ctx.fillRect(0, 0, l.width, l.height);

  const card = (): void => {
    ctx.beginPath();
    ctx.roundRect(l.cardX, l.cardY, l.cardWidth, l.cardHeight, l.radius);
  };

  if (c.shadow !== "none") {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${shadow.alpha})`;
    ctx.shadowBlur = shadow.blur * l.longEdge;
    ctx.shadowOffsetY = shadow.offset * l.longEdge;
    ctx.fillStyle = l.barHeight ? skin.bar : skin.plate;
    card();
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = l.barHeight ? skin.bar : skin.plate;
    card();
    ctx.fill();
  }

  ctx.save();
  card();
  ctx.clip();

  if (l.barHeight) {
    drawWindowBar(ctx, c, l, skin);
  }
  ctx.drawImage(
    art,
    l.cardX,
    l.cardY + l.barHeight,
    l.cardWidth,
    l.cardHeight - l.barHeight,
  );
  ctx.restore();

  if (c.edge === "hairline") {
    ctx.save();
    ctx.strokeStyle = skin.edge;
    ctx.lineWidth = Math.max(1, l.longEdge * 0.0009);
    card();
    ctx.stroke();
    ctx.restore();
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawWindowBar(
  ctx: CanvasRenderingContext2D,
  c: Composition,
  l: Layout,
  skin: (typeof SURFACE)[BackgroundId],
): void {
  const bar = l.barHeight;

  ctx.fillStyle = skin.bar;
  ctx.fillRect(l.cardX, l.cardY, l.cardWidth, bar);

  ctx.fillStyle = skin.hairline;
  ctx.fillRect(l.cardX, l.cardY + bar - 1, l.cardWidth, 1);

  const r = bar * 0.105;
  const gap = bar * 0.32;
  let cx = l.cardX + bar * 0.46;
  ctx.fillStyle = skin.dot;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx, l.cardY + bar / 2, r, 0, Math.PI * 2);
    ctx.fill();
    cx += gap;
  }

  const caption = c.label.trim();
  if (!caption) return;

  ctx.font = `${Math.round(bar * 0.34)}px ui-sans-serif, -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = skin.caption;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const room = l.cardWidth * 0.5;
  let text = caption;
  if (ctx.measureText(text).width > room) {
    while (text.length > 1 && ctx.measureText(text + "…").width > room) {
      text = text.slice(0, -1);
    }
    text += "…";
  }
  ctx.fillText(text, l.cardX + l.cardWidth / 2, l.cardY + bar / 2 + 0.5);
}
