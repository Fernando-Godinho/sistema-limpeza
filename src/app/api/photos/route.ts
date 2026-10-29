import { NextResponse } from "next/server";

import { createPhoto } from "@/lib/photos";
import { getSessionUser } from "@/lib/session";

/**
 * Recebimento das fotos.
 *
 * Fica em uma rota propria (e nao em uma acao de servidor) porque o envio
 * precisa avisar o andamento para a tela: "Enviando foto..." enquanto sobe e
 * "Foto salva" somente depois que o servidor confirma que guardou.
 */

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB: da conta de uma foto de celular comum
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  // Sem sessao, nem lemos o corpo do pedido.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "no-session" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "upload-error" }, { status: 400 });
  }

  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const assignmentIdRaw = form.get("assignmentId");
  const targetUserRaw = form.get("targetUserId");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "missing-file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, message: "file-too-big" }, { status: 413 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, message: "file-type" }, { status: 415 });
  }

  try {
    const photo = await createPhoto({
      kind,
      assignmentId: assignmentIdRaw ? String(assignmentIdRaw) : null,
      targetUserId: targetUserRaw ? String(targetUserRaw) : null,
      bytes: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      size: file.size,
    });

    if (!photo.ok) {
      return NextResponse.json({ ok: false, message: photo.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, photo: photo.photo }, { status: 201 });
  } catch {
    // Nunca responder "salvo" quando algo deu errado: a tela depende disso
    // para nao enganar quem esta no meio do servico.
    return NextResponse.json({ ok: false, message: "upload-error" }, { status: 500 });
  }
}
