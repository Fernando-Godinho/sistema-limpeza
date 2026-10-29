import type { Locale } from "../config";
import { en } from "./en";
import { es } from "./es";
import { ptBR, type MessageKey, type Messages } from "./pt-BR";

/** Textos de todos os idiomas disponiveis. */
export const MESSAGES: Record<Locale, Messages> = {
  "pt-BR": ptBR,
  es,
  en,
};

export { en, es, ptBR };
export type { MessageKey, Messages };
