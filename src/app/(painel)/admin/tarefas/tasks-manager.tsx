"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/display";
import { Icon } from "@/components/icon";
import { ConfirmDialog, LiveRegion, Modal } from "@/components/modal";
import { useTranslate } from "@/i18n/client";
import { deleteTaskAction, saveTaskAction, setTaskActiveAction } from "@/lib/actions/admin";

export type ManagedTask = {
  id: string;
  name: string;
  active: boolean;
  serviceCount: number;
};

type Draft = { id: string | null; name: string };

const EMPTY_DRAFT: Draft = { id: null, name: "" };

/**
 * Catalogo de tarefas.
 *
 * A tarefa e so o nome do servico. Nao existe configuracao de foto: todo
 * servico pede a foto do servico pronto para ser concluido, e o lider tira
 * essa foto pelo aplicativo.
 */
export function TasksManager({ tasks, summary }: { tasks: ManagedTask[]; summary: string }) {
  const t = useTranslate();
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<ManagedTask | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? t("error.generic"));
        return;
      }
      if (result.message) setAnnouncement(result.message);
      after?.();
      router.refresh();
    } catch {
      setError(navigator.onLine ? t("error.generic") : t("error.offline"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <LiveRegion message={announcement} />

      <div className="stack stack--tight">
        <p className="text-small">{summary}</p>
        <Alert tone="info" icon={<Icon name="camera" size={28} />}>
          {t("admin.photoRule")}
        </Alert>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setError(null);
            setDraft(EMPTY_DRAFT);
          }}
        >
          <Icon name="plus" className="btn__icon" />
          {t("admin.newTask")}
        </button>
      </div>

      {error ? (
        <div className="actions">
          <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
            {error}
          </Alert>
        </div>
      ) : null}

      <div className="list actions">
        {tasks.map((task) => (
          <div className="card card--tight" key={task.id}>
            <p className="summary__value" translate="no">
              {task.name}
            </p>
            <p className="text-small">
              {task.active ? t("admin.activeItem") : t("admin.inactiveItem")}
            </p>

            <div className="btn-row">
              <button
                type="button"
                className="btn btn--small btn--quiet"
                onClick={() =>
                  setDraft({ id: task.id, name: task.name })
                }
              >
                <Icon name="pencil" size={22} className="btn__icon" />
                {t("action.change")}
              </button>

              <button
                type="button"
                className="btn btn--small btn--quiet"
                disabled={pending}
                onClick={() => run(() => setTaskActiveAction(task.id, !task.active))}
              >
                <Icon name={task.active ? "power" : "refresh"} size={22} className="btn__icon" />
                {task.active ? t("admin.deactivateItem") : t("admin.activateItem")}
              </button>

              <button type="button" className="btn btn--small btn--danger" onClick={() => setToDelete(task)}>
                <Icon name="trash" size={22} className="btn__icon" />
                {t("action.delete")}
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 ? <p className="text-small">{t("admin.none")}</p> : null}
      </div>

      {draft ? (
        <Modal open onClose={() => setDraft(null)} title={draft.id ? t("action.change") : t("admin.newTask")}>
          <div className="field">
            <label className="field__label" htmlFor="tarefa-nome">
              {t("admin.fieldName")}
            </label>
            <input
              id="tarefa-nome"
              className="input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              autoComplete="off"
            />
          </div>

          <Alert tone="info" icon={<Icon name="camera" size={28} />}>
            {t("admin.photoRule")}
          </Alert>

          <div className="btn-stack">
            <button
              type="button"
              className="btn btn--primary"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    saveTaskAction({ id: draft.id, name: draft.name }),
                  () => setDraft(null),
                )
              }
            >
              <Icon name="check" size={26} className="btn__icon" strokeWidth={3} />
              {t("action.save")}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setDraft(null)}>
              {t("action.cancel")}
            </button>
          </div>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          const target = toDelete;
          setToDelete(null);
          void run(() => deleteTaskAction(target.id));
        }}
        title={t("admin.deleteTitle", { name: toDelete?.name ?? "" })}
        text={t("admin.deleteBody")}
        confirmLabel={t("admin.deleteYes")}
        cancelLabel={t("admin.deleteNo")}
        pending={pending}
      />
    </>
  );
}
