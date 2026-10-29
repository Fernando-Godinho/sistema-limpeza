"use client";

import { Icon, type IconName } from "@/components/icon";
import { useTranslate } from "@/i18n/client";
import { EVENT_KEYS, isEventTypeKey } from "@/lib/labels";

export type HistoryItem = {
  id: string;
  type: string;
  meta: string | null;
  at: string;
  by: string | null;
};

const EVENT_ICONS: Record<string, IconName> = {
  CREATED: "plus",
  REASSIGNED: "person",
  STARTED: "forward",
  PHOTO_ADDED: "camera",
  OCCURRENCE: "alert",
  COMPLETED: "check-circle",
  CANCELED: "close",
  RESTORED: "refresh",
};

/**
 * Historico do servico.
 *
 * Cada linha diz, em palavras, o que aconteceu e a que horas. Uma linha por
 * acontecimento, na ordem em que aconteceram.
 */
export function ServiceHistory({ items }: { items: HistoryItem[] }) {
  const t = useTranslate();

  if (items.length === 0) {
    return <p className="text-small">{t("admin.none")}</p>;
  }

  return (
    <div className="history">
      {items.map((item) => (
        <div className="history__item" key={item.id}>
          <span className="history__icon">
            <Icon name={EVENT_ICONS[item.type] ?? "info"} size={24} />
          </span>
          <span>
            <span>
              {isEventTypeKey(item.type) ? t(EVENT_KEYS[item.type]) : item.type}
              {item.meta && item.type === "REASSIGNED" ? (
                <>
                  {": "}
                  <span translate="no">{item.meta}</span>
                </>
              ) : null}
            </span>
            <br />
            <span className="text-small">
              {item.by ? (
                <>
                  <span translate="no">{item.by}</span>
                  {" · "}
                </>
              ) : null}
              <span className="history__time mono-time">{item.at}</span>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
