import { AppShell } from "@/components/app-shell";
import { LanguageOptions } from "@/components/language-menu";
import { Avatar } from "@/components/display";
import { getTranslate } from "@/i18n/server";
import { requireUser } from "@/lib/session";

/** Ajustes da propria pessoa: o idioma das telas. */
export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslate();

  return (
    <AppShell user={user} wide={false}>
      <div className="screen-head">
        <h1 className="screen-head__title">{t("profile.title")}</h1>
      </div>

      <div className="card">
        <div className="person-row__head mb">
          <Avatar name={user.name} photoUrl={user.avatarPhotoId ? `/api/photos/${user.avatarPhotoId}` : null} big />
          <span className="person-row__name" translate="no">
            {user.name}
          </span>
        </div>

        <h2 className="card__title">{t("profile.language")}</h2>
        <p className="text-small mb">
          {t("profile.languageHint")}
        </p>
        <LanguageOptions />
      </div>
    </AppShell>
  );
}
