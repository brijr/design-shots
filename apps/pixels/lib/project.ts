import {
  CANVAS_SIZE,
  MAX_COLORS,
  MAX_LAYERS,
  PIXEL_COUNT,
  TRANSPARENT,
  type PixelDocument,
} from "./types";

const FORMAT = "design-pixels";
const VERSION = 1;
const DATABASE = "design-pixels";
const STORE = "projects";
const AUTOSAVE_KEY = "current";

interface ProjectFile {
  format: typeof FORMAT;
  version: typeof VERSION;
  name: string;
  width: number;
  height: number;
  palette: string[];
  activeLayerId: string;
  layers: Array<{
    id: string;
    name: string;
    visible: boolean;
    pixels: string;
  }>;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function serializeProject(document: PixelDocument): string {
  const file: ProjectFile = {
    format: FORMAT,
    version: VERSION,
    name: document.name,
    width: document.width,
    height: document.height,
    palette: document.palette,
    activeLayerId: document.activeLayerId,
    layers: document.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      pixels: bytesToBase64(layer.pixels),
    })),
  };
  return JSON.stringify(file);
}

export function parseProject(raw: string): PixelDocument {
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new Error("This project file is not valid JSON.");
  }

  if (!input || typeof input !== "object") {
    throw new Error("This project file is empty or malformed.");
  }
  const file = input as Partial<ProjectFile>;
  if (file.format !== FORMAT || file.version !== VERSION) {
    throw new Error("This project version is not supported.");
  }
  if (file.width !== CANVAS_SIZE || file.height !== CANVAS_SIZE) {
    throw new Error("Design Pixels projects must be 256 × 256.");
  }
  if (
    !Array.isArray(file.palette) ||
    file.palette.length < 2 ||
    file.palette.length > MAX_COLORS ||
    !file.palette.every(isHex)
  ) {
    throw new Error("The project palette is invalid.");
  }
  if (
    !Array.isArray(file.layers) ||
    file.layers.length < 1 ||
    file.layers.length > MAX_LAYERS
  ) {
    throw new Error("The project layer list is invalid.");
  }

  const ids = new Set<string>();
  const layers = file.layers.map((layer) => {
    if (
      !layer ||
      typeof layer.id !== "string" ||
      !layer.id ||
      ids.has(layer.id) ||
      typeof layer.name !== "string" ||
      typeof layer.visible !== "boolean" ||
      typeof layer.pixels !== "string"
    ) {
      throw new Error("A project layer is malformed.");
    }
    ids.add(layer.id);
    let pixels: Uint8Array;
    try {
      pixels = base64ToBytes(layer.pixels);
    } catch {
      throw new Error(`The pixel data for “${layer.name}” could not be read.`);
    }
    if (pixels.length !== PIXEL_COUNT) {
      throw new Error(`The pixel data for “${layer.name}” has the wrong size.`);
    }
    if (pixels.some((value) => value !== TRANSPARENT && value >= file.palette!.length)) {
      throw new Error(`The layer “${layer.name}” uses a missing palette color.`);
    }
    return { id: layer.id, name: layer.name, visible: layer.visible, pixels };
  });

  if (!file.activeLayerId || !ids.has(file.activeLayerId)) {
    throw new Error("The active layer is missing.");
  }

  return {
    name: typeof file.name === "string" && file.name.trim() ? file.name : "Untitled",
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    palette: [...file.palette],
    layers,
    activeLayerId: file.activeLayerId,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAutosave(document: PixelDocument): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(serializeProject(document), AUTOSAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function loadAutosave(): Promise<PixelDocument | null> {
  const database = await openDatabase();
  const raw = await new Promise<unknown>((resolve, reject) => {
    const request = database.transaction(STORE).objectStore(STORE).get(AUTOSAVE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return typeof raw === "string" ? parseProject(raw) : null;
}

export async function clearAutosave(): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(AUTOSAVE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}
