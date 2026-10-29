import type { Role } from "@/lib/domain";
import { getSessionUser, type SessionUser } from "@/lib/session";

/**
 * Confere se quem esta pedindo a acao tem o direito de fazer isso.
 * Devolve null quando nao tem, e quem e quando tem.
 */
export async function currentUserWithRole(roles: readonly Role[]): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (!roles.includes(user.role)) return null;
  return user;
}

export const LEADER_ROLES: readonly Role[] = ["LEADER", "ADMIN"];
