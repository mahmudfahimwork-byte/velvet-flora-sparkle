const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1600;
const WEBP_QUALITY = 0.78;

export type CompressedImage = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
};

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress this photo"))),
      "image/webp",
      WEBP_QUALITY,
    );
  });
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

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare this photo");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const compressed = await canvasToBlob(canvas);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  const output = new File([compressed], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });

  return {
    file: output,
    originalBytes: file.size,
    compressedBytes: output.size,
  };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}