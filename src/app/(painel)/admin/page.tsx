import Link from "next/link";

import { EmptyState, SummaryRow } from "@/components/display";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/status-badge";
import { getLocale, getTranslate } from "@/i18n/server";
import { formatLongDay, todayISO } from "@/lib/dates";
import { prisma } from "@/lib/db";
import {
  ABSENCE_REASON_KEYS,
  OCCURRENCE_REASON_KEYS,
  isAbsenceReasonKey,
  isOccurrenceReasonKey,
} from "@/lib/labels";

/** Resumo do dia, do ponto de vista do gestor. */
export default async function AdminTodayPage() {
  const t = await getTranslate();
  const locale = await getLocale();
  const today = todayISO();

  const [services, attendance, occurrences, workerCount] = await Promise.all([
    prisma.assignment.findMany({
      where: { date: today },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        status: true,
        location: { select: { name: true } },
        taskType: { select: { name: true } },
        worker: { select: { name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { date: today },
      select: { status: true, reasonCode: true, user: { select: { name: true } } },
    }),
    prisma.occurrence.findMany({
      where: { createdAt: { gte: new Date(`${today}T00:00:00`) } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reasonCode: true,
        note: true,
        by: { select: { name: true } },
        assignment: { select: { id: true, taskType: { select: { name: true } } } },
      },
    }),
    prisma.user.count({ where: { active: true, role: "WORKER" } }),
  ]);

  const present = attendance.filter((row) => row.status === "PRESENT").length;
  const absent = attendance.filter((row) => row.status === "ABSENT");
  const done = services.filter((service) => service.status === "DONE").length;

  return (
    <div className="stack stack--loose">
      <div className="card">
        <h2 className="card__title">{formatLongDay(today, locale)}</h2>
        <div className="summary">
          <SummaryRow label={t("team.title")} value={t("team.presentOf", { present, total: workerCount })} />
          <SummaryRow
            label={t("services.title")}
            value={t("services.doneOf", { done, total: services.length })}
          />
        </div>
      </div>

      {absent.length > 0 ? (
        <section>
          <h2 className="list__heading">{t("team.absentList")}</h2>
          <div className="list">
            {absent.map((row) => (
              <div className="card card--tight" key={row.user.name}>
                <p className="summary__value">
                  <span translate="no">{row.user.name}</span>
                </p>
                <p className="text-small">
                  {row.reasonCode && isAbsenceReasonKey(row.reasonCode)
                    ? t(ABSENCE_REASON_KEYS[row.reasonCode])
                    : t("reason.other")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="list__heading">{t("occurrence.title")}</h2>
        {occurrences.length === 0 ? (
          <p className="text-small">{t("admin.none")}</p>
        ) : (
          <div className="list">
            {occurrences.map((occurrence) => (
              <div className="card card--tight" key={occurrence.id}>
                <p className="summary__value">
                  <span translate="no">{occurrence.assignment?.taskType.name ?? ""}</span>
                </p>
                <p>
                  {isOccurrenceReasonKey(occurrence.reasonCode)
                    ? t(OCCURRENCE_REASON_KEYS[occurrence.reasonCode])
                    : occurrence.reasonCode}
                </p>
                {occurrence.note ? <p translate="no">{occurrence.note}</p> : null}
                <p className="text-small">
                  {t("occurrence.reportedBy")}: <span translate="no">{occurrence.by?.name ?? ""}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="list__heading">{t("services.title")}</h2>
        {services.length === 0 ? (
          <EmptyState icon={<Icon name="list" size={48} />} title={t("services.empty")} />
        ) : (
          <div className="list">
            {services.map((service) => (
              <Link className="choice" href={`/servicos/${service.id}`} key={service.id}>
                <span className="choice__text">
                  <span translate="no">{service.taskType.name}</span>
                  <span className="choice__hint">
                    <span translate="no">{service.location.name}</span>
                    {" · "}
                    {t("services.workerLine", { name: service.worker.name })}
                  </span>
                </span>
                <StatusBadge status={service.status as "PENDING"} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
