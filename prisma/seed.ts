import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { hashCPF, encryptCPF } from "../src/modules/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed CineDoom...");

  // 1) Tenants
  const tenant1 = await prisma.tenant.upsert({
    where: { slug: "cinemax-goiania" },
    update: {},
    create: {
      name: "CineMax Goiânia",
      slug: "cinemax-goiania",
      active: true,
    },
  });

  const tenant2 = await prisma.tenant.upsert({
    where: { slug: "cineart-brasilia" },
    update: {},
    create: {
      name: "CineArt Brasília",
      slug: "cineart-brasilia",
      active: true,
    },
  });

  const tenant = tenant1;

  // 2) Usuarios
  const gerentePass = await bcrypt.hash("Cinema123!", 12);
  const atendentePass = await bcrypt.hash("Cinema123!", 12);

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "gerente@cinedoom.com",
      },
    },
    update: {
      name: "Eduardo Vasconcelos",
    },
    create: {
      tenantId: tenant.id,
      name: "Eduardo Vasconcelos",
      email: "gerente@cinedoom.com",
      passwordHash: gerentePass,
      role: "GERENTE",
      active: true,
    },
  });

  await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "atendente@cinedoom.com",
      },
    },
    update: {
      name: "Camila Ribeiro",
    },
    create: {
      tenantId: tenant.id,
      name: "Camila Ribeiro",
      email: "atendente@cinedoom.com",
      passwordHash: atendentePass,
      role: "ATENDENTE",
      active: true,
    },
  });

  // 3) Filmes
  const filmes = await Promise.all([
    prisma.film.upsert({
      where: { id: "00000000-0000-4000-a000-000000000101" },
      update: {},
      create: {
        id: "00000000-0000-4000-a000-000000000101",
        tenantId: tenant.id,
        title: "Duna: Parte Dois",
        director: "Denis Villeneuve",
        durationMinutes: 166,
        rating: "14",
        synopsis: "Paul Atreides se une a Chani e aos Fremen.",
        posterUrl: "/posters/duna-2.jpg",
      },
    }),
    prisma.film.upsert({
      where: { id: "00000000-0000-4000-a000-000000000102" },
      update: {},
      create: {
        id: "00000000-0000-4000-a000-000000000102",
        tenantId: tenant.id,
        title: "Oppenheimer",
        director: "Christopher Nolan",
        durationMinutes: 180,
        rating: "16",
        synopsis: "A história do físico J. Robert Oppenheimer.",
        posterUrl: "/posters/oppenheimer.jpg",
      },
    }),
    prisma.film.upsert({
      where: { id: "00000000-0000-4000-a000-000000000103" },
      update: {},
      create: {
        id: "00000000-0000-4000-a000-000000000103",
        tenantId: tenant.id,
        title: "Pobres Criaturas",
        director: "Yorgos Lanthimos",
        durationMinutes: 141,
        rating: "18",
        synopsis: "A fantástica evolução de Bella Baxter, uma jovem trazida de volta à vida pelo Dr. Godwin Baxter.",
        posterUrl: "/posters/pobres-criaturas.jpg",
      },
    }),
    prisma.film.upsert({
      where: { id: "00000000-0000-4000-a000-000000000104" },
      update: {},
      create: {
        id: "00000000-0000-4000-a000-000000000104",
        tenantId: tenant.id,
        title: "Divertida Mente 2",
        director: "Kelsey Mann",
        durationMinutes: 96,
        rating: "L",
        synopsis: "Riley enfrenta novas emoções na adolescência.",
        posterUrl: "/posters/divertida-mente-2.jpg",
      },
    }),
  ]);

  // 4) 4 Salas Oficiais CineDoom (Total: 420 assentos)
  const sala1 = await prisma.room.upsert({
    where: { id: "00000000-0000-4000-a000-000000000201" },
    update: {
      name: "Sala 01",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
    create: {
      id: "00000000-0000-4000-a000-000000000201",
      tenantId: tenant.id,
      name: "Sala 01",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
  });

  const sala2 = await prisma.room.upsert({
    where: { id: "00000000-0000-4000-a000-000000000202" },
    update: {
      name: "Sala 02",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
    create: {
      id: "00000000-0000-4000-a000-000000000202",
      tenantId: tenant.id,
      name: "Sala 02",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
  });

  const sala3 = await prisma.room.upsert({
    where: { id: "00000000-0000-4000-a000-000000000203" },
    update: {
      name: "Sala 03",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
    create: {
      id: "00000000-0000-4000-a000-000000000203",
      tenantId: tenant.id,
      name: "Sala 03",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
  });

  const sala4 = await prisma.room.upsert({
    where: { id: "00000000-0000-4000-a000-000000000204" },
    update: {
      name: "Sala 04",
      capacity: 60,
      layoutMetadata: { rows: 6, columns: 10, totalSeats: 60 },
    },
    create: {
      id: "00000000-0000-4000-a000-000000000204",
      tenantId: tenant.id,
      name: "Sala 04",
      capacity: 60,
      layoutMetadata: { rows: 6, columns: 10, totalSeats: 60 },
    },
  });

  // Gera assentos garantindo a matriz correta de capacidade
  async function ensureSeats(roomId: string, rows: number, cols: number) {
    const existingSeats = await prisma.seat.findMany({ where: { roomId } });
    const existingMap = new Set(existingSeats.map((s) => `${s.rowLabel}${s.columnNumber}`));

    const seatsToCreate = [];
    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 1; c <= cols; c++) {
        const code = `${rowLabel}${c}`;
        if (!existingMap.has(code)) {
          seatsToCreate.push({
            roomId,
            tenantId: tenant.id,
            rowLabel,
            columnNumber: c,
            seatCode: code,
            status: "AVAILABLE" as any,
          });
        }
      }
    }
    if (seatsToCreate.length > 0) {
      await prisma.seat.createMany({ data: seatsToCreate });
    }
  }

  await ensureSeats(sala1.id, 10, 12); // 120 assentos
  await ensureSeats(sala2.id, 10, 12); // 120 assentos
  await ensureSeats(sala3.id, 10, 12); // 120 assentos
  await ensureSeats(sala4.id, 6, 10);  // 60 assentos

  // 5) Sessoes do dia corrente e proximos dias (Padrão Multiplex CineDoom)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  async function criarSessao(
    filmId: string,
    roomId: string,
    hora: number,
    price: number,
    minuto = 0,
    diaOffset = 0
  ) {
    const startsAt = new Date(hoje);
    startsAt.setDate(startsAt.getDate() + diaOffset);
    startsAt.setHours(hora, minuto, 0, 0);
    const session = await prisma.session.create({
      data: {
        tenantId: tenant.id,
        filmId,
        roomId,
        startsAt,
        price,
        status: "OPEN",
      },
    });

    const seats = await prisma.seat.findMany({ where: { roomId, tenantId: tenant.id } });
    await prisma.sessionSeat.createMany({
      data: seats.map((s) => ({
        sessionId: session.id,
        seatId: s.id,
        tenantId: tenant.id,
        status: "AVAILABLE",
      })),
    });
    return session;
  }

  // 5) Sessoes cinematográficas oficiais da semana canônica (Total: 52 sessões semanais)
  // Ciclo Quinta a Quarta:
  // - Sala 01 (Clássica): Divertida Mente 2 (filmes[3])
  // - Sala 02 (Clássica): Oppenheimer (filmes[1])
  // - Sala 03 (IMAX): Duna: Parte Dois (filmes[0])
  // - Sala 04 (VIP): Pobres Criaturas (filmes[2])

  interface DayScheduleSlots {
    sala01: { hour: number; minute: number }[];
    sala02: { hour: number; minute: number }[];
    sala03: { hour: number; minute: number }[];
    sala04: { hour: number; minute: number }[];
  }

  const WEEKLY_SCHEDULE: Record<number, DayScheduleSlots> = {
    // Quinta (4)
    4: {
      sala01: [{ hour: 14, minute: 0 }, { hour: 19, minute: 0 }],
      sala02: [{ hour: 15, minute: 0 }, { hour: 20, minute: 0 }],
      sala03: [{ hour: 14, minute: 30 }, { hour: 19, minute: 30 }],
      sala04: [{ hour: 15, minute: 30 }, { hour: 20, minute: 30 }],
    },
    // Sexta (5)
    5: {
      sala01: [{ hour: 14, minute: 30 }, { hour: 19, minute: 30 }],
      sala02: [{ hour: 14, minute: 0 }, { hour: 19, minute: 0 }],
      sala03: [{ hour: 15, minute: 0 }, { hour: 20, minute: 0 }],
      sala04: [{ hour: 15, minute: 30 }, { hour: 20, minute: 30 }],
    },
    // Sábado (6)
    6: {
      sala01: [{ hour: 12, minute: 0 }, { hour: 16, minute: 0 }, { hour: 20, minute: 0 }],
      sala02: [{ hour: 13, minute: 0 }, { hour: 17, minute: 0 }, { hour: 21, minute: 0 }],
      sala03: [{ hour: 12, minute: 30 }, { hour: 16, minute: 30 }, { hour: 20, minute: 30 }],
      sala04: [{ hour: 13, minute: 30 }, { hour: 17, minute: 30 }, { hour: 21, minute: 30 }],
    },
    // Domingo (0)
    0: {
      sala01: [{ hour: 13, minute: 0 }, { hour: 17, minute: 0 }, { hour: 21, minute: 0 }],
      sala02: [{ hour: 12, minute: 0 }, { hour: 16, minute: 0 }, { hour: 20, minute: 0 }],
      sala03: [{ hour: 13, minute: 30 }, { hour: 17, minute: 30 }, { hour: 21, minute: 30 }],
      sala04: [{ hour: 12, minute: 30 }, { hour: 16, minute: 30 }, { hour: 20, minute: 30 }],
    },
    // Segunda (1)
    1: {
      sala01: [{ hour: 16, minute: 0 }],
      sala02: [{ hour: 17, minute: 0 }],
      sala03: [{ hour: 16, minute: 30 }],
      sala04: [{ hour: 17, minute: 30 }],
    },
    // Terça (2)
    2: {
      sala01: [{ hour: 17, minute: 0 }],
      sala02: [{ hour: 16, minute: 0 }],
      sala03: [{ hour: 17, minute: 30 }],
      sala04: [{ hour: 16, minute: 30 }],
    },
    // Quarta (3)
    3: {
      sala01: [{ hour: 16, minute: 30 }],
      sala02: [{ hour: 17, minute: 30 }],
      sala03: [{ hour: 16, minute: 0 }],
      sala04: [{ hour: 17, minute: 0 }],
    },
  };

  let sessaoLotada: any = null;

  for (let diaOffset = 0; diaOffset <= 6; diaOffset++) {
    const targetDate = new Date(hoje);
    targetDate.setDate(targetDate.getDate() + diaOffset);
    const weekday = targetDate.getDay();
    const daySlots = WEEKLY_SCHEDULE[weekday];
    if (!daySlots) continue;

    // Sala 01: Divertida Mente 2 (filmes[3])
    for (const slot of daySlots.sala01) {
      await criarSessao(filmes[3].id, sala1.id, slot.hour, 30.0, slot.minute, diaOffset);
    }

    // Sala 02: Oppenheimer (filmes[1])
    for (const slot of daySlots.sala02) {
      await criarSessao(filmes[1].id, sala2.id, slot.hour, 30.0, slot.minute, diaOffset);
    }

    // Sala 03: Duna: Parte Dois (filmes[0])
    for (const slot of daySlots.sala03) {
      const sess = await criarSessao(filmes[0].id, sala3.id, slot.hour, 30.0, slot.minute, diaOffset);
      if (!sessaoLotada && diaOffset === 0) {
        sessaoLotada = sess; // Guarda a primeira sessão de hoje para pré-lotação demo de ~90%
      }
    }

    // Sala 04: Pobres Criaturas (filmes[2])
    for (const slot of daySlots.sala04) {
      await criarSessao(filmes[2].id, sala4.id, slot.hour, 30.0, slot.minute, diaOffset);
    }
  }

  // Pré-lotar ~90% da sessão lotada
  const ssLotados = await prisma.sessionSeat.findMany({
    where: { sessionId: sessaoLotada.id, tenantId: tenant.id },
  });
  const toSell = Math.floor(ssLotados.length * 0.9);
  const cpf = "52998224725";
  const buyer = await prisma.buyer.create({
    data: {
      tenantId: tenant.id,
      name: "Demo Comprador",
      email: "demo@cinedoom.com",
      cpfHash: hashCPF(cpf),
      cpfEncrypted: encryptCPF(cpf),
      lgpdConsentAt: new Date(),
    },
  });
  const atendente = await prisma.user.findFirst({ where: { email: "atendente@cinedoom.com", tenantId: tenant.id } });
  for (let i = 0; i < toSell; i++) {
    await prisma.sessionSeat.update({
      where: { id: ssLotados[i].id },
      data: { status: "SOLD" },
    });
    await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        sessionId: sessaoLotada.id,
        seatId: ssLotados[i].seatId,
        buyerId: buyer.id,
        soldByUserId: atendente!.id,
        status: "SOLD",
        price: 30.0,
      },
    });
  }

  console.log("✅ Seed concluído!");
  console.log(`Tenants: ${tenant1.name}, ${tenant2.name}`);
  console.log("Usuários: gerente@cinedoom.com / atendente@cinedoom.com (senha: Cinema123!)");
  console.log(`Sessão pré-lotada: ${toSell}/${ssLotados.length} assentos vendidos (~90%)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
