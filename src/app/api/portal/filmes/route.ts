import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "@/shared/db/prisma";
import { getMockFilmsWithSessions } from "@/modules/portal/mock-cinema-data";

export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json(getMockFilmsWithSessions(), { status: 200 });
    }

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

    if (!films || films.length === 0) {
      return NextResponse.json(getMockFilmsWithSessions(), { status: 200 });
    }

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
  } catch {
    // Fallback resiliente com catalogo oficial das 4 salas
    return NextResponse.json(getMockFilmsWithSessions(), { status: 200 });
  }
}
