/**
 * Valores de dominio do sistema, centralizados em um unico lugar.
 * O SQLite nao aceita enums do Prisma, entao a validacao vive aqui.
 */

export const ROLES = ["ADMIN", "LEADER", "WORKER"] as const;
export type Role = (typeof ROLES)[number];

export const ASSIGNMENT_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "CANCELED",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

/*
 * Turno de trabalho.
 *
 * O turno e o que define a equipe: cada lider responde por um turno e so ve as
 * pessoas do turno dele. Manha, tarde e noite, como a empresa fala no dia a dia.
 */
export const SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"] as const;
export type Shift = (typeof SHIFTS)[number];

export function isShift(value: unknown): value is Shift {
  return typeof value === "string" && (SHIFTS as readonly string[]).includes(value);
}

/**
 * Descobre o turno a partir do horario de trabalho da planilha ("06:00 - 14:20").
 *
 * Quem comeca entre 5h e 9h59 e da manha, entre 10h e 17h59 e da tarde, e o
 * resto (18h em diante ou de madrugada) e da noite. Horario vazio ou fora do
 * formato devolve null, e ai o gestor escolhe o turno na mao.
 */
export function shiftFromWorkSchedule(schedule: string | null | undefined): Shift | null {
  if (!schedule) return null;
  const match = /(\d{1,2})\s*[:;]\s*(\d{2})/.exec(schedule);
  if (!match) return null;

  const hour = Number(match[1]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (hour >= 5 && hour < 10) return "MORNING";
  if (hour >= 10 && hour < 18) return "AFTERNOON";
  return "NIGHT";
}

export const ABSENCE_REASONS = [
  "SICK",
  "VACATION",
  "JUSTIFIED",
  "DAY_OFF",
  "OTHER",
] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

export const OCCURRENCE_REASONS = [
  "MISSING_SUPPLIES",
  "BROKEN_EQUIPMENT",
  "NO_ACCESS",
  "EXTRA_WORK",
  "OTHER",
] as const;
export type OccurrenceReason = (typeof OCCURRENCE_REASONS)[number];

/*
 * Tipos de foto guardadas.
 *
 * "END" e a foto do servico pronto, tirada pelo lider e exigida para concluir.
 * "OCCURRENCE" e a foto de um problema avisado. "AVATAR" e a foto do rosto no
 * cadastro, que ajuda a reconhecer as pessoas na lista.
 */
export const PHOTO_KINDS = ["END", "OCCURRENCE", "AVATAR"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export const EVENT_TYPES = [
  "CREATED",
  "REASSIGNED",
  "STARTED",
  "PHOTO_ADDED",
  "OCCURRENCE",
  "COMPLETED",
  "CANCELED",
  "RESTORED",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * O PIN de entrada tem sempre 4 numeros.
 *
 * Fica aqui, e nao junto do calculo do hash, porque a tela de entrada precisa
 * dessa medida e nao pode carregar codigo do servidor.
 */
export const PIN_LENGTH = 4;

export function isValidPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isAbsenceReason(value: unknown): value is AbsenceReason {
  return typeof value === "string" && (ABSENCE_REASONS as readonly string[]).includes(value);
}

export function isOccurrenceReason(value: unknown): value is OccurrenceReason {
  return typeof value === "string" && (OCCURRENCE_REASONS as readonly string[]).includes(value);
}

export function isPhotoKind(value: unknown): value is PhotoKind {
  return typeof value === "string" && (PHOTO_KINDS as readonly string[]).includes(value);
}

/**
 * Chave de traducao de cada situacao do servico.
 * As cores nunca aparecem sozinhas: sempre acompanhadas do texto e do icone.
 */
export const STATUS_LABEL_KEY: Record<AssignmentStatus, string> = {
  PENDING: "status.pending",
  IN_PROGRESS: "status.inProgress",
  DONE: "status.done",
  CANCELED: "status.canceled",
};
