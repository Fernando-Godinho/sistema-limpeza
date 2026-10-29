import "server-only";

import { prisma } from "@/lib/db";
import type { Shift } from "@/lib/domain";
import type { SessionUser } from "@/lib/session";

/**
 * Equipe de cada lider.
 *
 * Cada pessoa pertence a um lider, e cada lider responde por um turno. O lider
 * so ve e so mexe na propria equipe; o gestor ve todo mundo. O filtro fica aqui,
 * em um lugar so, para que toda tela e toda acao usem exatamente a mesma regra.
 */

/** Filtro de colaboradores que a pessoa pode ver. */
export function workerScope(user: SessionUser): { leaderId?: string } {
  return user.role === "LEADER" ? { leaderId: user.id } : {};
}

/** Filtro de servicos que a pessoa pode ver: os da propria equipe. */
export function assignmentScope(user: SessionUser): { worker: { leaderId: string } } | Record<string, never> {
  return user.role === "LEADER" ? { worker: { leaderId: user.id } } : {};
}

/** Lider de um turno. E o que o cadastro usa ao escolher o turno da pessoa. */
export async function leaderOfShift(shift: Shift): Promise<{ id: string; name: string } | null> {
  return prisma.user.findFirst({
    where: { role: "LEADER", shift, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
