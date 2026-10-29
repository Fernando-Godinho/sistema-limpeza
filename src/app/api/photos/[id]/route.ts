import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { isSafeFileName, readPhotoFile } from "@/lib/storage";

/**
 * Entrega a imagem guardada.
 *
 * A foto so sai daqui para quem esta conectado no sistema. Ela fica fora de
 * /public justamente para que o endereco da imagem, sozinho, nao sirva para
 * ninguem de fora ver o interior dos locais atendidos.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await context.params;
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: {
      fileName: true,
      mimeType: true,
      kind: true,
      assignment: { select: { worker: { select: { leaderId: true } } } },
    },
  });

  if (!photo || !isSafeFileName(photo.fileName)) {
    return new NextResponse(null, { status: 404 });
  }

  // Foto de servico e da equipe que fez o servico. A foto do rosto continua
  // visivel para todos, porque e ela que ajuda a reconhecer as pessoas.
  if (user.role === "LEADER" && photo.kind !== "AVATAR" && photo.assignment?.worker.leaderId !== user.id) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const bytes = await readPhotoFile(photo.fileName);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
