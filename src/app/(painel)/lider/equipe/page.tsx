import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/display";
import { Icon } from "@/components/icon";
import { getLocale, getTranslate } from "@/i18n/server";
import { formatLongDay, todayISO } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { workerScope } from "@/lib/team";

import { TeamList, type TeamPerson } from "./team-list";

/**
 * Equipe de hoje.
 *
 * Cartoes grandes com o nome e dois botoes sempre na mesma ordem:
 * Presente a esquerda, Ausente a direita. Como a ordem nunca muda, quem tem
 * dificuldade de leitura aprende a posicao e nao precisa ler de novo.
 */
export default async function TeamPage() {
  const user = await requireUser(["LEADER", "ADMIN"]);
  const t = await getTranslate();
  const locale = await getLocale();
  const today = todayISO();

  const [people, attendance] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: "WORKER", ...workerScope(user) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, avatarPhotoId: true },
    }),
    prisma.attendance.findMany({
      where: { date: today },
      select: { userId: true, status: true, reasonCode: true, note: true },
    }),
  ]);

  const attendanceByUser = new Map(attendance.map((row) => [row.userId, row]));

  const team: TeamPerson[] = people.map((person) => {
    const mark = attendanceByUser.get(person.id);
    return {
      id: person.id,
      name: person.name,
      photoUrl: person.avatarPhotoId ? `/api/photos/${person.avatarPhotoId}` : null,
      status: mark?.status === "PRESENT" || mark?.status === "ABSENT" ? mark.status : null,
      reasonCode: mark?.reasonCode ?? null,
      note: mark?.note ?? null,
    };
  });

  return (
    <AppShell user={user} backTo={{ href: "/lider", label: t("action.home") }}>
      <div className="screen-head">
        <h1 className="screen-head__title">{t("team.title")}</h1>
        <p className="screen-head__subtitle">{formatLongDay(today, locale)}</p>
      </div>

      <p className="text-small screen-head">{t(user.role === "LEADER" ? "team.ownSubtitle" : "team.subtitle")}</p>

      {team.length === 0 ? (
        <EmptyState icon={<Icon name="team" size={48} />} title={t("team.empty")} />
      ) : (
        <TeamList people={team} date={today} />
      )}
    </AppShell>
  );
}
