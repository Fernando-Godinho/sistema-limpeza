import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Guarda as fotos no disco da propria maquina.
 *
 * As fotos ficam fora de /public de proposito: elas sao servidas por uma rota
 * autenticada, para que ninguem de fora consiga ver as imagens dos locais.
 */

export function storageDir(): string {
  const configured = process.env.STORAGE_DIR;

  // So aceitamos caminho absoluto vindo do ambiente: caminho relativo mudaria
  // de lugar dependendo da pasta de onde o sistema foi iniciado. Sem
  // configuracao, usamos a pasta "storage" ao lado do projeto.
  if (configured && path.isAbsolute(configured)) {
    return configured;
  }
  return path.join(process.cwd(), "storage");
}

export function photosDir(): string {
  return path.join(storageDir(), "photos");
}

/**
 * Nome de arquivo seguro: aceita apenas caracteres simples, sem barras,
 * para que o nome vindo do banco nunca escape da pasta de fotos.
 */
export function isSafeFileName(fileName: string): boolean {
  return /^[A-Za-z0-9._-]{1,120}$/.test(fileName) && !fileName.startsWith(".");
}

export function photoPath(fileName: string): string {
  if (!isSafeFileName(fileName)) {
    throw new Error("Nome de arquivo de foto invalido.");
  }
  return path.join(photosDir(), fileName);
}

export async function savePhotoFile(fileName: string, data: Buffer): Promise<void> {
  await mkdir(photosDir(), { recursive: true });
  await writeFile(photoPath(fileName), data);
}

export async function readPhotoFile(fileName: string): Promise<Buffer> {
  return readFile(photoPath(fileName));
}

export async function removePhotoFile(fileName: string): Promise<void> {
  try {
    await unlink(photoPath(fileName));
  } catch {
    // A foto pode ja ter sido removida do disco; nao e motivo para falhar.
  }
}

/** Apaga todas as fotos guardadas. Usado ao recomecar com dados de exemplo. */
export async function clearPhotosDir(): Promise<void> {
  const { rm } = await import("node:fs/promises");
  await rm(photosDir(), { recursive: true, force: true });
}
