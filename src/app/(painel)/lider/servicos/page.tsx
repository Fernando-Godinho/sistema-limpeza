import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/display";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/status-badge";
import { getLocale, getTranslate } from "@/i18n/server";
import { addDays, formatLongDay, isValidISODate, todayISO } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { assignmentScope } from "@/lib/team";

/**
 * Servicos do dia.
 *
 * Agrupados por situacao, com o nome escrito e o desenho do lado: quem nao
 * distingue cores continua entendendo o que ja foi feito e o que falta.
 * O lider ve os servicos da equipe dele; o gestor ve todos.
 */
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const user = await requireUser(["LEADER", "ADMIN"]);
  const t = await getTranslate();
  const locale = await getLocale();

  const params = await searchParams;
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const date = isValidISODate(params.dia) ? params.dia : today;

  const services = await prisma.assignment.findMany({
    where: { date, ...assignmentScope(user) },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      location: { select: { name: true } },
      taskType: { select: { name: true } },
      worker: { select: { name: true } },
      occurrences: { select: { id: true } },
    },
  });

  const groups = [
    { status: "PENDING" as const, title: t("services.groupPending") },
    { status: "IN_PROGRESS" as const, title: t("services.groupInProgress") },
    { status: "DONE" as const, title: t("services.groupDone") },
    { status: "CANCELED" as const, title: t("services.groupCanceled") },
  ].map((group) => ({ ...group, items: services.filter((service) => service.status === group.status) }));

  const done = groups.find((group) => group.status === "DONE")?.items.length ?? 0;

  return (
    <AppShell user={user} backTo={{ href: "/lider", label: t("action.home") }}>
      <div className="screen-head">
        <h1 className="screen-head__title">{t("services.title")}</h1>
        <p className="screen-head__subtitle">{t("services.day", { day: formatLongDay(date, locale) })}</p>
      </div>

      <div className="btn-row mb">
        <Link
          className={`btn btn--small ${date === today ? "btn--primary" : "btn--quiet"}`}
          href="/lider/servicos"
        >
          {t("services.filterToday")}
        </Link>
        <Link
          className={`btn btn--small ${date === tomorrow ? "btn--primary" : "btn--quiet"}`}
          href={`/lider/servicos?dia=${tomorrow}`}
        >
          {t("services.filterTomorrow")}
        </Link>
      </div>

      <form method="get" className="field">
        <label className="field__label" htmlFor="dia">
          {t("services.pickDay")}
        </label>
        <input className="input" type="date" id="dia" name="dia" defaultValue={date} />
        <button type="submit" className="btn btn--quiet">
          <Icon name="calendar" className="btn__icon" />
          {t("services.filterChoose")}
        </button>
      </form>

      <p className="text-small mb">
        {t("services.doneOf", { done, total: services.length })}
      </p>

      {services.length === 0 ? (
        <EmptyState
          icon={<Icon name="list" size={48} />}
          title={t("services.empty")}
          text={t("services.emptyHint")}
        />
      ) : null}

      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.status}>
            <h2 className="list__heading">{group.title}</h2>
            <div className="list">
              {group.items.map((service) => (
                <Link key={service.id} className="choice" href={`/servicos/${service.id}`}>
                  <Icon name="pin" size={32} strokeWidth={2.2} />
                  <span className="choice__text">
                    <span translate="no">{service.taskType.name}</span>
                    <span className="choice__hint">
                      <span translate="no">{service.location.name}</span>
                      {" · "}
                      {t("services.workerLine", { name: service.worker.name })}
                    </span>
                    {service.occurrences.length > 0 ? (
                      <span className="choice__hint">
                        <Icon name="alert" size={20} /> {t("occurrence.title")}
                      </span>
                    ) : null}
                  </span>
                  <StatusBadge status={service.status as "PENDING"} />
                </Link>
              ))}
            </div>
          </section>
        ),
      )}
    </AppShell>
  );
}
