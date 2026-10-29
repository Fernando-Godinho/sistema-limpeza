"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { Alert } from "@/components/display";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";
import { useLocale, useTranslate } from "@/i18n/client";
import { LOCALE_INFO, LOCALES, type Locale } from "@/i18n/config";
import { setLocaleAction } from "@/lib/actions/locale";

/**
 * Troca de idioma.
 *
 * O nome de cada idioma aparece escrito no proprio idioma ("Portugues",
 * "Espanol", "English"), para que a pessoa reconheca o seu sem precisar
 * entender outro idioma. O idioma em uso fica marcado com um visto e com a
 * palavra "Atual" do lado -- nunca so com cor.
 *
 * Nao usamos bandeira: idioma nao e nacionalidade.
 */

function useLocaleSwitcher() {
  const t = useTranslate();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = useCallback(
    (locale: Locale, onDone?: () => void) => {
      setError(null);
      startTransition(async () => {
        try {
          const result = await setLocaleAction(locale);
          if (!result.ok) {
            setError(t("error.generic"));
            return;
          }
          onDone?.();
          router.refresh();
        } catch {
          setError(navigator.onLine ? t("error.generic") : t("error.offline"));
        }
      });
    },
    [router, t],
  );

  return { error, pending, choose };
}

/** Lista de idiomas com o nome escrito. Usada nos ajustes e na janela do alto da tela. */
export function LanguageOptions({ onDone }: { onDone?: () => void }) {
  const t = useTranslate();
  const current = useLocale();
  const { error, pending, choose } = useLocaleSwitcher();

  return (
    <div className="stack stack--tight">
      {error ? (
        <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
          {error}
        </Alert>
      ) : null}

      <div className="language-picker language-picker--full">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            className="language-picker__option"
            aria-pressed={locale === current}
            onClick={() => choose(locale, onDone)}
            disabled={pending}
          >
            <span translate="no">{LOCALE_INFO[locale].name}</span>
            {locale === current ? (
              <span className="choice__mark">
                <Icon name="check" size={22} strokeWidth={3} />
                {t("action.current")}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Botao do alto da tela, que abre a lista de idiomas. */
export function LanguageMenu() {
  const t = useTranslate();
  const current = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn--small btn--quiet"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${t("language.change")}. ${t("language.current", { name: LOCALE_INFO[current].name })}`}
      >
        <Icon name="globe" size={24} className="btn__icon" />
        {LOCALE_INFO[current].name}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("language.change")}>
        <p className="dialog__text">{t("language.label")}</p>
        <LanguageOptions onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}
