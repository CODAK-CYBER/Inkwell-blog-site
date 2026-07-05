"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { isAdminRole } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";

async function requireAdmin() {
  const session = await getServerSession();
  if (!session || !isAdminRole(session.user.role)) throw new Error("Not permitted");
  return session;
}

// ---------------- Settings ----------------

export async function updateSettings(values: Partial<Record<SettingKey, string>>) {
  const session = await requireAdmin();
  for (const [key, value] of Object.entries(values)) {
    if (!(key in SETTING_DEFAULTS) || value === undefined) continue;
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  await logActivity({
    userId: session.user.id,
    action: "settings.updated",
    detail: Object.keys(values).join(", "),
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { success: true };
}

// ---------------- Backups (dev: SQLite file snapshots) ----------------

const BACKUP_DIR = path.join(process.cwd(), "backups");
const DB_FILE = path.join(process.cwd(), "prisma", "dev.db");

export async function createBackup() {
  const session = await requireAdmin();
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `backup-${stamp}.db`;
  await fs.copyFile(DB_FILE, path.join(BACKUP_DIR, name));
  await logActivity({ userId: session.user.id, action: "backup.created", detail: name });
  revalidatePath("/admin/backups");
  return { name };
}

export async function listBackups() {
  await requireAdmin();
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const entries = await Promise.all(
      files
        .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
        .map(async (f) => {
          const stat = await fs.stat(path.join(BACKUP_DIR, f));
          return { name: f, size: stat.size, createdAt: stat.mtime.toISOString() };
        })
    );
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function deleteBackup(name: string) {
  const session = await requireAdmin();
  if (!/^backup-[\w-]+\.db$/.test(name)) return { error: "Invalid backup name." };
  await fs.unlink(path.join(BACKUP_DIR, name)).catch(() => {});
  await logActivity({ userId: session.user.id, action: "backup.deleted", detail: name });
  revalidatePath("/admin/backups");
  return { success: true };
}
