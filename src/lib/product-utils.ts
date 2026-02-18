import path from "path";
import { mkdir, writeFile } from "fs/promises";

const ACCEPTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png"]);

function safeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
}

export function parseTags(raw: string) {
  const unique = new Set(
    raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
  return [...unique];
}

export async function saveProductImage(file: File, productCode: string) {
  if (!file || file.size === 0) return null;

  const extension = path.extname(file.name || "").toLowerCase();
  if (!ACCEPTED_EXTENSIONS.has(extension) || !ACCEPTED_MIME.has(file.type)) {
    throw new Error("Only JPG, JPEG, and PNG images are allowed.");
  }

  const maxUploadBytes = 4 * 1024 * 1024;
  if (file.size > maxUploadBytes) {
    throw new Error("Image size must be 4MB or less.");
  }

  const fileName = `${safeName(productCode)}-${Date.now()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (process.env.VERCEL) {
    const base64 = bytes.toString("base64");
    return `data:${file.type};base64,${base64}`;
  }

  const targetDir = path.join(process.cwd(), "public", "products");
  const targetFile = path.join(targetDir, fileName);

  await mkdir(targetDir, { recursive: true });
  await writeFile(targetFile, bytes);

  return `/products/${fileName}`;
}
