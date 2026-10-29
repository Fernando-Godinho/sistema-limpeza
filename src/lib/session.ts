import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/db";
import type { Role } from "@/lib/domain";

export const SESSION_COOKIE = "limpeza_sessao";
export const LOCALE_COOKIE = "limpeza_idioma";

// O aparelho e compartilhado por local, entao a sessao dura um turno de
// trabalho. Ninguem e desconectado no meio de uma tarefa: o "Sair" fica
// sempre visivel no alto da tela.
const SESSION_HOURS = 12;

function secret(): string {
  return process.env.SESSION_SECRET ?? "segredo-de-desenvolvimento-nao-use-em-producao";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function createToken(userId: string): string {
  const payload = `${userId}.${Date.now() + SESSION_HOURS * 3_600_000}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresAt, signature] = parts;
  const expected = sign(`${userId}.${expiresAt}`);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  if (Number(expiresAt) < Date.now()) return null;
  return userId;
}

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  locale: string | null;
  avatarPhotoId: string | null;
};

/** Pessoa conectada agora, ou null quando ninguem entrou. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = readToken(token);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, locale: true, active: true, avatarPhotoId: true },
  });
  if (!user || !user.active) return null;

  // Colaborador nao entra no sistema: quem opera o aplicativo e o lider.
  // Tratar como "sem sessao" evita que um colaborador fique preso em uma tela
  // que nao existe mais.
  if (user.role === "WORKER") return null;

  return {
    id: user.id,
    name: user.name,
    role: user.role as Role,
    locale: user.locale,
    avatarPhotoId: user.avatarPhotoId,
  };
});

/** Exige alguem conectado. Sem sessao, abre a tela de entrada. */
export async function requireUser(roles?: readonly Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/entrar");
  if (roles && !roles.includes(user.role)) redirect(homePathFor(user.role));
  return user;
}

/** Tela inicial de cada tipo de usuario. */
export function homePathFor(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "LEADER") return "/lider";
  // Colaborador nao entra no sistema.
  return "/entrar";
}

export async function startSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3_600,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
