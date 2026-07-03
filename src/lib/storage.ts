import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * File storage:
 * - Cloudinary when CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are set
 * - local disk (public/uploads) otherwise — perfect for dev; swap to
 *   Cloudinary before deploying to serverless hosting.
 */

export interface StoredFile {
  url: string;
}

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export async function storeFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<StoredFile> {
  if (cloudinaryConfigured()) {
    return storeCloudinary(buffer, filename, mimeType);
  }
  return storeLocal(buffer, filename);
}

/** Best-effort removal (local files only; Cloudinary assets keep history). */
export async function removeFile(url: string) {
  if (!url.startsWith("/uploads/")) return;
  try {
    await fs.unlink(path.join(process.cwd(), "public", url));
  } catch {
    // already gone
  }
}

async function storeLocal(buffer: Buffer, filename: string): Promise<StoredFile> {
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  const safe = filename.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").slice(-80);
  const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safe}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return { url: `/uploads/${name}` };
}

async function storeCloudinary(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<StoredFile> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "inkwell";
  // Signature: sorted params + secret, SHA-1 (per Cloudinary docs)
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { secure_url: string };
  return { url: data.secure_url };
}
