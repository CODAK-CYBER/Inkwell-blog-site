import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { imageSize } from "image-size";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { storeFile } from "@/lib/storage";
import { MEDIA_RULES, formatBytes } from "@/lib/media";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

interface UploadResult {
  id: string;
  url: string;
  filename: string;
  kind: string;
  duplicate?: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { media: ["upload"] })) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const folderId = (form.get("folderId") as string) || null;
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > 20) {
    return NextResponse.json({ error: "Max 20 files per upload" }, { status: 400 });
  }

  const results: UploadResult[] = [];

  for (const file of files) {
    const rule = MEDIA_RULES[file.type];
    if (!rule) {
      results.push({ id: "", url: "", filename: file.name, kind: "", error: `Unsupported type (${file.type || "unknown"})` });
      continue;
    }
    if (file.size > rule.maxBytes) {
      results.push({ id: "", url: "", filename: file.name, kind: rule.kind, error: `Too large — max ${formatBytes(rule.maxBytes)} for ${rule.kind}s` });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Duplicate detection: identical bytes already in the library.
    const existing = await prisma.media.findFirst({ where: { hash, deletedAt: null } });
    if (existing) {
      results.push({
        id: existing.id,
        url: existing.url,
        filename: existing.filename,
        kind: existing.kind,
        duplicate: true,
      });
      continue;
    }

    let width: number | null = null;
    let height: number | null = null;
    if (rule.kind === "image" && file.type !== "image/svg+xml") {
      try {
        const dim = imageSize(buffer);
        width = dim.width ?? null;
        height = dim.height ?? null;
      } catch {
        // dimensions stay unknown
      }
    }

    const stored = await storeFile(buffer, file.name, file.type);
    const media = await prisma.media.create({
      data: {
        filename: file.name,
        url: stored.url,
        kind: rule.kind,
        mimeType: file.type,
        size: file.size,
        width,
        height,
        hash,
        folderId,
        uploaderId: session.user.id,
      },
    });
    results.push({ id: media.id, url: media.url, filename: media.filename, kind: media.kind });
  }

  const uploaded = results.filter((r) => r.id && !r.duplicate).length;
  if (uploaded > 0) {
    await logActivity({
      userId: session.user.id,
      action: "media.uploaded",
      targetType: "media",
      detail: `${uploaded} file${uploaded === 1 ? "" : "s"}`,
    });
  }

  return NextResponse.json({ results });
}
