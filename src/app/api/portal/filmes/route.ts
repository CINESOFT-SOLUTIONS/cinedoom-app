import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "@/shared/db/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const headerTenantId = request.headers.get("x-tenant-id");
  const queryTenantId = searchParams.get("tenantId");
  let tenantId = headerTenantId || queryTenantId;

  if (!tenantId) {
    const defaultTenant = await rawPrisma.tenant.findFirst({
      where: { active: true },
      select: { id: true },
    });
    tenantId = defaultTenant?.id || null;
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Nenhum cinema/tenant ativo encontrado." },
      { status: 404 }
    );
  }

  try {
    const now = new Date();
    const films = await rawPrisma.film.findMany({
      where: {
        tenantId,
      },
      include: {
        sessions: {
          where: {
            tenantId,
            status: { not: "CANCELLED" },
            startsAt: { gt: now },
          },
          include: {
            room: true,
          },
          orderBy: {
            startsAt: "asc",
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    });

    const payload = films.map((film) => ({
      id: film.id,
      title: film.title,
      director: film.director,
      synopsis: film.synopsis,
      duration: film.durationMinutes,
      classification: film.rating,
      genre: film.director || "Cinema",
      posterUrl: film.posterUrl,
      sessions: film.sessions.map((session) => ({
        id: session.id,
        startsAt: session.startsAt,
        price: Number(session.price),
        status: session.status,
        room: {
          id: session.room.id,
          name: session.room.name,
          capacity: session.room.capacity,
        },
      })),
    }));

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar catalogo publico de filmes." },
      { status: 500 }
    );
  }
}
