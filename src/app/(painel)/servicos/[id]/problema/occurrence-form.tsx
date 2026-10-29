"use client";

import Link from "next/link";
import { useState } from "react";

import { Alert } from "@/components/display";
import { Icon } from "@/components/icon";
import { LiveRegion } from "@/components/modal";
import { PhotoCapture, type SavedPhoto } from "@/components/photo-capture";
import { useTranslate } from "@/i18n/client";
import { reportOccurrenceAction } from "@/lib/actions/occurrences";
import { OCCURRENCE_REASONS, type OccurrenceReason } from "@/lib/domain";
import { OCCURRENCE_REASON_KEYS } from "@/lib/labels";

export function OccurrenceForm({
  assignmentId,
  taskName,
  locationName,
}: {
  assignmentId: string;
  taskName: string;
  locationName: string;
}) {
  const t = useTranslate();
  const [reason, setReason] = useState<OccurrenceReason | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<SavedPhoto | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!reason) {
      setError(t("error.missingField", { field: t("team.reasonLabel") }));
      return;
    }

    setPending(true);
    setError(null);
    try {
      const result = await reportOccurrenceAction({
        assignmentId,
        reasonCode: reason,
        note: note.trim() || null,
        photoId: photo?.id ?? null,
      });

      if (!result.ok) {
        setError(result.message ?? t("error.generic"));
        return;
      }
      if (result.message) setAnnouncement(result.message);
      setSent(true);
    } catch {
      // A escolha, o texto e a foto continuam na tela para tentar de novo.
      setError(navigator.onLine ? t("error.generic") : t("error.offline"));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="stack stack--loose">
        <LiveRegion message={announcement} />
        <div className="cheer">
          <span className="cheer__mark">
            <Icon name="check" size={54} strokeWidth={3} />
          </span>
          <p className="cheer__title">{t("occurrence.sent")}</p>
          <p className="cheer__text">{t("occurrence.sentBody")}</p>
        </div>
        <div className="btn-stack">
          <Link className="btn btn--primary" href={`/servicos/${assignmentId}`}>
            <Icon name="forward" className="btn__icon" />
            {t("action.continue")}
          </Link>
          <Link className="btn btn--quiet" href="/lider/servicos">
            <Icon name="list" className="btn__icon" />
            {t("service.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="screen-head">
        <h1 className="screen-head__title">{t("occurrence.title")}</h1>
        <p className="screen-head__subtitle">{t("occurrence.subtitle")}</p>
      </div>

      <Alert tone="info" icon={<Icon name="info" size={28} />}>
        <span translate="no">{taskName}</span>
        {" · "}
        <span translate="no">{locationName}</span>
      </Alert>

      {error ? (
        <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
          {error}
        </Alert>
      ) : null}

      <div className="choice-stack">
        {OCCURRENCE_REASONS.map((code) => (
          <button
            key={code}
            type="button"
            className="choice"
            aria-pressed={reason === code}
            onClick={() => {
              setReason(code);
              setError(null);
            }}
          >
            <span className="choice__text">{t(OCCURRENCE_REASON_KEYS[code])}</span>
            {reason === code ? <Icon name="check" size={28} strokeWidth={3} /> : null}
          </button>
        ))}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="ocorrencia-nota">
          {t("occurrence.note")}
        </label>
        <textarea
          id="ocorrencia-nota"
          className="textarea"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("occurrence.notePlaceholder")}
          rows={3}
        />
      </div>

      {showPhoto ? (
        <PhotoCapture
          kind="OCCURRENCE"
          assignmentId={assignmentId}
          initialPhoto={photo}
          onSaved={setPhoto}
        />
      ) : (
        <button type="button" className="btn btn--quiet" onClick={() => setShowPhoto(true)}>
          <Icon name="camera" className="btn__icon" />
          {t("photo.take")}
        </button>
      )}

      <div className="btn-stack actions">
        <button type="button" className="btn btn--primary" onClick={send} disabled={pending}>
          <Icon name="alert" className="btn__icon" />
          {pending ? t("occurrence.sending") : t("occurrence.send")}
        </button>
        <Link className="btn btn--quiet" href={`/servicos/${assignmentId}`}>
          <Icon name="back" className="btn__icon" />
          {t("action.back")}
        </Link>
      </div>
    </div>
  );
}
