"use server";

import { revalidatePath } from "next/cache";

import { getTranslate } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { isOccurrenceReason } from "@/lib/domain";
import { LEADER_ROLES, currentUserWithRole } from "@/lib/guard";
import { assignmentScope } from "@/lib/team";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

/**
 * Avisa um problema.
 *
 * O motivo vem de uma lista e a explicacao e opcional, para que avisar
 * rapidamente nao dependa de saber escrever bem.
 */
export async function reportOccurrenceAction(input: {
  assignmentId?: string | null;
  reasonCode: string;
  note?: string | null;
  photoId?: string | null;
}): Promise<ActionResult> {
  const t = await getTranslate();
  const leader = await currentUserWithRole(LEADER_ROLES);
  if (!leader) return { ok: false, message: t("error.noPermission") };

  if (!isOccurrenceReason(input.reasonCode)) {
    return { ok: false, message: t("error.generic") };
  }

  let assignmentId: string | null = null;
  if (input.assignmentId) {
    const assignment = await prisma.assignment.findFirst({
      where: { id: input.assignmentId, ...assignmentScope(leader) },
      select: { id: true },
    });
    if (!assignment) {
      const exists = await prisma.assignment.count({ where: { id: input.assignmentId } });
      return { ok: false, message: t(exists > 0 ? "error.notYourService" : "error.serviceNotFound") };
    }
    assignmentId = assignment.id;
  }

  await prisma.occurrence.create({
    data: {
      assignmentId,
      byId: leader.id,
      reasonCode: input.reasonCode,
      note: input.note?.trim() ? input.note.trim() : null,
      photoId: input.photoId ?? null,
    },
  });

  if (assignmentId) {
    await prisma.assignmentEvent.create({
      data: {
        assignmentId,
        type: "OCCURRENCE",
        meta: input.reasonCode,
        byId: leader.id,
      },
    });
    revalidatePath(`/servicos/${assignmentId}`);
  }

  revalidatePath("/lider");
  revalidatePath("/lider/servicos");

  return { ok: true, message: t("occurrence.sent") };
}
