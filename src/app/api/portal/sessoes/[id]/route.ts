import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "@/shared/db/prisma";
import { getMockFilmsWithSessions } from "@/modules/portal/mock-cinema-data";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    if (session) {
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
    }
  } catch {
    // Continua para fallback em mock
  }

  // Fallback em memoria para demonstracao resiliente
  const allFilms = getMockFilmsWithSessions();
  for (const film of allFilms) {
    const s = film.sessions.find((sess) => sess.id === params.id);
    if (s) {
      return NextResponse.json(
        {
          id: s.id,
          tenantId: "00000000-0000-4000-a000-000000000001",
          cinemaName: "CineDoom Cinema",
          status: s.status,
          startsAt: s.startsAt,
          price: s.price,
          canReserveOnline: true,
          minutesUntilSession: 180,
          film: {
            id: film.id,
            title: film.title,
            synopsis: film.synopsis,
            duration: film.duration,
            classification: film.classification,
            genre: film.genre,
            posterUrl: film.posterUrl,
          },
          room: s.room,
        },
        { status: 200 }
      );
    }
  }

  // Se nao encontrou ID especifico, retorna primeira sessao mock (Sala 3 IMAX)
  const defaultFilm = allFilms[0];
  const defaultSession = defaultFilm.sessions[0];
  return NextResponse.json(
    {
      id: defaultSession.id,
      tenantId: "00000000-0000-4000-a000-000000000001",
      cinemaName: "CineDoom Cinema",
      status: defaultSession.status,
      startsAt: defaultSession.startsAt,
      price: defaultSession.price,
      canReserveOnline: true,
      minutesUntilSession: 180,
      film: {
        id: defaultFilm.id,
        title: defaultFilm.title,
        synopsis: defaultFilm.synopsis,
        duration: defaultFilm.duration,
        classification: defaultFilm.classification,
        genre: defaultFilm.genre,
        posterUrl: defaultFilm.posterUrl,
      },
      room: defaultSession.room,
    },
    { status: 200 }
  );
}
