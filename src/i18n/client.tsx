"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Locale } from "./config";
import type { Messages } from "./messages";
import { createTranslator, type Translate } from "./translate";

type LocaleContextValue = {
  locale: Locale;
  t: Translate;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Entrega o idioma e os textos para as telas que rodam no navegador.
 * Os textos vem do servidor para que apenas o idioma escolhido seja enviado.
 */
export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: createTranslator(messages) }),
    [locale, messages],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

export function useTranslate(): Translate {
  return useLocaleContext().t;
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("LocaleProvider nao foi encontrado acima deste componente.");
  }
  return value;
}
