"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert } from "@/components/display";
import { Icon } from "@/components/icon";
import { ConfirmDialog, LiveRegion, Modal } from "@/components/modal";
import { useTranslate } from "@/i18n/client";
import { deleteLocationAction, saveLocationAction, setLocationActiveAction } from "@/lib/actions/admin";

export type ManagedLocation = {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  active: boolean;
  serviceCount: number;
};

type Draft = { id: string | null; name: string; address: string; notes: string };

const EMPTY_DRAFT: Draft = { id: null, name: "", address: "", notes: "" };

/**
 * Cadastro de locais.
 *
 * Nome curto, para caber em botao grande na hora de distribuir a tarefa, e
 * endereco para o colaborador conferir se chegou no lugar certo.
 */
export function LocationsManager({
  locations,
  summary,
}: {
  locations: ManagedLocation[];
  summary: string;
}) {
  const t = useTranslate();
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<ManagedLocation | null>(null);
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
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setError(null);
            setDraft(EMPTY_DRAFT);
          }}
        >
          <Icon name="plus" className="btn__icon" />
          {t("admin.newLocation")}
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
        {locations.map((location) => (
          <div className="card card--tight" key={location.id}>
            <p className="summary__value" translate="no">
              {location.name}
            </p>
            {location.address ? (
              <p className="text-small" translate="no">
                {location.address}
              </p>
            ) : null}
            {location.notes ? (
              <p className="text-small" translate="no">
                {location.notes}
              </p>
            ) : null}
            <p className="text-small">
              {location.active ? t("admin.activeItem") : t("admin.inactiveItem")}
            </p>

            <div className="btn-row">
              <button
                type="button"
                className="btn btn--small btn--quiet"
                onClick={() =>
                  setDraft({
                    id: location.id,
                    name: location.name,
                    address: location.address ?? "",
                    notes: location.notes ?? "",
                  })
                }
              >
                <Icon name="pencil" size={22} className="btn__icon" />
                {t("action.change")}
              </button>

              <button
                type="button"
                className="btn btn--small btn--quiet"
                disabled={pending}
                onClick={() => run(() => setLocationActiveAction(location.id, !location.active))}
              >
                <Icon name={location.active ? "power" : "refresh"} size={22} className="btn__icon" />
                {location.active ? t("admin.deactivateItem") : t("admin.activateItem")}
              </button>

              <button
                type="button"
                className="btn btn--small btn--danger"
                onClick={() => setToDelete(location)}
              >
                <Icon name="trash" size={22} className="btn__icon" />
                {t("action.delete")}
              </button>
            </div>
          </div>
        ))}

        {locations.length === 0 ? <p className="text-small">{t("admin.none")}</p> : null}
      </div>

      {draft ? (
        <Modal
          open
          onClose={() => setDraft(null)}
          title={draft.id ? t("action.change") : t("admin.newLocation")}
        >
          <div className="field">
            <label className="field__label" htmlFor="local-nome">
              {t("admin.fieldName")}
            </label>
            <input
              id="local-nome"
              className="input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="local-endereco">
              {t("admin.fieldAddress")}
            </label>
            <input
              id="local-endereco"
              className="input"
              value={draft.address}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="local-obs">
              {t("admin.fieldNotes")}
            </label>
            <textarea
              id="local-obs"
              className="textarea"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              rows={3}
            />
          </div>

          <div className="btn-stack">
            <button
              type="button"
              className="btn btn--primary"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    saveLocationAction({
                      id: draft.id,
                      name: draft.name,
                      address: draft.address,
                      notes: draft.notes,
                    }),
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
          void run(() => deleteLocationAction(target.id));
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
