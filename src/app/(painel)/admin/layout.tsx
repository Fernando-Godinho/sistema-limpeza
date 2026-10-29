import { AppShell } from "@/components/app-shell";
import { Tabs } from "@/components/tabs";
import { getTranslate } from "@/i18n/server";
import { requireUser } from "@/lib/session";

/**
 * Painel do gestor.
 *
 * Aqui cabem telas mais completas: cadastro de pessoas, locais e tarefas,
 * alem dos ajustes do sistema. O fluxo do dia a dia do lider e do colaborador
 * continua simples, do outro lado do sistema.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["ADMIN"]);
  const t = await getTranslate();

  return (
    <AppShell user={user} wide backTo={{ href: "/lider", label: t("action.home") }}>
      <div className="screen-head">
        <h1 className="screen-head__title">{t("admin.title")}</h1>
      </div>

      <Tabs
        items={[
          { href: "/admin", label: t("admin.tabToday") },
          { href: "/admin/pessoas", label: t("admin.tabPeople") },
          { href: "/admin/locais", label: t("admin.tabLocations") },
          { href: "/admin/tarefas", label: t("admin.tabTasks") },
          { href: "/admin/ajustes", label: t("admin.tabSettings") },
        ]}
      />

      {children}
    </AppShell>
  );
}
