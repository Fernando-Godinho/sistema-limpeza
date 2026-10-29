import { ptBR, type MessageKey, type Messages } from "./messages/pt-BR";

export type TranslationVars = Record<string, string | number>;

/** Chave da saudacao conforme a hora do dia. */
export const GREETING_KEYS = {
  morning: "greeting.morning",
  afternoon: "greeting.afternoon",
  evening: "greeting.evening",
} as const satisfies Record<string, MessageKey>;

export type Translate = (key: MessageKey, vars?: TranslationVars) => string;

/**
 * Monta a funcao de traducao de um idioma.
 *
 * Se uma chave faltar no idioma escolhido, cai de volta para o portugues.
 * Assim uma traducao incompleta nunca deixa um espaco em branco na tela.
 */
export function createTranslator(messages: Partial<Messages>): Translate {
  return (key, vars) => {
    const text = messages[key] ?? ptBR[key] ?? String(key);
    if (!vars) return text;

    return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
    );
  };
}
