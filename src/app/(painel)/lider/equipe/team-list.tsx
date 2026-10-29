"use client";

import { useState } from "react";

import { Alert, Avatar } from "@/components/display";
import { Icon } from "@/components/icon";
import { LiveRegion, Modal } from "@/components/modal";
import { useTranslate } from "@/i18n/client";
import { ABSENCE_REASONS, type AbsenceReason, type AttendanceStatus } from "@/lib/domain";
import { markAttendanceAction } from "@/lib/actions/team";
import { ABSENCE_REASON_KEYS, isAbsenceReasonKey } from "@/lib/labels";

export type TeamPerson = {
  id: string;
  name: string;
  photoUrl: string | null;
  status: AttendanceStatus | null;
  reasonCode: string | null;
  note: string | null;
};

export function TeamList({ people, date }: { people: TeamPerson[]; date: string }) {
  const t = useTranslate();
  const [marks, setMarks] = useState<Record<string, AttendanceStatus | null>>(
    Object.fromEntries(people.map((person) => [person.id, person.status])),
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [absentFor, setAbsentFor] = useState<TeamPerson | null>(null);

  const presentCount = people.filter((person) => marks[person.id] === "PRESENT").length;

  async function mark(person: TeamPerson, status: AttendanceStatus, reasonCode?: AbsenceReason, note?: string) {
    setPendingId(person.id);
    setError(null);
    const previous = marks[person.id];
    // A tela responde na hora; se o servidor recusar, voltamos ao que era.
    setMarks((old) => ({ ...old, [person.id]: status }));

    try {
      const result = await markAttendanceAction({
        date,
        userId: person.id,
        status,
        reasonCode: reasonCode ?? null,
        note: note ?? null,
      });

      if (!result.ok) {
        setMarks((old) => ({ ...old, [person.id]: previous }));
        setError(result.message ?? t("error.generic"));
        return;
      }
      if (result.message) setAnnouncement(result.message);
    } catch {
      setMarks((old) => ({ ...old, [person.id]: previous }));
      setError(navigator.onLine ? t("error.generic") : t("error.offline"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <LiveRegion message={announcement} />

      <p className="text-small mb">
        {t("team.presentOf", { present: presentCount, total: people.length })}
      </p>

      {error ? (
        <div className="mb">
          <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
            {error}
          </Alert>
        </div>
      ) : null}

      <div className="list">
        {people.map((person) => {
          const status = marks[person.id] ?? null;
          const busy = pendingId === person.id;
          const reasonText =
            status === "ABSENT" && person.reasonCode && isAbsenceReasonKey(person.reasonCode)
              ? t(ABSENCE_REASON_KEYS[person.reasonCode])
              : null;

          return (
            <div className="person-row" key={person.id}>
              <div className="person-row__head">
                <Avatar name={person.name} photoUrl={person.photoUrl} />
                <span className="person-row__name" translate="no">
                  {person.name}
                </span>
              </div>

              <p className="text-small">
                {status === "PRESENT" ? (
                  <span className="choice__mark">
                    <Icon name="check-circle" size={24} />
                    {t("team.present")}
                  </span>
                ) : status === "ABSENT" ? (
                  <span className="choice__mark">
                    <Icon name="alert" size={24} />
                    {t("team.absent")}
                    {reasonText ? ` · ${reasonText}` : ""}
                  </span>
                ) : null}
              </p>

              <div className="choice-pair">
                <button
                  type="button"
                  className={`btn ${status === "PRESENT" ? "btn--success" : "btn--quiet"}`}
                  onClick={() => mark(person, "PRESENT")}
                  disabled={busy}
                  aria-pressed={status === "PRESENT"}
                >
                  <Icon name="check" className="btn__icon" strokeWidth={3} />
                  {t("team.present")}
                </button>
                <button
                  type="button"
                  className={`btn ${status === "ABSENT" ? "btn--danger" : "btn--quiet"}`}
                  onClick={() => setAbsentFor(person)}
                  disabled={busy}
                  aria-pressed={status === "ABSENT"}
                >
                  <Icon name="close" className="btn__icon" strokeWidth={3} />
                  {t("team.absent")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {absentFor ? (
        <AbsentDialog
          person={absentFor}
          onClose={() => setAbsentFor(null)}
          onSave={async (reason, note) => {
            await mark(absentFor, "ABSENT", reason, note);
            setAbsentFor(null);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Motivo da ausencia.
 *
 * Sempre por escolha, nunca digitando: a pessoa toca no motivo e, se quiser,
 * acrescenta uma observacao. O botao de salvar fica no fim, sozinho.
 */
function AbsentDialog({
  person,
  onClose,
  onSave,
}: {
  person: TeamPerson;
  onClose: () => void;
  onSave: (reason: AbsenceReason, note: string) => Promise<void>;
}) {
  const t = useTranslate();
  const [reason, setReason] = useState<AbsenceReason | null>(null);
  const [note, setNote] = useState(person.note ?? "");
  const [saving, setSaving] = useState(false);
  const [needsReason, setNeedsReason] = useState(false);

  async function handleSave() {
    if (!reason) {
      setNeedsReason(true);
      return;
    }
    setSaving(true);
    await onSave(reason, note);
    setSaving(false);
  }

  return (
    <Modal open onClose={onClose} title={t("team.absentTitle", { name: person.name })}>
      <p className="dialog__text">{t("team.absentSubtitle")}</p>

      {needsReason ? (
        <Alert tone="warning" icon={<Icon name="alert" size={28} />}>
          {t("error.missingField", { field: t("team.reasonLabel") })}
        </Alert>
      ) : null}

      <div className="choice-stack">
        {ABSENCE_REASONS.map((code) => (
          <button
            key={code}
            type="button"
            className="choice"
            aria-pressed={reason === code}
            onClick={() => {
              setReason(code);
              setNeedsReason(false);
            }}
          >
            <span className="choice__text">{t(ABSENCE_REASON_KEYS[code])}</span>
            {reason === code ? <Icon name="check" size={28} strokeWidth={3} /> : null}
          </button>
        ))}
      </div>

      <div className="field mt-sm">
        <label className="field__label" htmlFor="nota-ausencia">
          {t("team.note")}
        </label>
        <textarea
          id="nota-ausencia"
          className="textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("team.notePlaceholder")}
          rows={3}
        />
      </div>

      <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
        <Icon name="check" className="btn__icon" strokeWidth={3} />
        {saving ? t("action.loading") : t("team.saveAbsent")}
      </button>
    </Modal>
  );
}
