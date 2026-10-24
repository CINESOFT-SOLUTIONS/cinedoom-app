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
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Gerente Geral CineDoom",
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
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Atendente Bilheteria",
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
        title: "Vingadores: Ultimato",
        director: "Anthony Russo, Joe Russo",
        durationMinutes: 181,
        rating: "12",
        synopsis: "Os Vingadores se reúnem para reverter o estalo.",
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
      name: "Sala 1 - Confort",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
    create: {
      id: "00000000-0000-4000-a000-000000000201",
      tenantId: tenant.id,
      name: "Sala 1 - Confort",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
  });

  const sala2 = await prisma.room.upsert({
    where: { id: "00000000-0000-4000-a000-000000000202" },
    update: {
      name: "Sala 2 - Confort",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
    create: {
      id: "00000000-0000-4000-a000-000000000202",
      tenantId: tenant.id,
      name: "Sala 2 - Confort",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
  });

  const sala3 = await prisma.room.upsert({
    where: { id: "00000000-0000-4000-a000-000000000203" },
    update: {
      name: "Sala 3 - IMAX Laser",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
    create: {
      id: "00000000-0000-4000-a000-000000000203",
      tenantId: tenant.id,
      name: "Sala 3 - IMAX Laser",
      capacity: 120,
      layoutMetadata: { rows: 10, columns: 12, totalSeats: 120 },
    },
  });

  const sala4 = await prisma.room.upsert({
    where: { id: "00000000-0000-4000-a000-000000000204" },
    update: {
      name: "Sala 4 - VIP Prime",
      capacity: 60,
      layoutMetadata: { rows: 6, columns: 10, totalSeats: 60 },
    },
    create: {
      id: "00000000-0000-4000-a000-000000000204",
      tenantId: tenant.id,
      name: "Sala 4 - VIP Prime",
      capacity: 60,
      layoutMetadata: { rows: 6, columns: 10, totalSeats: 60 },
    },
  });

  // Gera assentos garantindo a matriz correta de capacidade
  async function ensureSeats(roomId: string, rows: number, cols: number) {
    const targetCount = rows * cols;
    const existing = await prisma.seat.count({ where: { roomId } });
    if (existing === targetCount) return;

    if (existing > 0 && existing !== targetCount) {
      await prisma.sessionSeat.deleteMany({
        where: { seat: { roomId } },
      });
      await prisma.seat.deleteMany({ where: { roomId } });
    }

    const seats = [];
    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 1; c <= cols; c++) {
        seats.push({
          roomId,
          tenantId: tenant.id,
          rowLabel,
          columnNumber: c,
          seatCode: `${rowLabel}${c}`,
          status: "AVAILABLE" as any,
        });
      }
    }
    await prisma.seat.createMany({ data: seats });
  }

  await ensureSeats(sala1.id, 10, 12); // 120 assentos
  await ensureSeats(sala2.id, 10, 12); // 120 assentos
  await ensureSeats(sala3.id, 10, 12); // 120 assentos
  await ensureSeats(sala4.id, 6, 10);  // 60 assentos

  // 5) Sessoes do dia corrente
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  async function criarSessao(filmId: string, roomId: string, hora: number, price: number) {
    const startsAt = new Date(hoje);
    startsAt.setHours(hora, 0, 0, 0);
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

  // Sessoes nas 4 salas oficiais CineDoom
  const sessaoLotada = await criarSessao(filmes[0].id, sala3.id, 19, 42.0); // Duna no IMAX
  await criarSessao(filmes[0].id, sala3.id, 21, 42.0);                      // Duna no IMAX 21h
  const sessaoNormal = await criarSessao(filmes[1].id, sala4.id, 20, 54.0); // Oppenheimer no VIP
  await criarSessao(filmes[2].id, sala1.id, 18, 32.0);                      // Pobres Criaturas na Sala 1
  await criarSessao(filmes[3].id, sala2.id, 16, 32.0);                      // Divertida Mente 2 na Sala 2

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
        price: 39.9,
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
