"use client";

import { useId } from "react";
import { useFormStatus } from "react-dom";

import { Icon, type IconName } from "@/components/icon";

/** Botao de formulario que avisa, por escrito, que esta salvando. */
export function SubmitButton({
  label,
  pendingLabel,
  icon,
  variant = "primary",
}: {
  label: string;
  pendingLabel: string;
  icon?: IconName;
  variant?: "primary" | "success" | "danger" | "secondary" | "quiet";
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={`btn btn--${variant}`} aria-busy={pending ? "true" : undefined}>
      {icon ? <Icon name={icon} className="btn__icon" /> : null}
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Opcao grande e tocavel. Usada nas listas de locais, tarefas e pessoas.
 * O subtitulo e opcional e serve para dar contexto sem poluir.
 */
export function ChoiceButton({
  title,
  hint,
  icon,
  avatar,
  onSelect,
  pressed,
  trailing,
  describedBy,
  disabled,
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  avatar?: React.ReactNode;
  onSelect: () => void;
  pressed?: boolean;
  trailing?: React.ReactNode;
  describedBy?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="choice"
      onClick={onSelect}
      aria-pressed={pressed === undefined ? undefined : pressed}
      aria-describedby={describedBy}
      aria-disabled={disabled ? "true" : undefined}
      disabled={disabled}
    >
      {avatar}
      {icon ? <Icon name={icon} size={32} strokeWidth={2.2} /> : null}
      <span className="choice__text">
        {/* Nomes de pessoas, locais e tarefas ficam como foram cadastrados. */}
        <span translate="no">{title}</span>
        {hint ? <span className="choice__hint">{hint}</span> : null}
      </span>
      {trailing}
    </button>
  );
}

/**
 * Campo de procura com rotulo grande.
 * A lupa e apenas um apoio: o rotulo escrito e que diz o que o campo faz.
 */
export function SearchBox({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = useId();

  return (
    <div className="search-field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <span className="search-field__icon" aria-hidden="true">
        <Icon name="search" size={26} />
      </span>
      <input
        id={id}
        className="input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        enterKeyHint="search"
      />
    </div>
  );
}
