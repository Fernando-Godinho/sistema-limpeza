import { getTranslate } from "@/i18n/server";
import { prisma } from "@/lib/db";

import { LocationsManager, type ManagedLocation } from "./locations-manager";

/** Cadastro dos locais onde o servico acontece. */
export default async function AdminLocationsPage() {
  const t = await getTranslate();

  const locations = await prisma.location.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      address: true,
      notes: true,
      active: true,
      _count: { select: { services: true } },
    },
  });

  const managed: ManagedLocation[] = locations.map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
    notes: location.notes,
    active: location.active,
    serviceCount: location._count.services,
  }));

  return (
    <LocationsManager
      locations={managed}
      summary={t("admin.locationsCount", { count: locations.length })}
    />
  );
}
