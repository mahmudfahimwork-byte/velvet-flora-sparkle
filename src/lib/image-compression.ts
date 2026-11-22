const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type CompressedImage = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
};

const TARGET_BYTES = 250 * 1024;
const EDGES = [1200, 1000, 800, 640];
const QUALITIES = [0.78, 0.65, 0.55, 0.45];

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Photo must be under 10MB");
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    throw new Error("Please upload a JPG, PNG, or WebP photo");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo format is not supported. Please use JPG, PNG, or WebP");
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this photo");
  }

  let best: Blob | null = null;
  try {
    outer: for (const edge of EDGES) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      // White background so transparent PNGs don't turn black as JPEG.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const q of QUALITIES) {
        let blob = await canvasToBlob(canvas, "image/webp", q);
        // Some browsers (Safari) silently return PNG instead of WebP — use JPEG then.
        if (!blob || blob.type !== "image/webp") blob = await canvasToBlob(canvas, "image/jpeg", q);
        if (!blob) continue;
        if (!best || blob.size < best.size) best = blob;
        if (blob.size <= TARGET_BYTES) break outer;
      }
    }
  } finally {
    bitmap.close();
  }
  if (!best) throw new Error("Could not compress this photo");

  const ext = best.type === "image/webp" ? "webp" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  const output = new File([best], `${baseName}.${ext}`, { type: best.type, lastModified: Date.now() });

  return { file: output, originalBytes: file.size, compressedBytes: output.size };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}