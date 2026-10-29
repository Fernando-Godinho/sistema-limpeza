import { redirect } from "next/navigation";

import { LanguageMenu } from "@/components/language-menu";
import { Icon } from "@/components/icon";
import { getTranslate } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { getSessionUser, homePathFor } from "@/lib/session";

import { LoginForm } from "./login-form";

/**
 * Tela de entrada.
 *
 * O aparelho e compartilhado no local de trabalho, entao a pergunta e direta:
 * "Quem e voce?". Um toque no proprio nome, quatro numeros e pronto.
 * O seletor de idioma fica aqui em cima porque esta e a primeira tela que
 * todo mundo ve, inclusive quem ainda nao escolheu o proprio idioma.
 */
export default async function EntrarPage() {
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user.role));

  const t = await getTranslate();

  const people = await prisma.user.findMany({
    where: { active: true, pinHash: { not: null } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, avatarPhotoId: true },
  });

  return (
    <div className="login">
      <div className="login__head">
        <p className="brand">
          <Icon name="home" size={30} />
          {t("app.name")}
        </p>
        <LanguageMenu />
      </div>

      <div className="login__body">
        {people.length === 0 ? (
          <div className="card">
            <h1 className="screen-head__title">{t("login.title")}</h1>
            <p className="screen-head__subtitle">{t("login.empty")}</p>
          </div>
        ) : (
          <LoginForm
            people={people.map((person) => ({
              id: person.id,
              name: person.name,
              photoUrl: person.avatarPhotoId ? `/api/photos/${person.avatarPhotoId}` : null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
