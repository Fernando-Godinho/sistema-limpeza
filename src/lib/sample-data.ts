import { randomUUID } from "node:crypto";

import { addDays, todayISO } from "./dates";
import { prisma } from "./db";
import type { Shift } from "./domain";
import { hashPin } from "./pin";
import { samplePng } from "./sample-png";
import { clearPhotosDir, photosDir, savePhotoFile } from "./storage";

/**
 * Dados de exemplo do sistema.
 *
 * Servem para o gestor conhecer o aplicativo funcionando e para os testes de
 * usabilidade. Podem ser apagados e recriados pelo painel do gestor.
 *
 * ATENCAO: os PINs abaixo sao de demonstracao e aparecem tambem no README.
 * Antes de usar de verdade, troque todos eles.
 */

/*
 * Quem entra no sistema e o lider e o gestor: sao eles que operam o
 * aplicativo no dia a dia. Os colaboradores ficam no cadastro para dizer quem
 * fez cada servico, mas nao tem PIN e nao tem tela propria.
 */
const DEMO_PINS = { admin: "1000", leader: "2000", secondLeader: "2001" } as const;

type SeededAccount = {
  name: string;
  role: "ADMIN" | "LEADER" | "WORKER";
  pin?: string;
  locale: string;
  shift: Shift;
  /** Lider que responde pela pessoa. Vazio para lider e gestor. */
  leader?: string;
};

/*
 * Duas equipes de exemplo, uma de manha e outra de tarde: e assim que o
 * sistema funciona de verdade. O lider so ve a propria equipe.
 */
const ACCOUNTS: SeededAccount[] = [
  { name: "Carla Nogueira", role: "ADMIN", pin: DEMO_PINS.admin, locale: "pt-BR", shift: "MORNING" },
  { name: "Marcos Oliveira", role: "LEADER", pin: DEMO_PINS.leader, locale: "pt-BR", shift: "MORNING" },
  { name: "Sandra Ribeiro", role: "LEADER", pin: DEMO_PINS.secondLeader, locale: "pt-BR", shift: "AFTERNOON" },
  { name: "Maria Aparecida Souza", role: "WORKER", locale: "pt-BR", shift: "MORNING", leader: "Marcos Oliveira" },
  { name: "Rosa Quispe Mamani", role: "WORKER", locale: "es", shift: "MORNING", leader: "Marcos Oliveira" },
  { name: "João Batista Lima", role: "WORKER", locale: "pt-BR", shift: "MORNING", leader: "Marcos Oliveira" },
  { name: "Antônia Pereira", role: "WORKER", locale: "pt-BR", shift: "MORNING", leader: "Marcos Oliveira" },
  { name: "Ana Lucía Rojas", role: "WORKER", locale: "es", shift: "AFTERNOON", leader: "Sandra Ribeiro" },
  { name: "Francisca da Silva", role: "WORKER", locale: "pt-BR", shift: "AFTERNOON", leader: "Sandra Ribeiro" },
  { name: "Carlos Mendoza", role: "WORKER", locale: "es", shift: "AFTERNOON", leader: "Sandra Ribeiro" },
  { name: "Yusuf Demir", role: "WORKER", locale: "en", shift: "AFTERNOON", leader: "Sandra Ribeiro" },
];

const LOCATIONS = [
  { name: "Escritório Central", address: "Av. Paulista, 1200", notes: "Chave na portaria." },
  { name: "Clínica São Lucas", address: "Rua das Flores, 85", notes: "Usar luva e máscara." },
  { name: "Colégio Nova Era", address: "Rua Aurora, 340", notes: "Evitar a hora do recreio." },
  { name: "Academia Corpo em Forma", address: "Av. Ipiranga, 910", notes: "" },
  { name: "Restaurante Bom Prato", address: "Rua do Mercado, 22", notes: "Sempre depois das 15h." },
  { name: "Hotel Aurora", address: "Rua da Praia, 55", notes: "Avisar na recepção ao chegar." },
];

/// O catalogo e so o nome do servico.
const TASK_TYPES = [
  { name: "Limpeza de banheiros" },
  { name: "Limpeza de salas" },
  { name: "Limpeza de cozinha" },
  { name: "Retirar o lixo" },
  { name: "Passar pano no chão" },
  { name: "Higienizar bebedouros" },
  { name: "Limpeza pesada" },
  { name: "Regar as plantas" },
];

const PHOTO_COLORS: Array<[[number, number, number], [number, number, number]]> = [
  [
    [22, 78, 140],
    [46, 120, 190],
  ],
  [
    [30, 110, 70],
    [80, 160, 110],
  ],
  [
    [120, 70, 20],
    [190, 130, 60],
  ],
  [
    [90, 40, 110],
    [150, 90, 170],
  ],
];

let photoColorCursor = 0;

async function createSamplePhoto(options: {
  kind: "END";
  assignmentId: string;
  uploadedById: string;
  createdAt: Date;
}) {
  const colors = PHOTO_COLORS[photoColorCursor % PHOTO_COLORS.length];
  photoColorCursor += 1;

  const fileName = `${randomUUID()}.png`;
  const data = samplePng(480, 360, colors[0], colors[1]);
  await savePhotoFile(fileName, data);

  return prisma.photo.create({
    data: {
      kind: options.kind,
      fileName,
      mimeType: "image/png",
      size: data.length,
      width: 480,
      height: 360,
      assignmentId: options.assignmentId,
      uploadedById: options.uploadedById,
      createdAt: options.createdAt,
    },
  });
}

function at(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

/** Apaga tudo e recria os dados de exemplo. */
export async function resetSampleData(): Promise<void> {
  await clearPhotosDir();

  // A ordem importa por causa das ligacoes entre as tabelas.
  await prisma.occurrence.deleteMany();
  await prisma.assignmentEvent.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.taskType.deleteMany();
  await prisma.appSetting.deleteMany();

  const users = new Map<string, string>();
  // Duas passadas: primeiro lider e gestor, que nao tem lider; depois as
  // equipes, que precisam do lider ja criado.
  for (const account of ACCOUNTS.filter((item) => item.role !== "WORKER")) {
    const created = await prisma.user.create({
      data: {
        name: account.name,
        role: account.role,
        locale: account.locale,
        shift: account.shift,
        pinHash: account.pin ? await hashPin(account.pin) : null,
      },
      select: { id: true, name: true },
    });
    users.set(account.name, created.id);
  }

  for (const account of ACCOUNTS.filter((item) => item.role === "WORKER")) {
    const created = await prisma.user.create({
      data: {
        name: account.name,
        role: account.role,
        locale: account.locale,
        shift: account.shift,
        leaderId: account.leader ? users.get(account.leader) ?? null : null,
        pinHash: null,
      },
      select: { id: true, name: true },
    });
    users.set(account.name, created.id);
  }

  const locations = new Map<string, string>();
  for (const location of LOCATIONS) {
    const created = await prisma.location.create({
      data: location,
      select: { id: true, name: true },
    });
    locations.set(location.name, created.id);
  }

  const tasks = new Map<string, string>();
  for (const task of TASK_TYPES) {
    const created = await prisma.taskType.create({
      data: task,
      select: { id: true, name: true },
    });
    tasks.set(task.name, created.id);
  }

  const today = todayISO();
  const yesterday = addDays(today, -1);
  const leaderId = users.get("Marcos Oliveira")!;

  // Presencas de hoje: a maioria presente, com duas ausencias justificadas.
  const attendance: Array<{ name: string; status: string; reasonCode?: string; note?: string }> = [
    { name: "Maria Aparecida Souza", status: "PRESENT" },
    { name: "Rosa Quispe Mamani", status: "PRESENT" },
    { name: "João Batista Lima", status: "PRESENT" },
    { name: "Ana Lucía Rojas", status: "PRESENT" },
    { name: "Francisca da Silva", status: "PRESENT" },
    { name: "Carlos Mendoza", status: "PRESENT" },
    { name: "Antônia Pereira", status: "ABSENT", reasonCode: "SICK", note: "Avisou por telefone de manhã." },
    { name: "Yusuf Demir", status: "ABSENT", reasonCode: "VACATION" },
  ];
  for (const row of attendance) {
    await prisma.attendance.create({
      data: {
        date: today,
        userId: users.get(row.name)!,
        status: row.status,
        reasonCode: row.reasonCode ?? null,
        note: row.note ?? null,
        markedById: leaderId,
      },
    });
  }

  type SeededService = {
    worker: string;
    location: string;
    task: string;
    status: "PENDING" | "IN_PROGRESS" | "DONE";
    date?: string;
    startedAt?: string;
    completedAt?: string;
  };

  const services: SeededService[] = [
    {
      worker: "Maria Aparecida Souza",
      location: "Escritório Central",
      task: "Limpeza de banheiros",
      status: "DONE",
      startedAt: "07:10",
      completedAt: "08:05",
    },
    {
      worker: "Ana Lucía Rojas",
      location: "Academia Corpo em Forma",
      task: "Passar pano no chão",
      status: "DONE",
      startedAt: "07:30",
      completedAt: "08:40",
    },
    {
      worker: "Rosa Quispe Mamani",
      location: "Clínica São Lucas",
      task: "Limpeza de salas",
      status: "IN_PROGRESS",
      startedAt: "08:20",
    },
    { worker: "Maria Aparecida Souza", location: "Escritório Central", task: "Limpeza de cozinha", status: "PENDING" },
    { worker: "João Batista Lima", location: "Colégio Nova Era", task: "Limpeza de banheiros", status: "PENDING" },
    { worker: "Francisca da Silva", location: "Restaurante Bom Prato", task: "Limpeza de cozinha", status: "PENDING" },
    { worker: "Carlos Mendoza", location: "Hotel Aurora", task: "Limpeza pesada", status: "PENDING" },
    { worker: "Yusuf Demir", location: "Colégio Nova Era", task: "Regar as plantas", status: "PENDING" },
    // Dia anterior, para a tela de servicos ter historico.
    {
      worker: "João Batista Lima",
      location: "Colégio Nova Era",
      task: "Limpeza de salas",
      status: "DONE",
      date: yesterday,
      startedAt: "13:00",
      completedAt: "14:20",
    },
    {
      worker: "Francisca da Silva",
      location: "Hotel Aurora",
      task: "Higienizar bebedouros",
      status: "DONE",
      date: yesterday,
      startedAt: "09:00",
      completedAt: "09:40",
    },
  ];

  for (const service of services) {
    const date = service.date ?? today;
    const workerId = users.get(service.worker)!;
    const created = await prisma.assignment.create({
      data: {
        date,
        locationId: locations.get(service.location)!,
        taskTypeId: tasks.get(service.task)!,
        workerId,
        createdById: leaderId,
        status: service.status,
        startedAt: service.startedAt ? at(date, service.startedAt) : null,
        completedAt: service.completedAt ? at(date, service.completedAt) : null,
        createdAt: at(date, "06:30"),
      },
      select: { id: true },
    });

    await prisma.assignmentEvent.create({
      data: {
        assignmentId: created.id,
        type: "CREATED",
        byId: leaderId,
        createdAt: at(date, "06:30"),
      },
    });

    if (service.startedAt) {
      await prisma.assignmentEvent.create({
        data: {
          assignmentId: created.id,
          type: "STARTED",
          byId: leaderId,
          createdAt: at(date, service.startedAt),
        },
      });
    }

    if (service.completedAt) {
      // A foto do servico pronto e tirada pelo lider e e sempre exigida.
      await createSamplePhoto({
        kind: "END",
        assignmentId: created.id,
        uploadedById: leaderId,
        createdAt: at(date, service.completedAt),
      });
      await prisma.assignmentEvent.create({
        data: {
          assignmentId: created.id,
          type: "PHOTO_ADDED",
          meta: "END",
          byId: leaderId,
          createdAt: at(date, service.completedAt),
        },
      });
      await prisma.assignmentEvent.create({
        data: {
          assignmentId: created.id,
          type: "COMPLETED",
          byId: leaderId,
          createdAt: at(date, service.completedAt),
        },
      });
    }
  }

  // Um problema avisado por uma colaboradora, para a tela de detalhes ter exemplo.
  const rosaService = await prisma.assignment.findFirst({
    where: { date: today, workerId: users.get("Rosa Quispe Mamani")! },
    select: { id: true },
  });
  if (rosaService) {
    await prisma.occurrence.create({
      data: {
        assignmentId: rosaService.id,
        byId: leaderId,
        reasonCode: "MISSING_SUPPLIES",
        note: "Faltou sabão líquido na sala 3.",
        createdAt: at(today, "08:45"),
      },
    });
  }

  await prisma.appSetting.createMany({
    data: [
      { key: "defaultLocale", value: "pt-BR" },
      { key: "showFlags", value: "true" },
    ],
  });

  await prisma.appSetting.create({ data: { key: "seededAt", value: new Date().toISOString() } });
}

/** Lista de PINs de demonstracao, para imprimir no console e no README. */
export function demoPinSummary(): string[] {
  return ACCOUNTS.filter((account) => account.pin).map(
    (account) => `${account.name} (${account.role}) -> PIN ${account.pin}`,
  );
}

export function photosDirectoryForLog(): string {
  return photosDir();
}
