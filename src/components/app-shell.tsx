import Link from "next/link";

import { Avatar } from "@/components/display";
import { Icon } from "@/components/icon";
import { LanguageMenu } from "@/components/language-menu";
import { LogoutButton } from "@/components/logout-button";
import { getTranslate } from "@/i18n/server";
import type { SessionUser } from "@/lib/session";

/**
 * Moldura das telas de dentro do sistema.
 *
 * O alto da tela e sempre igual: a pessoa conectada a esquerda, o seletor de
 * idioma e o botao de sair a direita. Quando existe um lugar para voltar, o
 * caminho de volta aparece em cima, com o nome do destino escrito.
 */
export async function AppShell({
  user,
  backTo,
  children,
  wide,
}: {
  user: SessionUser;
  backTo?: { href: string; label: string };
  children: React.ReactNode;
  wide?: boolean;
}) {
  const t = await getTranslate();

  return (
    <div className="shell">
      {/* Quem navega pelo teclado ou por leitor de tela pula o alto da tela. */}
      <a className="skip-link" href="#conteudo">
        {t("action.skipToContent")}
      </a>

      <header className="topbar">
        <div className={`topbar__inner${wide ? " topbar__inner--wide" : ""}`}>
          <div className="topbar__person">
            <Avatar name={user.name} />
            {/* O nome da pessoa fica como foi cadastrado, sem traducao. */}
            <span className="topbar__name" translate="no">
              {user.name}
            </span>
          </div>
          <div className="topbar__actions">
            <LanguageMenu />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main
        className={`shell__body${wide ? " shell__body--wide" : ""}`}
        id="conteudo"
        tabIndex={-1}
      >
        {backTo ? (
          <Link className="back-link" href={backTo.href}>
            <Icon name="back" size={26} className="btn__icon" />
            {backTo.label}
          </Link>
        ) : null}
        {children}
      </main>
    </div>
  );
}
