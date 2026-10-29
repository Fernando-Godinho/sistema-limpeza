"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/icon";
import { useTranslate } from "@/i18n/client";
import { logoutAction } from "@/lib/actions/auth";

/**
 * Botao de sair, sempre no mesmo canto de todas as telas.
 *
 * No aparelho compartilhado do local, sair e o que garante que a proxima
 * pessoa nao use a conta da anterior. Por isso ele nunca fica escondido.
 */
export function LogoutButton() {
  const t = useTranslate();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await logoutAction();
      router.replace("/entrar");
      router.refresh();
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn--small btn--quiet"
      onClick={handleClick}
      aria-busy={pending ? "true" : undefined}
    >
      <Icon name="exit" size={24} className="btn__icon" />
      {t("action.logout")}
    </button>
  );
}
