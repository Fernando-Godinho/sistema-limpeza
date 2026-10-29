/**
 * Idiomas disponiveis no sistema.
 *
 * O portugues do Brasil e o idioma principal. Para acrescentar um idioma novo:
 * 1. crie o arquivo de textos em src/i18n/messages/
 * 2. registre o idioma em MESSAGES (src/i18n/messages/index.ts)
 * 3. acrescente a linha aqui embaixo.
 */

export const LOCALES = ["pt-BR", "es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt-BR";

/**
 * Nome de cada idioma escrito no proprio idioma, para que a pessoa reconheca
 * o seu sem precisar entender outro idioma.
 *
 * Nao usamos bandeira de proposito: idioma nao e nacionalidade, e o nome
 * escrito e mais claro para quem le com dificuldade.
 */
export const LOCALE_INFO: Record<Locale, { name: string }> = {
  "pt-BR": { name: "Português" },
  es: { name: "Español" },
  en: { name: "English" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Aceita variantes vindas do navegador ("pt", "pt-BR", "es-419", "en-US")
 * e devolve o idioma suportado mais proximo.
 */
export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const cleaned = value.trim();

  if (isLocale(cleaned)) return cleaned;

  const base = cleaned.split("-")[0].toLowerCase();
  if (base === "pt") return "pt-BR";
  if (base === "es") return "es";
  if (base === "en") return "en";
  return null;
}

export function localeName(locale: Locale): string {
  return LOCALE_INFO[locale].name;
}
