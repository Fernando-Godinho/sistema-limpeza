import { AppShell } from "@/components/app-shell";
import { getLocale, getTranslate } from "@/i18n/server";
import { formatLongDay, todayISO } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { workerScope } from "@/lib/team";

import { AssignFlow } from "./assign-flow";

/**
 * Distribuir tarefas, em tres escolhas guiadas.
 *
 * Local, depois tarefa, depois pessoa -- nessa ordem, porque e a ordem em que
 * o lider pensa. Uma pergunta por tela, com a lista inteira a vista.
 *
 * A lista de pessoas e a da equipe de quem esta logado: o lider ve o turno
 * dele, o gestor ve todo mundo.
 */
export default async function AssignPage() {
  const user = await requireUser(["LEADER", "ADMIN"]);
  const t = await getTranslate();
  const locale = await getLocale();
  const today = todayISO();

  const [locations, tasks, workers, attendance] = await Promise.all([
    prisma.location.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
    prisma.taskType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { active: true, role: "WORKER", ...workerScope(user) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, avatarPhotoId: true },
    }),
    prisma.attendance.findMany({
      where: { date: today, status: "PRESENT" },
      select: { userId: true },
    }),
  ]);

  const presentIds = new Set(attendance.map((row) => row.userId));

  return (
    <AppShell user={user} backTo={{ href: "/lider", label: t("action.home") }}>
      <div className="screen-head">
        <h1 className="screen-head__title">{t("assign.title")}</h1>
      </div>

      <AssignFlow
        date={today}
        dayLabel={formatLongDay(today, locale)}
        ownTeam={user.role === "LEADER"}
        locations={locations}
        tasks={tasks}
        workers={workers.map((worker) => ({
          id: worker.id,
          name: worker.name,
          photoUrl: worker.avatarPhotoId ? `/api/photos/${worker.avatarPhotoId}` : null,
          isPresent: presentIds.has(worker.id),
        }))}
      />
    </AppShell>
  );
}
