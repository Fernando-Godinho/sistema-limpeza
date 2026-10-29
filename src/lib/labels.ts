import type { MessageKey } from "@/i18n/messages";
import type {
  AbsenceReason,
  AssignmentStatus,
  EventType,
  OccurrenceReason,
  Shift,
} from "@/lib/domain";

/**
 * Nome de cada valor do dominio, escrito em palavras simples.
 *
 * Fica tudo em um lugar so para que a lista de motivos seja exatamente a mesma
 * na tela do lider, na do colaborador e no detalhe do servico.
 */

export const ABSENCE_REASON_KEYS: Record<AbsenceReason, MessageKey> = {
  SICK: "reason.sick",
  VACATION: "reason.vacation",
  JUSTIFIED: "reason.justified",
  DAY_OFF: "reason.dayOff",
  OTHER: "reason.other",
};

export const OCCURRENCE_REASON_KEYS: Record<OccurrenceReason, MessageKey> = {
  MISSING_SUPPLIES: "occurrence.reasonMissingSupplies",
  BROKEN_EQUIPMENT: "occurrence.reasonBrokenEquipment",
  NO_ACCESS: "occurrence.reasonNoAccess",
  EXTRA_WORK: "occurrence.reasonExtraWork",
  OTHER: "occurrence.reasonOther",
};

export const EVENT_KEYS: Record<EventType, MessageKey> = {
  CREATED: "event.created",
  REASSIGNED: "event.reassigned",
  STARTED: "event.started",
  PHOTO_ADDED: "event.photoAdded",
  OCCURRENCE: "event.occurrence",
  COMPLETED: "event.completed",
  CANCELED: "event.canceled",
  RESTORED: "event.restored",
};

export const STATUS_KEYS: Record<AssignmentStatus, MessageKey> = {
  PENDING: "status.pending",
  IN_PROGRESS: "status.inProgress",
  DONE: "status.done",
  CANCELED: "status.canceled",
};

/** Nome do turno em palavras simples. */
export const SHIFT_LABEL_KEYS: Record<Shift, MessageKey> = {
  MORNING: "shift.morning",
  AFTERNOON: "shift.afternoon",
  NIGHT: "shift.night",
};

export function isOccurrenceReasonKey(value: string): value is OccurrenceReason {
  return value in OCCURRENCE_REASON_KEYS;
}

export function isAbsenceReasonKey(value: string): value is AbsenceReason {
  return value in ABSENCE_REASON_KEYS;
}

export function isEventTypeKey(value: string): value is EventType {
  return value in EVENT_KEYS;
}
