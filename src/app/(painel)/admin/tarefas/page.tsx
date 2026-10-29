import { getTranslate } from "@/i18n/server";
import { prisma } from "@/lib/db";

import { TasksManager, type ManagedTask } from "./tasks-manager";

/** Catalogo de tarefas e as regras de foto de cada uma. */
export default async function AdminTasksPage() {
  const t = await getTranslate();

  const tasks = await prisma.taskType.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      active: true,
      _count: { select: { services: true } },
    },
  });

  const managed: ManagedTask[] = tasks.map((task) => ({
    id: task.id,
    name: task.name,
    active: task.active,
    serviceCount: task._count.services,
  }));

  return <TasksManager tasks={managed} summary={t("admin.tasksCount", { count: tasks.length })} />;
}
