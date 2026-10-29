"use server";

import { getTranslate } from "@/i18n/server";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/domain";
import { isValidPinFormat } from "@/lib/domain";
import { verifyPin } from "@/lib/pin";
import { endSession, homePathFor, startSession } from "@/lib/session";

export type LoginResult = { ok: true; home: string } | { ok: false; message?: string };

/*
 * Trava simples contra tentativa e erro de PIN.
 *
 * Um PIN de 4 numeros tem poucas combinacoes: sem essa trava, alguem poderia
 * ficar tentando ate acertar. Depois de 5 erros seguidos, a pessoa espera um
 * pouco antes de tentar de novo.
 *
 * A contagem vive na memoria do servidor, entao vale para uma unica instancia.
 * Ao rodar em varias instancias, trocar por um registro no banco.
 */
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 60_000;

const attempts = new Map<string, { count: number; blockedUntil: number }>();

function isBlocked(userId: string): boolean {
  const entry = attempts.get(userId);
  return Boolean(entry && entry.blockedUntil > Date.now());
}

function registerFailure(userId: string): void {
  const entry = attempts.get(userId) ?? { count: 0, blockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_MS;
    entry.count = 0;
  }
  attempts.set(userId, entry);
}

export async function loginAction(userId: string, pin: string): Promise<LoginResult> {
  const t = await getTranslate();

  if (typeof userId !== "string" || userId.length === 0) {
    return { ok: false, message: t("error.generic") };
  }
  if (!isValidPinFormat(pin)) {
    return { ok: false, message: t("error.invalidPin") };
  }
  if (isBlocked(userId)) {
    return { ok: false, message: t("login.pinError") };
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, active: true },
    select: { id: true, pinHash: true, role: true },
  });

  if (!user || !(await verifyPin(pin, user.pinHash))) {
    registerFailure(userId);
    return { ok: false, message: t("login.pinError") };
  }

  attempts.delete(userId);
  await startSession(user.id);
  return { ok: true, home: homePathFor(user.role as Role) };
}

export async function logoutAction(): Promise<{ ok: true }> {
  await endSession();
  return { ok: true };
}
