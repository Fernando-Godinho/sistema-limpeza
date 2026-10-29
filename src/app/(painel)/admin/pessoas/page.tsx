import { prisma } from "@/lib/db";
import { isShift, type Role } from "@/lib/domain";

import { PeopleManager, type ManagedPerson } from "./people-manager";

/** Cadastro de pessoas: quem entra no sistema e o que cada uma faz. */
export default async function AdminPeoplePage() {
  const people = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      locale: true,
      avatarPhotoId: true,
      pinHash: true,
      employeeCode: true,
      shift: true,
      leader: { select: { name: true } },
      _count: { select: { services: true } },
    },
  });

  const managed: ManagedPerson[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role as Role,
    active: person.active,
    locale: person.locale,
    photoId: person.avatarPhotoId,
    photoUrl: person.avatarPhotoId ? `/api/photos/${person.avatarPhotoId}` : null,
    canSignIn: Boolean(person.pinHash),
    serviceCount: person._count.services,
    shift: isShift(person.shift) ? person.shift : null,
    leaderName: person.leader?.name ?? null,
    employeeCode: person.employeeCode,
  }));

  return <PeopleManager people={managed} />;
}
