import "./load-env";

import { randomInt } from "node:crypto";

import colaboradores from "./data/colaboradores.json";
import { hashPin } from "../src/lib/pin";
import { prisma } from "../src/lib/db";
import { isShift, type Role, type Shift } from "../src/lib/domain";
import { clearPhotosDir } from "../src/lib/storage";

/**
 * Coloca a base de colaboradores da empresa dentro do sistema.
 *
 * A lista vem de prisma/data/colaboradores.json, gerada a partir da planilha
 * "SRA - Documentacao e Funcionais". So entra quem executa limpeza; as funcoes
 * administrativas ficam de fora. O turno de cada pessoa vem do horario de
 * trabalho e e o turno que diz qual lider responde por ela.
 *
 * Rodar de novo nao duplica ninguem: cada pessoa e encontrada pela matricula
 * junto com o nome. Quem ja tem PIN continua com o mesmo PIN.
 *
 *   npm run db:import               so atualiza a lista de pessoas
 *   npm run db:import -- --reset    apaga os servicos, presencas e as pessoas
 *                                   que nao estao na lista, e recomeca limpo
 */

type PersonEntry = {
  matricula: string;
  nome: string;
  funcao: string;
  horario: string;
  turno: string;
  papel: string;
};

const people = colaboradores.pessoas as PersonEntry[];
const reset = process.argv.includes("--reset");

/** PIN novo, sorteado. Quem entra no sistema precisa de um para o primeiro acesso. */
function newPin(): string {
  return String(randomInt(1000, 10000));
}

async function main() {
  if (reset) {
    console.log("Apagando servicos, presencas e fotos antigas...");
    await prisma.occurrence.deleteMany();
    await prisma.assignmentEvent.deleteMany();
    await prisma.photo.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.assignment.deleteMany();
    await clearPhotosDir();
  }

  const leaders = new Map<Shift, string>();
  const pins: Array<{ name: string; pin: string }> = [];

  // Primeiro os lideres: cada colaborador precisa de um lider para se ligar.
  for (const person of people) {
    if (person.papel !== "LEADER") continue;
    if (!isShift(person.turno)) {
      throw new Error(`Turno invalido para ${person.nome}: ${person.turno}`);
    }

    const existing = await prisma.user.findFirst({
      where: { employeeCode: person.matricula, name: person.nome },
      select: { id: true, pinHash: true },
    });

    const data = {
      name: person.nome,
      role: "LEADER" satisfies Role,
      shift: person.turno,
      jobTitle: person.funcao,
      workSchedule: person.horario,
      active: true,
      leaderId: null,
    };

    let id = existing?.id;
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
    } else {
      const created = await prisma.user.create({
        data: { ...data, employeeCode: person.matricula },
        select: { id: true },
      });
      id = created.id;
    }

    if (!existing?.pinHash) {
      const pin = newPin();
      await prisma.user.update({ where: { id }, data: { pinHash: await hashPin(pin) } });
      pins.push({ name: person.nome, pin });
    }

    leaders.set(person.turno, id!);
  }

  // Gestor: nao pertence a equipe de ninguem.
  for (const person of people) {
    if (person.papel !== "ADMIN") continue;
    const existing = await prisma.user.findFirst({
      where: { employeeCode: person.matricula, name: person.nome },
      select: { id: true, pinHash: true },
    });

    const data = {
      name: person.nome,
      role: "ADMIN" satisfies Role,
      shift: isShift(person.turno) ? person.turno : null,
      jobTitle: person.funcao,
      workSchedule: person.horario,
      active: true,
      leaderId: null,
    };

    let id = existing?.id;
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
    } else {
      const created = await prisma.user.create({
        data: { ...data, employeeCode: person.matricula },
        select: { id: true },
      });
      id = created.id;
    }

    if (!existing?.pinHash) {
      const pin = newPin();
      await prisma.user.update({ where: { id }, data: { pinHash: await hashPin(pin) } });
      pins.push({ name: person.nome, pin });
    }
  }

  let created = 0;
  let updated = 0;
  let noLeader = 0;

  for (const person of people) {
    if (person.papel !== "WORKER") continue;

    const shift = isShift(person.turno) ? person.turno : null;
    const leaderId = shift ? leaders.get(shift) ?? null : null;
    if (!leaderId) noLeader += 1;

    const data = {
      name: person.nome,
      role: "WORKER" satisfies Role,
      shift,
      jobTitle: person.funcao,
      workSchedule: person.horario,
      active: true,
      leaderId,
      // Colaborador nao entra no sistema, nem que alguem ja tenha dado um PIN.
      pinHash: null,
    };

    const existing = await prisma.user.findFirst({
      where: { employeeCode: person.matricula, name: person.nome },
      select: { id: true },
    });

    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.user.create({ data: { ...data, employeeCode: person.matricula } });
      created += 1;
    }
  }

  if (reset) {
    const codes = people.map((person) => person.matricula);
    const names = people.map((person) => person.nome);
    const removed = await prisma.user.deleteMany({
      where: {
        OR: [{ employeeCode: null }, { employeeCode: { notIn: codes } }],
        NOT: { name: { in: names } },
      },
    });
    if (removed.count > 0) console.log(`Pessoas fora da lista apagadas: ${removed.count}`);
  }

  const byShift = (["MORNING", "AFTERNOON", "NIGHT"] as const).map((shift) => {
    const count = people.filter((person) => person.papel === "WORKER" && person.turno === shift).length;
    const leader = [...leaders.entries()].find(([key]) => key === shift);
    const leaderName = leader ? people.find((person) => person.papel === "LEADER" && person.turno === shift)?.nome : "";
    return `  ${shift}: ${count} colaboradores, lider ${leaderName ?? "-"}`;
  });

  console.log("\nBase de colaboradores pronta.");
  console.log(`  lidas da planilha: ${people.length}`);
  console.log(`  criadas agora: ${created}`);
  console.log(`  atualizadas: ${updated}`);
  if (noLeader > 0) console.log(`  ATENCAO: ${noLeader} pessoas sem lider (turno sem lider cadastrado)`);
  console.log(byShift.join("\n"));

  if (pins.length > 0) {
    console.log("\nPINs criados agora. Anote e troque depois no painel do gestor:");
    for (const entry of pins) console.log(`  ${entry.name}: ${entry.pin}`);
  } else {
    console.log("\nNinguem ficou sem PIN de acesso: os PINs que ja existiam foram mantidos.");
  }
}

main()
  .catch((error) => {
    console.error("Nao foi possivel importar a base de colaboradores:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
