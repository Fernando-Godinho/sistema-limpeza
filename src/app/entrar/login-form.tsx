"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { SearchBox } from "@/components/controls";
import { Alert, Avatar, TextWithName } from "@/components/display";
import { Icon } from "@/components/icon";
import { useTranslate } from "@/i18n/client";
import { loginAction } from "@/lib/actions/auth";
import { PIN_LENGTH } from "@/lib/domain";

type Person = { id: string; name: string; photoUrl: string | null };

/** Compara nomes ignorando acentos e maiusculas, para a busca funcionar sempre. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function LoginForm({ people }: { people: Person[] }) {
  const t = useTranslate();
  const router = useRouter();

  const [selected, setSelected] = useState<Person | null>(null);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const term = fold(query.trim());
    if (!term) return people;
    return people.filter((person) => fold(person.name).includes(term));
  }, [people, query]);

  async function submit(pin: string) {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      const result = await loginAction(selected.id, pin);
      if (!result.ok) {
        setError(result.message ?? t("login.pinError"));
        setDigits("");
        return;
      }
      router.replace(result.home);
      router.refresh();
    } catch {
      setError(navigator.onLine ? t("error.generic") : t("error.offline"));
      setDigits("");
    } finally {
      setPending(false);
    }
  }

  function press(digit: string) {
    if (pending) return;
    const next = (digits + digit).slice(0, PIN_LENGTH);
    setError(null);
    setDigits(next);
    // Ao completar os quatro numeros, entra sozinho: menos um toque para
    // quem tem pouca pratica com aplicativos.
    if (next.length === PIN_LENGTH) void submit(next);
  }

  function eraseLast() {
    if (pending) return;
    setError(null);
    setDigits((old) => old.slice(0, -1));
  }

  function choose(person: Person) {
    setSelected(person);
    setDigits("");
    setError(null);
    setQuery("");
  }

  function goBackToNames() {
    setSelected(null);
    setDigits("");
    setError(null);
  }

  if (!selected) {
    return (
      <div className="stack stack--loose">
        <div className="screen-head">
          <h1 className="screen-head__title">{t("login.title")}</h1>
          <p className="screen-head__subtitle">{t("login.subtitle")}</p>
        </div>

        {people.length > 8 ? (
          <SearchBox
            label={t("login.searchName")}
            value={query}
            onChange={setQuery}
            placeholder={t("action.searchPlaceholder")}
          />
        ) : null}

        <div className="login__name-grid">
          {visible.map((person) => (
            <button key={person.id} type="button" className="choice" onClick={() => choose(person)}>
              <Avatar name={person.name} photoUrl={person.photoUrl} />
              <span className="choice__text">
                <span translate="no">{person.name}</span>
              </span>
              <Icon name="forward" size={26} className="btn__icon" />
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-small text-center">{t("login.empty")}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="stack stack--loose">
      <div className="stack stack--tight text-center">
        <div className="person-row__head center-row">
          <Avatar name={selected.name} photoUrl={selected.photoUrl} big />
        </div>
        <h1 className="screen-head__title">
          <TextWithName template={t("login.pinTitle")} name={selected.name} />
        </h1>
        <p className="screen-head__subtitle">{t("login.pinSubtitle")}</p>
      </div>

      {error ? (
        <Alert tone="danger" icon={<Icon name="alert" size={28} />}>
          {error}
        </Alert>
      ) : null}

      <div className="pin-display" aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            className={`pin-display__slot${index < digits.length ? " pin-display__slot--filled" : ""}`}
          >
            {index < digits.length ? "•" : ""}
          </span>
        ))}
      </div>
      {/* O leitor de tela acompanha quantos numeros ja foram digitados. */}
      <p className="sr-only" role="status" aria-live="polite">
        {t("login.pinCount", { count: digits.length, total: PIN_LENGTH })}
      </p>

      <div className="keypad">
        {KEYPAD.map((key) => (
          <button
            key={key}
            type="button"
            className="keypad__key"
            onClick={() => press(key)}
            disabled={pending}
            aria-label={key}
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          className="keypad__key keypad__key--middle"
          onClick={() => press("0")}
          disabled={pending}
          aria-label="0"
        >
          0
        </button>
      </div>

      <div className="btn-stack">
        <button
          type="button"
          className="btn btn--quiet"
          onClick={eraseLast}
          disabled={pending || digits.length === 0}
        >
          <Icon name="back" className="btn__icon" />
          {t("login.pinClear")}
        </button>
        <button type="button" className="btn btn--quiet" onClick={goBackToNames}>
          <Icon name="person" className="btn__icon" />
          {t("login.notMe")}
        </button>
      </div>

      <p className="text-small text-center">{t("login.forgot")}</p>
    </div>
  );
}
