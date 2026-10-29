"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { SearchBox } from "@/components/controls";
import { Alert, Avatar } from "@/components/display";
import { Icon } from "@/components/icon";
import { ConfirmDialog, LiveRegion, Modal } from "@/components/modal";
import { PhotoCapture } from "@/components/photo-capture";
import { useTranslate } from "@/i18n/client";
import { deletePersonAction, savePersonAction, setPersonActiveAction } from "@/lib/actions/admin";
import { ROLES, SHIFTS, type Role, type Shift } from "@/lib/domain";
import { SHIFT_LABEL_KEYS } from "@/lib/labels";

export type ManagedPerson = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
  locale: string | null;
  photoId: string | null;
  photoUrl: string | null;
  canSignIn: boolean;
  serviceCount: number;
  shift: Shift | null;
  leaderName: string | null;
  employeeCode: string | null;
};

const ROLE_LABEL_KEYS: Record<Role, "admin.roleWorker" | "admin.roleLeader" | "admin.roleAdmin"> = {
  WORKER: "admin.roleWorker",
  LEADER: "admin.roleLeader",
  ADMIN: "admin.roleAdmin",
};

type Draft = { id: string | null; name: string; role: Role; pin: string; shift: Shift };

const EMPTY_DRAFT: Draft = { id: null, name: "", role: "WORKER", pin: "", shift: "MORNING" };

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

/**
 * Cadastro de pessoas.
 *
 * O gestor pode mais do que o lider aqui: criar, mudar o papel, desligar e
 * apagar. Tudo o que apaga exige confirmacao, e quem ja aparece em servico nao
 * e apagado -- e desligado, para o historico continuar de pe.
 *
 * Com a base de colaboradores inteira, a lista fica grande: por isso a busca
 * pelo nome e o filtro por turno, que e como o gestor confere cada equipe.
 */
export function PeopleManager({ people }: { people: ManagedPerson[] }) {
  const t = useTranslate();
  const router = useRouter();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<ManagedPerson | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<"" | Shift>("");

  const shown = useMemo(() => {
    const needle = fold(query.trim());
    return people.filter((person) => {
      if (shiftFilter && person.shift !== shiftFilter) return false;
      return needle === "" || fold(person.name).includes(needle);
    });
  }, [people, query, shiftFilter]);

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

  const editing = draft?.id ? people.find((person) => person.id === draft.id) ?? null : null;

  return (
    <>
      <LiveRegion message={announcement} />

      <div className="stack stack--tight">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setError(null);
            setDraft(EMPTY_DRAFT);
          }}
        >
          <Icon name="plus" className="btn__icon" />
          {t("admin.newPerson")}
        </button>
      </div>

      <div className="stack stack--tight actions">
        <SearchBox
          label={t("admin.searchPeople")}
          value={query}
          onChange={setQuery}
          placeholder={t("action.searchPlaceholder")}
        />
        <div className="field">
          <label className="field__label" htmlFor="filtro-turno">
            {t("admin.fieldShift")}
          </label>
          <select
            id="filtro-turno"
            className="select"
            value={shiftFilter}
            onChange={(event) => setShiftFilter(event.target.value as "" | Shift)}
          >
            <option value="">{t("admin.filterAllShifts")}</option>
            {SHIFTS.map((shift) => (
              <option key={shift} value={shift}>
                {t(SHIFT_LABEL_KEYS[shift])}
              </option>
            ))}
          </select>
        </div>
        <p className="text-small" aria-live="polite">
          {t("admin.peopleShown", { count: shown.length, total: people.length })}
        </p>
      </div>

      {error ? (
        <div className="actions">
          <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
            {error}
          </Alert>
        </div>
      ) : null}

      <div className="list actions">
        {shown.map((person) => (
          <div className="person-row" key={person.id}>
            <div className="person-row__head">
              <Avatar name={person.name} photoUrl={person.photoUrl} />
              <span className="person-row__name" translate="no">
                {person.name}
              </span>
            </div>

            <p className="text-small">
              {t(ROLE_LABEL_KEYS[person.role])}
              {" · "}
              {person.active ? t("admin.statusActive") : t("admin.statusInactive")}
              {" · "}
              {person.canSignIn ? t("admin.canSignIn") : t("admin.cannotSignIn")}
            </p>

            <p className="text-small">
              {t("shift.field")}: {person.shift ? t(SHIFT_LABEL_KEYS[person.shift]) : "—"}
              {" · "}
              {person.leaderName ? (
                <>
                  {t("admin.leaderLabel")}: <span translate="no">{person.leaderName}</span>
                </>
              ) : (
                t("admin.leaderNone")
              )}
              {person.employeeCode ? (
                <>
                  {" · "}
                  {t("admin.employeeCode", { code: person.employeeCode })}
                </>
              ) : null}
            </p>

            <div className="btn-row">
              <button
                type="button"
                className="btn btn--small btn--quiet"
                onClick={() => {
                  setError(null);
                  setDraft({
                    id: person.id,
                    name: person.name,
                    role: person.role,
                    pin: "",
                    shift: person.shift ?? "MORNING",
                  });
                }}
              >
                <Icon name="pencil" size={22} className="btn__icon" />
                {t("action.change")}
              </button>

              <button
                type="button"
                className="btn btn--small btn--quiet"
                disabled={pending}
                onClick={() => run(() => setPersonActiveAction(person.id, !person.active))}
              >
                <Icon name={person.active ? "power" : "refresh"} size={22} className="btn__icon" />
                {person.active ? t("admin.deactivate") : t("admin.activate")}
              </button>

              <button
                type="button"
                className="btn btn--small btn--danger"
                onClick={() => setToDelete(person)}
              >
                <Icon name="trash" size={22} className="btn__icon" />
                {t("action.delete")}
              </button>
            </div>
          </div>
        ))}

        {shown.length === 0 ? <p className="text-small">{t("admin.none")}</p> : null}
      </div>

      {draft ? (
        <Modal
          open
          onClose={() => setDraft(null)}
          title={draft.id ? t("action.change") : t("admin.newPerson")}
        >
          <div className="field">
            <label className="field__label" htmlFor="pessoa-nome">
              {t("admin.fieldName")}
            </label>
            <input
              id="pessoa-nome"
              className="input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="pessoa-papel">
              {t("admin.fieldRole")}
            </label>
            <select
              id="pessoa-papel"
              className="select"
              value={draft.role}
              onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(ROLE_LABEL_KEYS[role])}
                </option>
              ))}
            </select>
          </div>

          {/*
            O turno e o que define a equipe: escolhido o turno, o lider daquele
            turno passa a responder pela pessoa. E assim que o lider so ve a
            propria equipe no dia a dia.
          */}
          {draft.role === "ADMIN" ? null : (
            <div className="field">
              <label className="field__label" htmlFor="pessoa-turno">
                {t("shift.field")}
              </label>
              <p className="field__hint">{t("admin.fieldShiftHint")}</p>
              <select
                id="pessoa-turno"
                className="select"
                value={draft.shift}
                onChange={(event) => setDraft({ ...draft, shift: event.target.value as Shift })}
              >
                {SHIFTS.map((shift) => (
                  <option key={shift} value={shift}>
                    {t(SHIFT_LABEL_KEYS[shift])}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/*
            Colaborador nao entra no sistema: nao pedimos numeros para ele.
            Quem opera o aplicativo e o lider ou o gestor.
          */}
          {draft.role === "WORKER" ? (
            <Alert tone="info" icon={<Icon name="info" size={28} />}>
              {t("admin.workerNoLogin")}
            </Alert>
          ) : (
            <div className="field">
              <label className="field__label" htmlFor="pessoa-pin">
                {t("admin.fieldPin")}
              </label>
              <p className="field__hint">{t("admin.fieldPinHint")}</p>
              <input
                id="pessoa-pin"
                className="input"
                value={draft.pin}
                onChange={(event) =>
                  setDraft({ ...draft, pin: event.target.value.replace(/\D/g, "").slice(0, 4) })
                }
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
              />
            </div>
          )}

          <div className="btn-stack">
            <button
              type="button"
              className="btn btn--primary"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    savePersonAction({
                      id: draft.id,
                      name: draft.name,
                      role: draft.role,
                      pin: draft.pin || null,
                      shift: draft.role === "ADMIN" ? null : draft.shift,
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

          {editing ? (
            <>
              <hr className="divider" />
              <h3 className="card__title">{t("photo.review")}</h3>
              {/*
                A foto do rosto e um cadastro feito pelo gestor, muitas vezes em
                um computador sem camera. Por isso aqui, e so aqui, tambem da
                para escolher uma imagem existente. As fotos do servico sao
                sempre tiradas na hora.
              */}
              <PhotoCapture
                kind="AVATAR"
                allowGallery
                targetUserId={editing.id}
                initialPhoto={editing.photoId ? { id: editing.photoId, url: editing.photoUrl ?? "" } : null}
                onSaved={() => {
                  setAnnouncement(t("photo.saved"));
                  router.refresh();
                }}
              />
            </>
          ) : null}
        </Modal>
      ) : null}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          const target = toDelete;
          setToDelete(null);
          void run(() => deletePersonAction(target.id));
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
