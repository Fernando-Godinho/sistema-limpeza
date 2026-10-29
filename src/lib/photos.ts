import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { isPhotoKind, type PhotoKind } from "@/lib/domain";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { removePhotoFile, savePhotoFile } from "@/lib/storage";
import { assignmentScope } from "@/lib/team";

export type CreatedPhoto = { id: string; url: string };

export type CreatePhotoResult =
  | { ok: true; photo: CreatedPhoto }
  | { ok: false; message: string };

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function photoUrl(id: string): string {
  return `/api/photos/${id}`;
}

/**
 * Guarda a foto no disco e registra que ela existe.
 *
 * O arquivo e gravado antes do registro no banco: se a gravacao falhar, nada
 * e anotado e a tela mostra o erro, em vez de confirmar um salvamento que nao
 * aconteceu.
 */
export async function createPhoto(options: {
  kind: string;
  assignmentId: string | null;
  targetUserId?: string | null;
  bytes: Buffer;
  mimeType: string;
  size: number;
}): Promise<CreatePhotoResult> {
  // Quem tira as fotos do servico e o lider. Colaborador nao tem sessao.
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "no-session" };
  }

  const extension = EXTENSION_BY_TYPE[options.mimeType];
  if (!extension) {
    return { ok: false, message: "file-type" };
  }
  if (!isPhotoKind(options.kind)) {
    return { ok: false, message: "bad-kind" };
  }
  const kind: PhotoKind = options.kind;

  const assignmentId = await resolveAssignmentId(user, kind, options.assignmentId);
  if (assignmentId === "denied") {
    return { ok: false, message: "denied" };
  }

  const targetUserId = kind === "AVATAR" ? await resolveAvatarTarget(user, options.targetUserId) : null;
  if (kind === "AVATAR" && !targetUserId) {
    return { ok: false, message: "denied" };
  }

  const fileName = `${randomUUID()}.${extension}`;
  await savePhotoFile(fileName, options.bytes);

  try {
    const photo = await prisma.photo.create({
      data: {
        kind,
        fileName,
        mimeType: options.mimeType,
        size: options.size,
        assignmentId,
        uploadedById: user.id,
      },
      select: { id: true, kind: true, assignmentId: true },
    });

    if (photo.assignmentId) {
      await prisma.assignmentEvent.create({
        data: {
          assignmentId: photo.assignmentId,
          type: "PHOTO_ADDED",
          meta: photo.kind,
          byId: user.id,
        },
      });
    }

    if (kind === "AVATAR" && targetUserId) {
      const previous = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { avatarPhotoId: true },
      });

      await prisma.user.update({
        where: { id: targetUserId },
        data: { avatarPhotoId: photo.id },
      });

      // A foto antiga sai do banco e do disco para nao acumular lixo.
      if (previous?.avatarPhotoId) {
        const old = await prisma.photo.findUnique({
          where: { id: previous.avatarPhotoId },
          select: { id: true, fileName: true },
        });
        if (old) {
          await prisma.photo.delete({ where: { id: old.id } });
          await removePhotoFile(old.fileName);
        }
      }
    }

    return { ok: true, photo: { id: photo.id, url: photoUrl(photo.id) } };
  } catch (error) {
    await removePhotoFile(fileName);
    throw error;
  }
}

/**
 * Confere que o servico existe antes de guardar a foto dele.
 *
 * O lider so guarda foto do servico da propria equipe; o gestor, de qualquer um.
 */
async function resolveAssignmentId(
  user: SessionUser,
  kind: PhotoKind,
  assignmentId: string | null,
): Promise<string | null | "denied"> {
  if (kind === "AVATAR") return null;
  if (!assignmentId) return "denied";

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, ...assignmentScope(user) },
    select: { id: true },
  });
  return assignment ? assignment.id : "denied";
}

/** So o gestor troca a foto do rosto de alguem. */
async function resolveAvatarTarget(user: SessionUser, targetUserId: string | null | undefined) {
  if (user.role !== "ADMIN") return null;
  const target = targetUserId ?? user.id;
  const exists = await prisma.user.findUnique({ where: { id: target }, select: { id: true } });
  return exists?.id ?? null;
}
