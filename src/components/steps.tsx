"use client";

import { useTranslate } from "@/i18n/client";

/**
 * Mostra em que passo a pessoa esta: "Passo 2 de 4".
 *
 * A contagem vai escrita por extenso porque so os pontinhos nao dizem nada
 * para quem nunca usou um aplicativo.
 */
export function Steps({ step, total }: { step: number; total: number }) {
  const t = useTranslate();

  return (
    <div className="steps">
      <p className="steps__label">{t("action.step", { step, total })}</p>
      <div className="steps__track" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => {
          const position = index + 1;
          const state = position < step ? "done" : position === step ? "now" : "todo";
          return <span key={position} className={`steps__dot steps__dot--${state}`} />;
        })}
      </div>
    </div>
  );
}
