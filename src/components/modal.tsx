"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslate } from "@/i18n/client";

/**
 * Janela de confirmacao.
 *
 * Cuidados que fazem diferenca para quem usa leitor de tela ou teclado:
 * o foco entra na janela ao abrir, fica preso dentro dela enquanto estiver
 * aberta e volta para o botao de origem ao fechar. O Escape tambem fecha.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`dialog-${Math.random().toString(36).slice(2, 9)}`).current;
  const t = useTranslate();

  const focusablesIn = useCallback((): HTMLElement[] => {
    const node = panelRef.current;
    if (!node) return [];
    return Array.from(
      node.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null || element === document.activeElement);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const first = focusablesIn()[0];
    (first ?? panelRef.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusablesIn();
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === firstItem || active === panelRef.current)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose, focusablesIn]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        {children}
        <div className="btn-stack">
          <button type="button" className="btn btn--quiet" onClick={onClose}>
            {t("action.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Confirmacao de uma acao que nao pode ser desfeita. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  text,
  confirmLabel,
  cancelLabel,
  pending,
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  tone?: "danger" | "primary";
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="dialog__text">{text}</p>
      <div className="btn-stack">
        <button
          type="button"
          className={`btn btn--${tone}`}
          onClick={onConfirm}
          aria-busy={pending ? "true" : undefined}
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onClose}>
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Fila de avisos lidos em voz alta pelo leitor de tela.
 * Serve para confirmar em palavras que o registro foi salvo.
 */
export function LiveRegion({ message }: { message: string | null }) {
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    setCurrent(message);
    const timer = window.setTimeout(() => setCurrent(null), 8000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {current ?? ""}
    </p>
  );
}
