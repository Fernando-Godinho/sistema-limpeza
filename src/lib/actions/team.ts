"use server";

import { revalidatePath } from "next/cache";

import { getTranslate } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { todayISO } from "@/lib/dates";
import { isAbsenceReason, type AbsenceReason, type AttendanceStatus } from "@/lib/domain";
import { LEADER_ROLES, currentUserWithRole } from "@/lib/guard";
import { workerScope } from "@/lib/team";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

/**
 * Marca uma pessoa como presente ou ausente no dia.
 *
 * Quando a pessoa esta ausente, o motivo vem de uma lista e a observacao e
 * opcional -- o lider nunca precisa escrever texto para registrar uma falta.
 */
export async function markAttendanceAction(input: {
  date: string;
  userId: string;
  status: AttendanceStatus;
  reasonCode?: string | null;
  note?: string | null;
}): Promise<ActionResult> {
  const t = await getTranslate();
  const marker = await currentUserWithRole(LEADER_ROLES);
  if (!marker) return { ok: false, message: t("error.noPermission") };

  if (input.status !== "PRESENT" && input.status !== "ABSENT") {
    return { ok: false, message: t("error.generic") };
  }

  const person = await prisma.user.findFirst({
    where: { id: input.userId, active: true, ...workerScope(marker) },
    select: { id: true, name: true },
  });
  if (!person) {
    const inAnotherTeam =
      marker.role === "LEADER" &&
      (await prisma.user.count({ where: { id: input.userId, active: true, role: "WORKER" } })) > 0;
    return { ok: false, message: t(inAnotherTeam ? "error.notYourTeam" : "error.generic") };
  }

  const date = input.date || todayISO();
  const isAbsent = input.status === "ABSENT";
  const reasonCode: AbsenceReason | null =
    isAbsent && isAbsenceReason(input.reasonCode) ? input.reasonCode : isAbsent ? "OTHER" : null;

  await prisma.attendance.upsert({
    where: { date_userId: { date, userId: person.id } },
    create: {
      date,
      userId: person.id,
      status: input.status,
      reasonCode,
      note: input.note?.trim() ? input.note.trim() : null,
      markedById: marker.id,
    },
    update: {
      status: input.status,
      reasonCode,
      note: input.note?.trim() ? input.note.trim() : null,
      markedById: marker.id,
    },
  });

  revalidatePath("/lider");
  revalidatePath("/lider/equipe");

  return {
    ok: true,
    message: isAbsent
      ? t("team.markedAbsent", { name: person.name })
      : t("team.markedPresent", { name: person.name }),
  };
}
