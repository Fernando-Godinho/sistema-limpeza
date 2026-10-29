import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getTranslate } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { assignmentScope } from "@/lib/team";

import { OccurrenceForm } from "./occurrence-form";

/**
 * Avisar um problema em um servico.
 *
 * O motivo e escolhido em uma lista de botoes grandes e a explicacao e
 * opcional, para que avisar rapidamente nao dependa de saber escrever bem.
 * Quem avisa e o lider, que esta com o aparelho na mao.
 */
export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["LEADER", "ADMIN"]);
  const t = await getTranslate();
  const { id } = await params;

  const service = await prisma.assignment.findFirst({
    where: { id, ...assignmentScope(user) },
    select: {
      id: true,
      location: { select: { name: true } },
      taskType: { select: { name: true } },
    },
  });

  if (!service) notFound();

  return (
    <AppShell user={user} backTo={{ href: `/servicos/${service.id}`, label: t("service.title") }}>
      <OccurrenceForm
        assignmentId={service.id}
        taskName={service.taskType.name}
        locationName={service.location.name}
      />
    </AppShell>
  );
}
