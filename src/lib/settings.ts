import { prisma } from "@/lib/prisma";

/**
 * Platform configuration stored as key-value rows (SiteSetting).
 * Booleans are stored as "true"/"false" strings.
 */

export const SETTING_DEFAULTS = {
  maintenanceMode: "false",
  registrationEnabled: "true",
  commentsEnabled: "true",
  supportEmail: "",
  maintenanceMessage: "We're doing some scheduled maintenance and will be back shortly.",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.siteSetting.findMany();
  const map = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;
  for (const row of rows) {
    if (row.key in map) map[row.key as SettingKey] = row.value;
  }
  return map;
}

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await prisma.siteSetting.findUnique({ where: { key } });
  return row?.value ?? SETTING_DEFAULTS[key];
}

export const settingIsOn = (value: string) => value === "true";
