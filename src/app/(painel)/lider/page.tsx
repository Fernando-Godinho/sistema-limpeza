import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Icon, type IconName } from "@/components/icon";
import { getTranslate } from "@/i18n/server";
import { GREETING_KEYS } from "@/i18n/translate";
import { greetingKey, todayISO } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { assignmentScope, workerScope } from "@/lib/team";

/**
 * Tela inicial do lider.
 *
 * Uma pergunta e tres caminhos. Nada mais: quem abre o sistema de manha
 * precisa entender em um segundo o que da para fazer aqui.
 *
 * Os numeros sao os da equipe de quem esta logado. O gestor ve o total.
 */
export default async function LeaderHomePage() {
  const user = await requireUser(["LEADER", "ADMIN"]);
  const t = await getTranslate();
  const today = todayISO();

  const [workerCount, attendance, serviceCounts] = await Promise.all([
    prisma.user.count({ where: { active: true, role: "WORKER", ...workerScope(user) } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: {
        date: today,
        user: { role: "WORKER", active: true, ...workerScope(user) },
      },
      _count: { _all: true },
    }),
    prisma.assignment.groupBy({
      by: ["status"],
      where: { date: today, ...assignmentScope(user) },
      _count: { _all: true },
    }),
  ]);

  const present = attendance.find((row) => row.status === "PRESENT")?._count._all ?? 0;
  const marked = attendance.reduce((total, row) => total + row._count._all, 0);
  const servicesTotal = serviceCounts.reduce((total, row) => total + row._count._all, 0);
  const servicesDone = serviceCounts.find((row) => row.status === "DONE")?._count._all ?? 0;

  const actions: Array<{ href: string; label: string; hint: string; icon: IconName }> = [
    {
      href: "/lider/equipe",
      label: t("leader.home.team"),
      hint: t("leader.home.teamHint"),
      icon: "team",
    },
    {
      href: "/lider/distribuir",
      label: t("leader.home.assign"),
      hint: t("leader.home.assignHint"),
      icon: "clipboard",
    },
    {
      href: "/lider/servicos",
      label: t("leader.home.services"),
      hint: t("leader.home.servicesHint"),
      icon: "list",
    },
  ];

  return (
    <AppShell user={user}>
      <div className="screen-head">
        <h1 className="screen-head__title">{t("greeting.leader", { greeting: t(GREETING_KEYS[greetingKey()]) })}</h1>
        <p className="screen-head__subtitle">
          {marked === 0 ? t("leader.home.summaryEmpty") : t("leader.home.summary", { present, total: workerCount })}
        </p>
      </div>

      <div className="btn-stack">
        {actions.map((action) => (
          <Link key={action.href} className="choice choice--big" href={action.href}>
            <Icon name={action.icon} size={40} strokeWidth={2.2} />
            <span className="choice__text">
              {action.label}
              <span className="choice__hint">{action.hint}</span>
            </span>
            <Icon name="forward" size={26} className="btn__icon" />
          </Link>
        ))}
      </div>

      <p className="text-small actions">
        {t("leader.home.servicesToday", { done: servicesDone, total: servicesTotal })}
      </p>

      {user.role === "ADMIN" ? (
        <div className="section">
          <hr className="divider" />
          <Link className="choice" href="/admin">
            <Icon name="settings" size={36} strokeWidth={2.2} />
            <span className="choice__text">
              {t("leader.home.admin")}
              <span className="choice__hint">{t("leader.home.adminHint")}</span>
            </span>
            <Icon name="forward" size={26} className="btn__icon" />
          </Link>
        </div>
      ) : null}

    </AppShell>
  );
}
