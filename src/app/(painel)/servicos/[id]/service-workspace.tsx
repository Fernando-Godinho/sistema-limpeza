"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, Avatar, SummaryRow } from "@/components/display";
import { Icon } from "@/components/icon";
import { ConfirmDialog, LiveRegion, Modal } from "@/components/modal";
import { PhotoCapture, type SavedPhoto } from "@/components/photo-capture";
import { Steps } from "@/components/steps";
import { useLocale, useTranslate } from "@/i18n/client";
import {
  cancelServiceAction,
  completeServiceAction,
  reassignServiceAction,
  restoreServiceAction,
  startServiceAction,
} from "@/lib/actions/services";
import { formatClock } from "@/lib/dates";
import type { AssignmentStatus } from "@/lib/domain";
import { OCCURRENCE_REASON_KEYS, isOccurrenceReasonKey } from "@/lib/labels";

import { ServiceHistory } from "./service-history";

/* ---------------------------------------------------------------------------
 * O servico, do lado de quem opera: o lider.
 *
 * Um passo por tela, com uma acao principal:
 *   antes de comecar  ->  confere o local, confere quem faz, inicia
 *   em andamento      ->  tira a foto do servico pronto, conclui
 *   depois de pronto  ->  vira registro (fotos, horarios, historico)
 *
 * As acoes de arrumar o servico (trocar a pessoa, cancelar) ficam no fim da
 * tela, depois do registro, para nao competir com o passo do momento.
 * O passo atual mora no estado da tela, e nao na URL: se a conexao oscilar no
 * meio, o lider continua exatamente onde estava.
 * ------------------------------------------------------------------------- */

type Phase = "startLocation" | "startWorker" | "startConfirm" | "started" | "running" | "finishConfirm" | "finished";

type Person = { id: string; name: string; photoUrl: string | null };

type HistoryEntry = { id: string; type: string; meta: string | null; at: string; by: string | null };
type OccurrenceEntry = { id: string; reasonCode: string; note: string | null; at: string; by: string | null };

const START_TOTAL = 3;
const FINISH_TOTAL = 2;

export function ServiceWorkspace({
  assignmentId,
  taskName,
  locationName,
  locationAddress,
  worker,
  workers,
  status,
  startedAt,
  completedAt,
  photo,
  history,
  occurrences,
}: {
  assignmentId: string;
  taskName: string;
  locationName: string;
  locationAddress: string | null;
  worker: Person;
  workers: Person[];
  status: AssignmentStatus;
  startedAt: string | null;
  completedAt: string | null;
  photo: SavedPhoto | null;
  history: HistoryEntry[];
  occurrences: OccurrenceEntry[];
}) {
  const t = useTranslate();
  const locale = useLocale();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>(
    status === "DONE" || status === "CANCELED"
      ? "finished"
      : status === "IN_PROGRESS"
        ? "running"
        : "startLocation",
  );
  const [photoState, setPhotoState] = useState<SavedPhoto | null>(photo);
  const [startedClock, setStartedClock] = useState<string | null>(
    startedAt ? formatClock(new Date(startedAt), locale) : null,
  );
  const [finishedClock, setFinishedClock] = useState<string | null>(
    completedAt ? formatClock(new Date(completedAt), locale) : null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [changingWorker, setChangingWorker] = useState(false);

  async function run(
    action: () => Promise<{ ok: boolean; message?: string; at?: string }>,
    onSuccess: (at?: string) => void,
  ) {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? t("error.generic"));
        return;
      }
      if (result.message) setAnnouncement(result.message);
      onSuccess(result.at);
      router.refresh();
    } catch {
      setError(navigator.onLine ? t("error.generic") : t("error.offline"));
    } finally {
      setPending(false);
    }
  }

  const isStart = phase === "startLocation" || phase === "startWorker" || phase === "startConfirm";
  const isFinish = phase === "running" || phase === "finishConfirm";

  /* --- Registro: o que ficou do servico feito ------------------------------ */

  const record = (
    <>
      <div className="card">
        <div className="summary">
          <SummaryRow label={t("service.location")} value={<span translate="no">{locationName}</span>} />
          <SummaryRow label={t("service.worker")} value={<span translate="no">{worker.name}</span>} />
          {startedClock ? (
            <SummaryRow
              label={t("service.startedLabel")}
              value={<span className="mono-time">{t("service.startedAt", { time: startedClock })}</span>}
            />
          ) : null}
          {finishedClock ? (
            <SummaryRow
              label={t("service.finishedLabel")}
              value={<span className="mono-time">{t("service.completedAt", { time: finishedClock })}</span>}
            />
          ) : null}
        </div>
      </div>

      <section className="section">
        <h2 className="list__heading">{t("service.photoOfService")}</h2>
        {photoState ? (
          <Photo url={photoState.url} alt={t("service.photoOfService")} />
        ) : (
          <div className="photo-frame">
            <p className="photo-frame__empty">
              <Icon name="image" size={36} />
              {t("service.noPhotoYet")}
            </p>
          </div>
        )}
      </section>

      {occurrences.length > 0 ? (
        <section className="section">
          <h2 className="list__heading">
            <Icon name="alert" size={26} /> {t("occurrence.title")}
          </h2>
          <div className="list">
            {occurrences.map((occurrence) => (
              <div className="card card--tight" key={occurrence.id}>
                <p className="summary__value">
                  {isOccurrenceReasonKey(occurrence.reasonCode)
                    ? t(OCCURRENCE_REASON_KEYS[occurrence.reasonCode])
                    : occurrence.reasonCode}
                </p>
                {occurrence.note ? <p translate="no">{occurrence.note}</p> : null}
                <p className="text-small">
                  <span translate="no">{occurrence.by ?? ""}</span>
                  {" · "}
                  <span className="mono-time">{formatClock(new Date(occurrence.at), locale)}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="list__heading">{t("service.history")}</h2>
        <ServiceHistory
          items={history.map((entry) => ({
            id: entry.id,
            type: entry.type,
            meta: entry.meta,
            at: formatClock(new Date(entry.at), locale),
            by: entry.by,
          }))}
        />
      </section>
    </>
  );

  /* --- Arrumar o servico --------------------------------------------------- */

  const management = (
    <section className="section">
      <hr className="divider" />
      <h2 className="list__heading">{t("service.moreOptions")}</h2>
      <div className="btn-stack">
        {/*
          "Trocar a pessoa" so aparece aqui quando a tela do momento ja nao
          oferece essa escolha: no passo "Confira quem vai fazer" ela esta na
          propria pergunta, e repetir o botao confunde.
        */}
        {(status === "PENDING" || status === "IN_PROGRESS") && phase !== "startWorker" ? (
          <button type="button" className="btn btn--quiet" onClick={() => setChangingWorker(true)}>
            <Icon name="person" className="btn__icon" />
            {t("service.changeWorker")}
          </button>
        ) : null}

        {status !== "CANCELED" ? (
          <button type="button" className="btn btn--danger" onClick={() => setConfirmCancel(true)}>
            <Icon name="close" className="btn__icon" strokeWidth={3} />
            {t("service.cancel")}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            disabled={pending}
            onClick={() => run(() => restoreServiceAction(assignmentId), () => router.refresh())}
          >
            <Icon name="refresh" className="btn__icon" />
            {t("service.restore")}
          </button>
        )}

        <Link className="btn btn--quiet" href={`/servicos/${assignmentId}/problema`}>
          <Icon name="alert" className="btn__icon" />
          {t("occurrence.title")}
        </Link>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          void run(() => cancelServiceAction(assignmentId), () => undefined);
        }}
        title={t("service.cancelTitle")}
        text={t("service.cancelBody")}
        confirmLabel={t("service.cancelYes")}
        cancelLabel={t("service.cancelNo")}
        pending={pending}
      />

      <Modal open={changingWorker} onClose={() => setChangingWorker(false)} title={t("service.changeWorkerTitle")}>
        <div className="choice-stack">
          {workers.map((person) => (
            <button
              key={person.id}
              type="button"
              className="choice"
              aria-pressed={person.id === worker.id}
              disabled={pending}
              onClick={() =>
                run(() => reassignServiceAction(assignmentId, person.id), () => setChangingWorker(false))
              }
            >
              <Avatar name={person.name} photoUrl={person.photoUrl} />
              <span className="choice__text">
                <span translate="no">{person.name}</span>
              </span>
              {person.id === worker.id ? <Icon name="check" size={28} strokeWidth={3} /> : <Icon name="forward" size={26} />}
            </button>
          ))}
        </div>
      </Modal>
    </section>
  );

  /* --- Servico concluido --------------------------------------------------- */

  if (status === "DONE") {
    return (
      <div className="stack stack--loose">
        <LiveRegion message={announcement} />
        <div className="cheer">
          <span className="cheer__mark">
            <Icon name="check" size={54} strokeWidth={3} />
          </span>
          <p className="cheer__title">{t("finish.doneTitle")}</p>
          <p className="cheer__text">{t("finish.doneCheck")}</p>
        </div>
        {record}
        {management}
      </div>
    );
  }

  /* --- Servico cancelado --------------------------------------------------- */

  if (status === "CANCELED") {
    return (
      <div className="stack stack--loose">
        <LiveRegion message={announcement} />
        <Alert tone="warning" icon={<Icon name="alert" size={28} />}>
          {t("status.canceled")}
        </Alert>
        {record}
        {management}
      </div>
    );
  }

  return (
    <div className="stack">
      <LiveRegion message={announcement} />

      {error ? (
        <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
          {error}
        </Alert>
      ) : null}

      {isStart ? <Steps step={phase === "startLocation" ? 1 : phase === "startWorker" ? 2 : 3} total={START_TOTAL} /> : null}
      {isFinish ? <Steps step={phase === "running" ? 1 : FINISH_TOTAL} total={FINISH_TOTAL} /> : null}

      {/* ========================== ANTES DE COMECAR ======================= */}

      {phase === "startLocation" ? (
        <section className="stack">
          <h2 className="screen-head__title">{t("flow.stepLocationTitle")}</h2>
          <div className="card">
            <p className="summary__value" translate="no">
              {locationName}
            </p>
            {locationAddress ? (
              <p className="text-small" translate="no">
                {locationAddress}
              </p>
            ) : null}
          </div>
          <p className="screen-head__subtitle">{t("flow.stepLocationQuestion")}</p>
          <div className="btn-stack">
            <button type="button" className="btn btn--primary" onClick={() => setPhase("startWorker")}>
              <Icon name="check" className="btn__icon" strokeWidth={3} />
              {t("flow.stepLocationYes")}
            </button>
            <Link className="btn btn--quiet" href="/lider/servicos">
              <Icon name="back" className="btn__icon" />
              {t("flow.stepLocationNo")}
            </Link>
          </div>
        </section>
      ) : null}

      {phase === "startWorker" ? (
        <section className="stack">
          <h2 className="screen-head__title">{t("flow.stepWorkerTitle")}</h2>
          <div className="card stack stack--tight">
            <span className="center-row">
              <Avatar name={worker.name} photoUrl={worker.photoUrl} big />
            </span>
            <p className="summary__value text-center" translate="no">
              {worker.name}
            </p>
          </div>
          <p className="screen-head__subtitle">{t("flow.stepWorkerQuestion")}</p>
          <div className="btn-stack">
            <button type="button" className="btn btn--primary" onClick={() => setPhase("startConfirm")}>
              <Icon name="check" className="btn__icon" strokeWidth={3} />
              {t("flow.stepWorkerYes")}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setChangingWorker(true)}>
              <Icon name="person" className="btn__icon" />
              {t("service.changeWorker")}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "startConfirm" ? (
        <section className="stack">
          <h2 className="screen-head__title">{t("flow.stepStartTitle")}</h2>
          <p className="screen-head__subtitle">{t("flow.stepStartQuestion")}</p>
          <div className="btn-stack">
            <button
              type="button"
              className="btn btn--success"
              disabled={pending}
              onClick={() =>
                run(
                  () => startServiceAction(assignmentId),
                  (at) => {
                    setStartedClock(at ? formatClock(new Date(at), locale) : null);
                    setPhase("started");
                  },
                )
              }
            >
              <Icon name="check" className="btn__icon" strokeWidth={3} />
              {pending ? t("flow.starting") : t("flow.start")}
            </button>
            <button
              type="button"
              className="btn btn--quiet"
              disabled={pending}
              onClick={() => setPhase("startWorker")}
            >
              <Icon name="back" className="btn__icon" />
              {t("action.back")}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "started" ? (
        <section className="stack stack--loose">
          <div className="cheer">
            <span className="cheer__mark">
              <Icon name="check" size={54} strokeWidth={3} />
            </span>
            <p className="cheer__title">{t("flow.startedTitle")}</p>
            <p className="cheer__text">
              {startedClock ? t("flow.startedBody", { time: startedClock }) : t("flow.startedCheck")}
            </p>
          </div>
          <div className="btn-stack">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setAnnouncement(null);
                setPhase("running");
              }}
            >
              <Icon name="camera" className="btn__icon" />
              {t("action.continue")}
            </button>
            <Link className="btn btn--quiet" href="/lider/servicos">
              {t("service.backToList")}
            </Link>
          </div>
        </section>
      ) : null}

      {/* ========================== EM ANDAMENTO ========================== */}

      {phase === "running" ? (
        <section className="stack stack--loose">
          <h2 className="screen-head__title">{t("service.photoOfService")}</h2>
          <p className="screen-head__subtitle">{t("finish.stepPhotoHint")}</p>

          <PhotoCapture
            kind="END"
            assignmentId={assignmentId}
            initialPhoto={photoState}
            required
            onSaved={(saved) => {
              setPhotoState(saved);
              setAnnouncement(t("photo.registered"));
            }}
          />

          {/*
            O botao so libera com a foto do servico pronto guardada. Em vez de
            deixar um botao apagado sem explicacao, dizemos o que falta.
          */}
          {!photoState ? (
            <Alert tone="warning" icon={<Icon name="alert" size={28} />}>
              {t("finish.needPhoto")}
            </Alert>
          ) : null}

          <button
            type="button"
            className="btn btn--success"
            disabled={!photoState}
            onClick={() => setPhase("finishConfirm")}
          >
            <Icon name="check" className="btn__icon" strokeWidth={3} />
            {t("finish.button")}
          </button>
        </section>
      ) : null}

      {phase === "finishConfirm" ? (
        <section className="stack">
          <h2 className="screen-head__title">{t("finish.stepConfirmTitle")}</h2>
          <p className="screen-head__subtitle">{t("finish.stepConfirmQuestion")}</p>

          <div className="card">
            <div className="summary">
              <SummaryRow label={t("service.task")} value={<span translate="no">{taskName}</span>} />
              <SummaryRow label={t("service.worker")} value={<span translate="no">{worker.name}</span>} />
            </div>
          </div>

          {/* O lider confere a foto que vai ficar como prova do servico feito. */}
          {photoState ? <Photo url={photoState.url} alt={t("service.photoOfService")} /> : null}

          <div className="btn-stack">
            <button
              type="button"
              className="btn btn--success"
              disabled={pending || !photoState}
              onClick={() =>
                run(
                  () => completeServiceAction(assignmentId),
                  (at) => {
                    setFinishedClock(at ? formatClock(new Date(at), locale) : null);
                    setPhase("finished");
                  },
                )
              }
            >
              <Icon name="check" className="btn__icon" strokeWidth={3} />
              {pending ? t("finish.saving") : t("finish.button")}
            </button>
            <button
              type="button"
              className="btn btn--quiet"
              disabled={pending}
              onClick={() => setPhase("running")}
            >
              <Icon name="back" className="btn__icon" />
              {t("action.back")}
            </button>
          </div>
        </section>
      ) : null}

      {phase === "finished" ? (
        <section className="stack stack--loose">
          <div className="cheer">
            <span className="cheer__mark">
              <Icon name="check" size={54} strokeWidth={3} />
            </span>
            <p className="cheer__title">{t("finish.doneTitle")}</p>
            <p className="cheer__text">
              {finishedClock ? t("finish.doneBody", { time: finishedClock }) : t("finish.doneCheck")}
            </p>
          </div>
          {record}
          <Link className="btn btn--primary" href="/lider/servicos">
            <Icon name="list" className="btn__icon" />
            {t("service.backToList")}
          </Link>
        </section>
      ) : null}

      {isStart || isFinish ? management : null}
    </div>
  );
}

function Photo({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="photo-frame">
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem de rota autenticada */}
      <img src={url} alt={alt} />
    </div>
  );
}
