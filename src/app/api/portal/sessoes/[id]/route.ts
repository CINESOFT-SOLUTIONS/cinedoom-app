import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "@/shared/db/prisma";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { searchParams } = new URL(request.url);
  const headerTenantId = request.headers.get("x-tenant-id");
  const queryTenantId = searchParams.get("tenantId");

  try {
    const session = await rawPrisma.session.findUnique({
      where: {
        id: params.id,
      },
      include: {
        film: true,
        room: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sessao nao encontrada." },
        { status: 404 }
      );
    }

    const tenantId = headerTenantId || queryTenantId;
    if (tenantId && session.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Sessao nao pertence ao cinema informado." },
        { status: 404 }
      );
    }

    const now = new Date();
    const startsAt = new Date(session.startsAt);
    const msUntilSession = startsAt.getTime() - now.getTime();
    const canReserveOnline =
      session.status === "OPEN" && msUntilSession >= 60 * 60 * 1000;

    return NextResponse.json(
      {
        id: session.id,
        tenantId: session.tenantId,
        cinemaName: session.tenant.name,
        status: session.status,
        startsAt: session.startsAt,
        price: Number(session.price),
        canReserveOnline,
        minutesUntilSession: Math.floor(msUntilSession / (60 * 1000)),
        film: {
          id: session.film.id,
          title: session.film.title,
          synopsis: session.film.synopsis,
          duration: session.film.durationMinutes,
          classification: session.film.rating,
          genre: session.film.director || "Cinema",
          posterUrl: session.film.posterUrl,
        },
        room: {
          id: session.room.id,
          name: session.room.name,
          capacity: session.room.capacity,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar dados da sessao." },
      { status: 500 }
    );
  }
}
