"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { isLocale, type Locale } from "@/i18n/config";
import { getTranslate } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { isRole, isShift } from "@/lib/domain";
import { currentUserWithRole } from "@/lib/guard";
import { isValidPinFormat } from "@/lib/domain";
import { hashPin } from "@/lib/pin";
import { resetSampleData } from "@/lib/sample-data";
import { LOCALE_COOKIE } from "@/lib/session";
import { leaderOfShift } from "@/lib/team";

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

const ADMIN_ONLY = ["ADMIN"] as const;

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/pessoas");
  revalidatePath("/admin/locais");
  revalidatePath("/admin/tarefas");
  revalidatePath("/admin/ajustes");
  revalidatePath("/lider");
}

export async function savePersonAction(input: {
  id?: string | null;
  name: string;
  role: string;
  pin?: string | null;
  shift?: string | null;
}): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };

  const name = input.name.trim();
  if (!name) return { ok: false, message: t("error.missingField", { field: t("admin.fieldName") }) };
  if (!isRole(input.role)) return { ok: false, message: t("error.generic") };

  /*
   * Quem entra no sistema e o lider e o gestor. Colaborador nao tem PIN, nem
   * que alguem digite um no formulario: garantimos isso aqui, e nao so na tela.
   */
  const canSignIn = input.role === "LEADER" || input.role === "ADMIN";
  const pin = canSignIn ? input.pin?.trim() ?? "" : "";
  if (pin && !isValidPinFormat(pin)) {
    return { ok: false, message: t("error.invalidPin") };
  }

  /*
   * O turno e o que coloca a pessoa na equipe de um lider: escolhido o turno,
   * o lider daquele turno passa a responder por ela. Sem turno nao ha equipe,
   * entao o colaborador precisa de um.
   */
  const shift = isShift(input.shift) ? input.shift : null;
  if (input.role === "WORKER" && !shift) {
    return { ok: false, message: t("error.missingField", { field: t("shift.field") }) };
  }

  const leaderId =
    input.role === "WORKER" && shift ? (await leaderOfShift(shift))?.id ?? null : null;

  const pinData = pin ? { pinHash: await hashPin(pin) } : canSignIn ? {} : { pinHash: null };

  if (input.id) {
    const exists = await prisma.user.findUnique({
      where: { id: input.id },
      select: { id: true, locale: true },
    });
    if (!exists) return { ok: false, message: t("error.generic") };
    await prisma.user.update({
      where: { id: input.id },
      data: {
        name,
        role: input.role,
        shift,
        leaderId,
        // Virou colaborador? Perde o acesso, mesmo que o PIN antigo ficasse.
        ...(canSignIn ? {} : { pinHash: null }),
        ...pinData,
      },
    });
  } else {
    await prisma.user.create({ data: { name, role: input.role, shift, leaderId, ...pinData } });
  }

  revalidateAdmin();
  return { ok: true, message: t("admin.saved") };
}

export async function setPersonActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };
  if (id === admin.id && !active) {
    // Ninguem desliga a propria conta sem querer.
    return { ok: false, message: t("error.noPermission") };
  }

  await prisma.user.update({ where: { id }, data: { active } });
  revalidateAdmin();
  return { ok: true, message: t("admin.saved") };
}

/**
 * Apaga uma pessoa.
 *
 * Se ela ja aparece em algum servico, nao apagamos: o historico do trabalho
 * feito tem que continuar existindo. Nesse caso a tela oferece desligar.
 */
export async function deletePersonAction(id: string): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };
  if (id === admin.id) return { ok: false, message: t("error.noPermission") };

  const services = await prisma.assignment.count({ where: { workerId: id } });
  if (services > 0) {
    return { ok: false, message: t("admin.inUse") };
  }

  await prisma.attendance.deleteMany({ where: { userId: id } });
  await prisma.photo.updateMany({ where: { uploadedById: id }, data: { uploadedById: null } });
  await prisma.occurrence.updateMany({ where: { byId: id }, data: { byId: null } });
  await prisma.assignment.updateMany({ where: { createdById: id }, data: { createdById: null } });
  await prisma.assignmentEvent.updateMany({ where: { byId: id }, data: { byId: null } });
  await prisma.user.delete({ where: { id } });

  revalidateAdmin();
  return { ok: true, message: t("admin.deleted") };
}

export async function saveLocationAction(input: {
  id?: string | null;
  name: string;
  address?: string | null;
  notes?: string | null;
}): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };

  const name = input.name.trim();
  if (!name) return { ok: false, message: t("error.missingField", { field: t("admin.fieldName") }) };

  const data = {
    name,
    address: input.address?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    await prisma.location.update({ where: { id: input.id }, data });
  } else {
    await prisma.location.create({ data });
  }

  revalidateAdmin();
  return { ok: true, message: t("admin.saved") };
}

export async function setLocationActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };

  await prisma.location.update({ where: { id }, data: { active } });
  revalidateAdmin();
  return { ok: true, message: t("admin.saved") };
}

export async function deleteLocationAction(id: string): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };

  const services = await prisma.assignment.count({ where: { locationId: id } });
  if (services > 0) return { ok: false, message: t("admin.inUse") };

  await prisma.location.delete({ where: { id } });
  revalidateAdmin();
  return { ok: true, message: t("admin.deleted") };
}

export async function saveTaskAction(input: {
  id?: string | null;
  name: string;
}): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };

  const name = input.name.trim();
  if (!name) return { ok: false, message: t("error.missingField", { field: t("admin.fieldName") }) };

  const data = { name };

  if (input.id) {
    await prisma.taskType.update({ where: { id: input.id }, data });
  } else {
    await prisma.taskType.create({ data });
  }

  revalidateAdmin();
  return { ok: true, message: t("admin.saved") };
}

export async function setTaskActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };

  await prisma.taskType.update({ where: { id }, data: { active } });
  revalidateAdmin();
  return { ok: true, message: t("admin.saved") };
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };

  const services = await prisma.assignment.count({ where: { taskTypeId: id } });
  if (services > 0) return { ok: false, message: t("admin.inUse") };

  await prisma.taskType.delete({ where: { id } });
  revalidateAdmin();
  return { ok: true, message: t("admin.deleted") };
}

/** Idioma principal, usado por quem ainda nao escolheu o proprio. */
export async function setDefaultLocaleAction(locale: string): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };
  if (!isLocale(locale)) return { ok: false, message: t("error.generic") };

  const value: Locale = locale;
  await prisma.appSetting.upsert({
    where: { key: "defaultLocale" },
    create: { key: "defaultLocale", value },
    update: { value },
  });

  const store = await cookies();
  store.set(LOCALE_COOKIE, value, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });

  revalidatePath("/", "layout");
  return { ok: true, message: t("admin.saved") };
}

/** Recomeca com os dados de exemplo. Apaga tudo, por isso exige confirmacao. */
export async function resetSampleDataAction(): Promise<ActionResult> {
  const t = await getTranslate();
  const admin = await currentUserWithRole(ADMIN_ONLY);
  if (!admin) return { ok: false, message: t("error.noPermission") };

  await resetSampleData();

  revalidatePath("/", "layout");
  return { ok: true, message: t("admin.seedDone") };
}
