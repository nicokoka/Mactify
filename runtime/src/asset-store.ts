// Large user assets (background images/GIFs) live in IndexedDB, not localStorage:
// localStorage is shared with Spotify itself and a multi-MB GIF would exhaust its
// quota. Values are data: URLs because Spotify's CSP blocks blob:/remote images.

const DB_NAME = "spotify-customizer";
const STORE = "assets";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("indexedDB request failed"));
    });
  } finally {
    db.close();
  }
}

/** IndexedDB key for an option's image setting. */
export function assetKeyFor(optionId: string, settingKey: string): string {
  return `${optionId}:${settingKey}`;
}

export async function getAsset(key: string): Promise<string | null> {
  const value = await tx<unknown>("readonly", (s) => s.get(key));
  return typeof value === "string" ? value : null;
}

export function putAsset(key: string, dataUrl: string): Promise<IDBValidKey> {
  return tx("readwrite", (s) => s.put(dataUrl, key));
}

export function deleteAsset(key: string): Promise<undefined> {
  return tx("readwrite", (s) => s.delete(key));
}

const MAX_EDGE = 2560;
const MAX_GIF_BYTES = 12 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Turn a picked file into a storable data URL. Stills are downscaled to a sane size;
 * GIFs are kept as-is (re-encoding would drop the animation) but size-capped.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.type === "image/gif") {
    if (file.size > MAX_GIF_BYTES) throw new Error("GIF is over 12 MB — try a smaller one.");
    return readAsDataUrl(file);
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas unavailable.");
  g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.88);
}
