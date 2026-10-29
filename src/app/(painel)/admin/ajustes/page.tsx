import { DEFAULT_LOCALE, LOCALES, normalizeLocale } from "@/i18n/config";
import { prisma } from "@/lib/db";

import { SettingsPanel } from "./settings-panel";

/** Ajustes do sistema: idioma principal e recomeco dos dados de exemplo. */
export default async function AdminSettingsPage() {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "defaultLocale" },
    select: { value: true },
  });

  return (
    <SettingsPanel
      defaultLocale={normalizeLocale(setting?.value) ?? DEFAULT_LOCALE}
      availableLocales={[...LOCALES]}
    />
  );
}
