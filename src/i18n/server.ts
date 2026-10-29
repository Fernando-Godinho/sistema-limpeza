import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { LOCALE_COOKIE, getSessionUser } from "@/lib/session";

import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./config";
import { MESSAGES } from "./messages";
import { createTranslator, type Translate } from "./translate";

/**
 * Idioma da pessoa que esta usando o sistema.
 *
 * A ordem de escolha e: o que ela escolheu por ultimo no proprio aparelho,
 * depois o idioma que ela guardou no cadastro, e por fim o portugues.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const fromCookie = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  const user = await getSessionUser();
  return normalizeLocale(user?.locale) ?? DEFAULT_LOCALE;
});

/** Funcao de traducao do lado do servidor. */
export const getTranslate = cache(async (): Promise<Translate> => {
  const locale = await getLocale();
  return createTranslator(MESSAGES[locale]);
});

/** Atalho para quem precisa dos dois: idioma e traducao. */
export const getI18n = cache(async () => {
  const locale = await getLocale();
  return { locale, t: createTranslator(MESSAGES[locale]), messages: MESSAGES[locale] };
});
