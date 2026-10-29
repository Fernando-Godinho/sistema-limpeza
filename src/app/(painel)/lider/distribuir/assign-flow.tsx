"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ChoiceButton, SearchBox } from "@/components/controls";
import { Alert, Avatar, EmptyState, SummaryRow } from "@/components/display";
import { Icon } from "@/components/icon";
import { LiveRegion } from "@/components/modal";
import { Steps } from "@/components/steps";
import { useTranslate } from "@/i18n/client";
import { createAssignmentAction } from "@/lib/actions/services";

type LocationOption = { id: string; name: string; address: string | null };
type TaskOption = { id: string; name: string };
type WorkerOption = { id: string; name: string; photoUrl: string | null; isPresent: boolean };

type Step = "location" | "task" | "worker" | "confirm" | "saved";

const TOTAL_STEPS = 4;

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export function AssignFlow({
  date,
  dayLabel,
  locations,
  tasks,
  workers,
  ownTeam,
}: {
  date: string;
  dayLabel: string;
  locations: LocationOption[];
  tasks: TaskOption[];
  workers: WorkerOption[];
  ownTeam: boolean;
}) {
  const t = useTranslate();
  const router = useRouter();

  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<LocationOption | null>(null);
  const [task, setTask] = useState<TaskOption | null>(null);
  const [worker, setWorker] = useState<WorkerOption | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const [locationQuery, setLocationQuery] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [workerQuery, setWorkerQuery] = useState("");

  const shownLocations = useMemo(
    () => locations.filter((item) => fold(item.name).includes(fold(locationQuery.trim()))),
    [locations, locationQuery],
  );
  const shownTasks = useMemo(
    () => tasks.filter((item) => fold(item.name).includes(fold(taskQuery.trim()))),
    [tasks, taskQuery],
  );
  const presentWorkers = useMemo(
    () => workers.filter((item) => item.isPresent && fold(item.name).includes(fold(workerQuery.trim()))),
    [workers, workerQuery],
  );
  const otherWorkers = useMemo(
    () => workers.filter((item) => !item.isPresent && fold(item.name).includes(fold(workerQuery.trim()))),
    [workers, workerQuery],
  );

  async function save() {
    if (!location || !task || !worker) {
      setError(t("error.chooseAll"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await createAssignmentAction({
        date,
        locationId: location.id,
        taskTypeId: task.id,
        workerId: worker.id,
      });
      if (!result.ok) {
        setError(result.message ?? t("error.generic"));
        return;
      }
      if (result.message) setAnnouncement(result.message);
      setStep("saved");
      router.refresh();
    } catch {
      // Sem internet, nada do que foi escolhido se perde.
      setError(navigator.onLine ? t("error.generic") : t("error.offline"));
    } finally {
      setPending(false);
    }
  }

  function startOver() {
    setStep("location");
    setLocation(null);
    setTask(null);
    setWorker(null);
    setError(null);
    setLocationQuery("");
    setTaskQuery("");
    setWorkerQuery("");
  }

  if (step === "saved") {
    return (
      <div className="stack stack--loose">
        <LiveRegion message={announcement} />
        <div className="cheer">
          <span className="cheer__mark">
            <Icon name="check" size={54} strokeWidth={3} />
          </span>
          <p className="cheer__title">{t("assign.savedTitle")}</p>
          <p className="cheer__text">
            {t("assign.savedBody", {
              task: task?.name ?? "",
              worker: worker?.name ?? "",
              location: location?.name ?? "",
            })}
          </p>
        </div>
        <div className="btn-stack">
          <button type="button" className="btn btn--primary" onClick={startOver}>
            <Icon name="plus" className="btn__icon" />
            {t("assign.again")}
          </button>
          <Link className="btn btn--quiet" href="/lider/servicos">
            <Icon name="list" className="btn__icon" />
            {t("assign.seeServices")}
          </Link>
        </div>
      </div>
    );
  }

  const stepNumber = step === "location" ? 1 : step === "task" ? 2 : step === "worker" ? 3 : 4;

  return (
    <div className="stack">
      <LiveRegion message={announcement} />
      <Steps step={stepNumber} total={TOTAL_STEPS} />

      {error ? (
        <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
          {error}
        </Alert>
      ) : null}

      {step === "location" ? (
        <section>
          <div className="screen-head">
            <h2 className="screen-head__title">{t("assign.stepLocation")}</h2>
            <p className="screen-head__subtitle">{t("assign.chooseLocation")}</p>
          </div>

          {locations.length === 0 ? (
            <EmptyState icon={<Icon name="pin" size={48} />} title={t("assign.emptyLocations")} />
          ) : (
            <>
              {locations.length > 8 ? (
                <SearchBox
                  label={t("action.search")}
                  value={locationQuery}
                  onChange={setLocationQuery}
                  placeholder={t("action.searchPlaceholder")}
                />
              ) : null}
              <div className="choice-stack">
                {shownLocations.map((item) => (
                  <ChoiceButton
                    key={item.id}
                    title={item.name}
                    hint={item.address ?? undefined}
                    icon="pin"
                    pressed={location?.id === item.id}
                    onSelect={() => {
                      setLocation(item);
                      setStep("task");
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {step === "task" ? (
        <section>
          <div className="screen-head">
            <h2 className="screen-head__title">{t("assign.stepTask")}</h2>
            <p className="screen-head__subtitle">{t("assign.chooseTask")}</p>
          </div>

          {tasks.length === 0 ? (
            <EmptyState icon={<Icon name="clipboard" size={48} />} title={t("assign.emptyTasks")} />
          ) : (
            <>
              {tasks.length > 8 ? (
                <SearchBox
                  label={t("action.search")}
                  value={taskQuery}
                  onChange={setTaskQuery}
                  placeholder={t("action.searchPlaceholder")}
                />
              ) : null}
              <div className="choice-stack">
                {shownTasks.map((item) => (
                  <ChoiceButton
                    key={item.id}
                    title={item.name}
                    icon="clipboard"
                    pressed={task?.id === item.id}
                    onSelect={() => {
                      setTask(item);
                      setStep("worker");
                    }}
                  />
                ))}
              </div>
            </>
          )}

          <div className="actions">
            <button type="button" className="btn btn--quiet" onClick={() => setStep("location")}>
              <Icon name="back" className="btn__icon" />
              {t("action.back")}
            </button>
          </div>
        </section>
      ) : null}

      {step === "worker" ? (
        <section>
          <div className="screen-head">
            <h2 className="screen-head__title">{t("assign.stepWorker")}</h2>
            <p className="screen-head__subtitle">{t("assign.chooseWorker")}</p>
          </div>

          {workers.length === 0 ? (
            <EmptyState
              icon={<Icon name="team" size={48} />}
              title={t(ownTeam ? "assign.emptyWorkersTeam" : "assign.emptyWorkers")}
            />
          ) : (
            <>
              {workers.length > 8 ? (
                <SearchBox
                  label={t("action.search")}
                  value={workerQuery}
                  onChange={setWorkerQuery}
                  placeholder={t("action.searchPlaceholder")}
                />
              ) : null}

              {presentWorkers.length > 0 ? (
                <>
                  <h3 className="list__heading">{t("assign.groupPresent")}</h3>
                  <div className="choice-stack">
                    {presentWorkers.map((item) => (
                      <ChoiceButton
                        key={item.id}
                        title={item.name}
                        avatar={<Avatar name={item.name} photoUrl={item.photoUrl} />}
                        pressed={worker?.id === item.id}
                        onSelect={() => {
                          setWorker(item);
                          setStep("confirm");
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {otherWorkers.length > 0 ? (
                <>
                  <h3 className="list__heading">{t("assign.groupOthers")}</h3>
                  <div className="choice-stack">
                    {otherWorkers.map((item) => (
                      <ChoiceButton
                        key={item.id}
                        title={item.name}
                        hint={t("assign.warnNotPresent")}
                        avatar={<Avatar name={item.name} photoUrl={item.photoUrl} />}
                        pressed={worker?.id === item.id}
                        onSelect={() => {
                          setWorker(item);
                          setStep("confirm");
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}

          <div className="actions">
            <button type="button" className="btn btn--quiet" onClick={() => setStep("task")}>
              <Icon name="back" className="btn__icon" />
              {t("action.back")}
            </button>
          </div>
        </section>
      ) : null}

      {step === "confirm" ? (
        <section>
          <div className="screen-head">
            <h2 className="screen-head__title">{t("assign.stepConfirm")}</h2>
          </div>

          <div className="card">
            <div className="summary">
              <SummaryRow label={t("assign.summaryLocation")} value={<span translate="no">{location?.name}</span>} />
              <SummaryRow label={t("assign.summaryTask")} value={<span translate="no">{task?.name}</span>} />
              <SummaryRow label={t("assign.summaryWorker")} value={<span translate="no">{worker?.name}</span>} />
              <SummaryRow label={t("assign.summaryDay")} value={dayLabel} />
            </div>
          </div>

          <div className="actions actions--bottom btn-stack">
            <button type="button" className="btn btn--success" onClick={save} disabled={pending}>
              <Icon name="check" className="btn__icon" strokeWidth={3} />
              {pending ? t("action.loading") : t("assign.save")}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setStep("worker")} disabled={pending}>
              <Icon name="pencil" className="btn__icon" />
              {t("action.correct")}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
