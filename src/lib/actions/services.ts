"use server";

import { revalidatePath } from "next/cache";

import { getTranslate } from "@/i18n/server";
import { todayISO } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { LEADER_ROLES, currentUserWithRole } from "@/lib/guard";
import { assignmentScope, workerScope } from "@/lib/team";
import type { SessionUser } from "@/lib/session";

export type ActionResult =
  | { ok: true; message?: string; id?: string; at?: string }
  | { ok: false; message: string };

/*
 * Quem opera o servico e o lider (e o gestor): ele confere o local, confere
 * quem vai fazer, tira a foto do servico pronto, inicia e conclui. O
 * colaborador nao entra no sistema, entao nao existe checagem por colaborador
 * aqui.
 *
 * O lider so trabalha com a propria equipe: toda busca de servico e de pessoa
 * passa pelo filtro do turno dele. Quem garante isso e o servidor, nao a tela.
 */

/**
 * Busca o servico que a pessoa logada pode operar.
 * Devolve o motivo quando nao acha: nao existe, ou e de outra equipe.
 */
async function findServiceFor(
  user: SessionUser,
  assignmentId: string,
): Promise<{ ok: true; service: { id: string; status: string; workerId: string } } | { ok: false; message: string }> {
  const t = await getTranslate();

  const service = await prisma.assignment.findFirst({
    where: { id: assignmentId, ...assignmentScope(user) },
    select: { id: true, status: true, workerId: true },
  });
  if (service) return { ok: true, service };

  const exists = await prisma.assignment.count({ where: { id: assignmentId } });
  return { ok: false, message: exists > 0 ? t("error.notYourService") : t("error.serviceNotFound") };
}

/** Confere se o colaborador escolhido e da equipe de quem esta operando. */
async function findWorkerFor(user: SessionUser, workerId: string) {
  return prisma.user.findFirst({
    where: { id: workerId, active: true, role: "WORKER", ...workerScope(user) },
    select: { id: true, name: true },
  });
}

function revalidateServices() {
  revalidatePath("/lider");
  revalidatePath("/lider/servicos");
}

function revalidateService(id: string) {
  revalidateServices();
  revalidatePath(`/servicos/${id}`);
}

/** O lider monta um servico: um local, uma tarefa e uma pessoa. */
export async function createAssignmentAction(input: {
  date?: string;
  locationId: string;
  taskTypeId: string;
  workerId: string;
}): Promise<ActionResult> {
  const t = await getTranslate();
  const leader = await currentUserWithRole(LEADER_ROLES);
  if (!leader) return { ok: false, message: t("error.noPermission") };

  const [location, taskType, worker] = await Promise.all([
    prisma.location.findFirst({ where: { id: input.locationId, active: true }, select: { id: true, name: true } }),
    prisma.taskType.findFirst({ where: { id: input.taskTypeId, active: true }, select: { id: true, name: true } }),
    findWorkerFor(leader, input.workerId),
  ]);

  if (!worker) {
    const inAnotherTeam =
      leader.role === "LEADER" &&
      (await prisma.user.count({
        where: { id: input.workerId, active: true, role: "WORKER" },
      })) > 0;
    return { ok: false, message: t(inAnotherTeam ? "error.notYourTeam" : "error.chooseAll") };
  }

  if (!location || !taskType) {
    return { ok: false, message: t("error.chooseAll") };
  }

  const date = input.date || todayISO();

  const created = await prisma.assignment.create({
    data: {
      date,
      locationId: location.id,
      taskTypeId: taskType.id,
      workerId: worker.id,
      createdById: leader.id,
      status: "PENDING",
    },
    select: { id: true },
  });

  await prisma.assignmentEvent.create({
    data: { assignmentId: created.id, type: "CREATED", byId: leader.id },
  });

  revalidateServices();

  return {
    ok: true,
    id: created.id,
    message: t("assign.savedBody", {
      task: taskType.name,
      worker: worker.name,
      location: location.name,
    }),
  };
}

/** Inicia o servico: registra a hora em que o trabalho comecou. */
export async function startServiceAction(assignmentId: string): Promise<ActionResult> {
  const t = await getTranslate();
  const leader = await currentUserWithRole(LEADER_ROLES);
  if (!leader) return { ok: false, message: t("error.noPermission") };

  const found = await findServiceFor(leader, assignmentId);
  if (!found.ok) return found;
  const assignment = found.service;
  if (assignment.status !== "PENDING") {
    return { ok: false, message: t("error.serviceAlreadyStarted") };
  }

  const now = new Date();
  await prisma.assignment.update({
    where: { id: assignment.id },
    data: { status: "IN_PROGRESS", startedAt: now },
  });
  await prisma.assignmentEvent.create({
    data: { assignmentId: assignment.id, type: "STARTED", byId: leader.id },
  });

  revalidateService(assignment.id);
  return { ok: true, message: t("flow.startedCheck"), at: now.toISOString() };
}

/**
 * Conclui o servico.
 *
 * A foto do servico pronto e sempre exigida, para qualquer tarefa. A tela
 * bloqueia o botao, mas quem garante o registro completo e o servidor: sem a
 * foto guardada, a conclusao e recusada.
 */
export async function completeServiceAction(assignmentId: string): Promise<ActionResult> {
  const t = await getTranslate();
  const leader = await currentUserWithRole(LEADER_ROLES);
  if (!leader) return { ok: false, message: t("error.noPermission") };

  const found = await findServiceFor(leader, assignmentId);
  if (!found.ok) return found;
  const assignment = found.service;
  if (assignment.status === "PENDING") {
    return { ok: false, message: t("error.serviceNotStarted") };
  }
  if (assignment.status === "DONE") {
    return { ok: true, message: t("finish.doneCheck") };
  }

  const photos = await prisma.photo.count({
    where: { assignmentId: assignment.id, kind: "END" },
  });
  if (photos === 0) {
    return { ok: false, message: t("finish.needPhoto") };
  }

  const now = new Date();
  await prisma.assignment.update({
    where: { id: assignment.id },
    data: { status: "DONE", completedAt: now },
  });
  await prisma.assignmentEvent.create({
    data: { assignmentId: assignment.id, type: "COMPLETED", byId: leader.id },
  });

  revalidateService(assignment.id);
  return { ok: true, message: t("finish.doneCheck"), at: now.toISOString() };
}

/** Cancela o servico. Fica registrado quem cancelou e quando. */
export async function cancelServiceAction(assignmentId: string, reason?: string): Promise<ActionResult> {
  const t = await getTranslate();
  const leader = await currentUserWithRole(LEADER_ROLES);
  if (!leader) return { ok: false, message: t("error.noPermission") };

  const found = await findServiceFor(leader, assignmentId);
  if (!found.ok) return found;
  const assignment = found.service;
  if (assignment.status === "CANCELED") {
    return { ok: true, message: t("service.canceled") };
  }

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      cancelReason: reason ?? null,
    },
  });
  await prisma.assignmentEvent.create({
    data: { assignmentId: assignment.id, type: "CANCELED", byId: leader.id, meta: reason ?? null },
  });

  revalidateService(assignment.id);
  return { ok: true, message: t("service.canceled") };
}

/**
 * Desfaz o cancelamento.
 *
 * O cancelamento e reversivel de proposito: errar o toque nao pode custar o
 * registro de um servico. O servico volta para a lista como "nao comecou".
 */
export async function restoreServiceAction(assignmentId: string): Promise<ActionResult> {
  const t = await getTranslate();
  const leader = await currentUserWithRole(LEADER_ROLES);
  if (!leader) return { ok: false, message: t("error.noPermission") };

  const found = await findServiceFor(leader, assignmentId);
  if (!found.ok) return found;
  const assignment = found.service;
  if (assignment.status !== "CANCELED") {
    return { ok: true, message: t("admin.saved") };
  }

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: { status: "PENDING", canceledAt: null, cancelReason: null },
  });
  await prisma.assignmentEvent.create({
    data: { assignmentId: assignment.id, type: "RESTORED", byId: leader.id },
  });

  revalidateService(assignment.id);
  return { ok: true, message: t("admin.saved") };
}

/** Troca a pessoa responsavel pelo servico. */
export async function reassignServiceAction(assignmentId: string, workerId: string): Promise<ActionResult> {
  const t = await getTranslate();
  const leader = await currentUserWithRole(LEADER_ROLES);
  if (!leader) return { ok: false, message: t("error.noPermission") };

  const worker = await findWorkerFor(leader, workerId);
  if (!worker) {
    const inAnotherTeam =
      leader.role === "LEADER" &&
      (await prisma.user.count({ where: { id: workerId, active: true, role: "WORKER" } })) > 0;
    return { ok: false, message: t(inAnotherTeam ? "error.notYourTeam" : "error.generic") };
  }

  const found = await findServiceFor(leader, assignmentId);
  if (!found.ok) return found;
  const assignment = found.service;

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: { workerId: worker.id },
  });
  await prisma.assignmentEvent.create({
    data: { assignmentId: assignment.id, type: "REASSIGNED", byId: leader.id, meta: worker.name },
  });

  revalidateService(assignment.id);
  return { ok: true, message: t("service.reassigned", { name: worker.name }) };
}
