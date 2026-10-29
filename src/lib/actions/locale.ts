"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isLocale } from "@/i18n/config";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE, getSessionUser } from "@/lib/session";

export type LocaleActionResult = { ok: true } | { ok: false; message?: string };

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Guarda o idioma escolhido em dois lugares: no aparelho (cookie), para valer
 * ja na proxima tela, e no cadastro da pessoa, para ela reencontrar o proprio
 * idioma em qualquer aparelho.
 */
export async function setLocaleAction(locale: string): Promise<LocaleActionResult> {
  if (!isLocale(locale)) {
    return { ok: false };
  }

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: ONE_YEAR,
  });

  const user = await getSessionUser();
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { locale } });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
