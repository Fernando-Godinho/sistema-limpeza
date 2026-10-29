import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getLocale, getTranslate } from "@/i18n/server";
import { formatLongDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import type { AssignmentStatus } from "@/lib/domain";
import { requireUser } from "@/lib/session";
import { workerScope } from "@/lib/team";

import { ServiceWorkspace } from "./service-workspace";

/**
 * A tela do servico, do lado de quem opera: o lider.
 *
 * E aqui que o servico acontece do comeco ao fim. O lider confere o local,
 * confere quem vai fazer, inicia, tira a foto do servico pronto e conclui.
 * Quando o servico ja terminou, a mesma tela vira o registro: fotos, horarios
 * e o que aconteceu.
 *
 * Nao ha uma segunda tela para o mesmo servico: quem esta no meio do trabalho
 * nao deveria precisar procurar em outro lugar.
 */
export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["LEADER", "ADMIN"]);
  const t = await getTranslate();
  const locale = await getLocale();
  const { id } = await params;

  const service = await prisma.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      date: true,
      status: true,
      startedAt: true,
      completedAt: true,
      location: { select: { name: true, address: true } },
      taskType: { select: { name: true } },
      worker: { select: { id: true, name: true, avatarPhotoId: true, leaderId: true } },
      photos: {
        where: { kind: "END" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true },
      },
      events: {
        orderBy: { createdAt: "asc" },
        select: { id: true, type: true, meta: true, createdAt: true, by: { select: { name: true } } },
      },
      occurrences: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reasonCode: true, note: true, createdAt: true, by: { select: { name: true } } },
      },
    },
  });

  if (!service) notFound();

  // Servico de outra equipe nao existe para o lider deste turno.
  if (user.role === "LEADER" && service.worker.leaderId !== user.id) notFound();

  const workers = await prisma.user.findMany({
    where: { active: true, role: "WORKER", ...workerScope(user) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, avatarPhotoId: true },
  });

  const endPhoto = service.photos[0];

  return (
    <AppShell user={user} backTo={{ href: "/lider/servicos", label: t("service.backToList") }}>
      <div className="screen-head">
        <h1 className="screen-head__title" translate="no">
          {service.taskType.name}
        </h1>
        <p className="screen-head__subtitle">{formatLongDay(service.date, locale)}</p>
        <p>
          <StatusBadge status={service.status as AssignmentStatus} />
        </p>
      </div>

      <ServiceWorkspace
        assignmentId={service.id}
        taskName={service.taskType.name}
        locationName={service.location.name}
        locationAddress={service.location.address}
        worker={{
          id: service.worker.id,
          name: service.worker.name,
          photoUrl: service.worker.avatarPhotoId ? `/api/photos/${service.worker.avatarPhotoId}` : null,
        }}
        workers={workers.map((worker) => ({
          id: worker.id,
          name: worker.name,
          photoUrl: worker.avatarPhotoId ? `/api/photos/${worker.avatarPhotoId}` : null,
        }))}
        status={service.status as AssignmentStatus}
        startedAt={service.startedAt?.toISOString() ?? null}
        completedAt={service.completedAt?.toISOString() ?? null}
        photo={endPhoto ? { id: endPhoto.id, url: `/api/photos/${endPhoto.id}` } : null}
        history={service.events.map((event) => ({
          id: event.id,
          type: event.type,
          meta: event.meta,
          at: event.createdAt.toISOString(),
          by: event.by?.name ?? null,
        }))}
        occurrences={service.occurrences.map((occurrence) => ({
          id: occurrence.id,
          reasonCode: occurrence.reasonCode,
          note: occurrence.note,
          at: occurrence.createdAt.toISOString(),
          by: occurrence.by?.name ?? null,
        }))}
      />
    </AppShell>
  );
}
