"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/display";
import { Icon } from "@/components/icon";
import { ConfirmDialog, LiveRegion } from "@/components/modal";
import { useTranslate } from "@/i18n/client";
import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { resetSampleDataAction, setDefaultLocaleAction } from "@/lib/actions/admin";

/**
 * Ajustes do sistema.
 *
 * Duas coisas mudam o sistema inteiro, entao as duas mostram claramente o que
 * fazem. A que apaga tudo pede confirmacao e avisa, item por item, o que sai.
 */
export function SettingsPanel({
  defaultLocale,
  availableLocales,
}: {
  defaultLocale: Locale;
  availableLocales: Locale[];
}) {
  const t = useTranslate();
  const router = useRouter();

  const [current, setCurrent] = useState<Locale>(defaultLocale);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? t("error.generic"));
        return;
      }
      if (result.message) setAnnouncement(result.message);
      after?.();
      router.refresh();
    } catch {
      setError(navigator.onLine ? t("error.generic") : t("error.offline"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <LiveRegion message={announcement} />

      {error ? (
        <div className="actions">
          <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
            {error}
          </Alert>
        </div>
      ) : null}

      <section className="card">
        <h2 className="card__title">{t("admin.settingsLanguage")}</h2>
        <p className="text-small field__hint">{t("admin.settingsLanguageHint")}</p>

        <div className="language-picker language-picker--full actions">
          {availableLocales.map((locale) => (
            <button
              key={locale}
              type="button"
              className="language-picker__option"
              aria-pressed={locale === current}
              disabled={pending}
              onClick={() => {
                setCurrent(locale);
                void run(() => setDefaultLocaleAction(locale));
              }}
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
      </section>

      <section className="card">
        <h2 className="card__title">{t("admin.seedTitle")}</h2>
        <p className="text-small field__hint">{t("admin.seedHint")}</p>

        <div className="actions">
          <button type="button" className="btn btn--danger" onClick={() => setConfirmReset(true)}>
            <Icon name="refresh" className="btn__icon" />
            {t("admin.seedReset")}
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void run(() => resetSampleDataAction());
        }}
        title={t("admin.seedResetTitle")}
        text={t("admin.seedResetBody")}
        confirmLabel={t("admin.seedResetYes")}
        cancelLabel={t("admin.deleteNo")}
        pending={pending}
      />
    </>
  );
}
