"use client";

import { useEffect } from "react";

import { Icon } from "@/components/icon";
import { useTranslate } from "@/i18n/client";

/**
 * Quando algo quebra de verdade, a tela explica em palavras simples o que
 * fazer. Nada de codigo de erro, nada de "exception": a pessoa toca em
 * "Tentar novamente" e segue.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslate();

  useEffect(() => {
    // O detalhe tecnico fica no console, para quem cuida do sistema.
    console.error(error);
  }, [error]);

  return (
    <div className="shell">
      <main className="shell__body" id="conteudo">
        <div className="cheer">
          <span className="cheer__mark cheer__mark--warning">
            <Icon name="alert" size={48} />
          </span>
          <p className="cheer__title cheer__title--ink">{t("error.generic")}</p>
          <div className="btn-stack">
            <button type="button" className="btn btn--primary" onClick={reset}>
              <Icon name="refresh" className="btn__icon" />
              {t("action.tryAgain")}
            </button>
            <a className="btn btn--quiet" href="/">
              <Icon name="home" className="btn__icon" />
              {t("error.backHome")}
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
