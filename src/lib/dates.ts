/**
 * Datas do sistema.
 *
 * Todo servico pertence a um "dia" no formato AAAA-MM-DD, calculado no fuso
 * configurado em TZ. Assim o lider e o colaborador enxergam sempre o mesmo dia.
 */

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && toISODate(parsed) === value;
}

export function addDays(iso: string, days: number): string {
  const base = new Date(`${iso}T12:00:00`);
  base.setDate(base.getDate() + days);
  return toISODate(base);
}

/** Diferenca em dias inteiros entre duas datas no formato AAAA-MM-DD. */
export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T12:00:00`).getTime();
  const to = new Date(`${toISO}T12:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** Parte do dia usada na saudacao: morning | afternoon | evening. */
export function greetingKey(now: Date = new Date()): "morning" | "afternoon" | "evening" {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function formatClock(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Ex.: "segunda-feira, 22 de setembro". */
export function formatLongDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${iso}T12:00:00`),
  );
}

/** Ex.: "22/09". */
export function formatShortDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(
    new Date(`${iso}T12:00:00`),
  );
}
