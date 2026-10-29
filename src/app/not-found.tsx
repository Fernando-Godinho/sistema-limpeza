import Link from "next/link";

import { Icon } from "@/components/icon";
import { getTranslate } from "@/i18n/server";

/** Tela amigavel para quando o endereco nao existe ou o conteudo nao e da pessoa. */
export default async function NotFound() {
  const t = await getTranslate();

  return (
    <div className="shell">
      <main className="shell__body" id="conteudo">
        <div className="cheer">
          <span className="cheer__mark cheer__mark--brand">
            <Icon name="search" size={48} />
          </span>
          <p className="cheer__title cheer__title--ink">{t("error.notFound")}</p>
          <div className="btn-stack">
            <Link className="btn btn--primary" href="/">
              <Icon name="home" className="btn__icon" />
              {t("error.backHome")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
