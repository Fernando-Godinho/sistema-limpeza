"use client";

import { Icon, type IconName } from "@/components/icon";
import { useTranslate } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { AssignmentStatus } from "@/lib/domain";

/*
 * A situacao do servico nunca aparece so como cor: vem sempre com desenho e
 * com a palavra escrita do lado.
 */
const LOOK: Record<AssignmentStatus, { key: MessageKey; icon: IconName; className: string }> = {
  PENDING: { key: "status.pending", icon: "clock", className: "status--pending" },
  IN_PROGRESS: { key: "status.inProgress", icon: "loader", className: "status--in-progress" },
  DONE: { key: "status.done", icon: "check-circle", className: "status--done" },
  CANCELED: { key: "status.canceled", icon: "close", className: "status--canceled" },
};

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  const t = useTranslate();
  const look = LOOK[status];

  return (
    <span className={`status ${look.className}`}>
      <Icon name={look.icon} size={22} strokeWidth={2.4} />
      {t(look.key)}
    </span>
  );
}
