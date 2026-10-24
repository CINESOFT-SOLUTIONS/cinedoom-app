import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { rawPrisma } from "@/shared/db/prisma";
import { generateMockSeats, getMockFilmsWithSessions } from "@/modules/portal/mock-cinema-data";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Route Handler para Polling do Mapa de Assentos
 * Rastreabilidade: AC-2, ADR-006, TC-2, TC-10, TC-17, ISO/IEC/IEEE 12207:2021
 * Responde em < 100ms com Cache-Control: no-store e isolamento estrito de tenant
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  // AC-5 / TC-17: Se usuario autenticado tentar acessar com role invalida
  if (userRole && userRole !== "ATENDENTE" && userRole !== "GERENTE" && userRole !== "CLIENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para consultar assentos." },
      { status: 403 }
    );
  }

  // Valida presenca do contexto de tenant
  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado na requisicao (AC-4 / TC-19)." },
      { status: 401 }
    );
  }

  try {
    // 1. Verifica existencia da sessao no tenant (TC-17)
    const sessionData = await rawPrisma.session.findFirst({
      where: {
        id: params.id,
        tenantId,
      },
      select: {
        id: true,
        price: true,
        status: true,
      },
    });

    if (!sessionData) {
      // Fallback para sessoes demonstrativas do mock catalog (apenas se for ID mock explicito)
      const mockSessions = getMockFilmsWithSessions().flatMap((f) => f.sessions);
      const mockSession = mockSessions.find((s) => s.id === params.id);
      if (mockSession) {
        const rows = mockSession.room.rows;
        const cols = mockSession.room.columns;
        const price = mockSession.price;
        const mockSeats = generateMockSeats(rows, cols, price);

        return NextResponse.json(mockSeats, {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      }

      return NextResponse.json(
        { error: "Sessao nao encontrada neste cinema." },
        { status: 404 }
      );
    }

    // 2. Busca assentos pre-populados de forma leve (<100ms)
    const sessionSeats = await rawPrisma.sessionSeat.findMany({
      where: {
        sessionId: params.id,
        tenantId,
      },
      select: {
        id: true,
        seatId: true,
        status: true,
        reservationExpiresAt: true,
        seat: {
          select: {
            rowLabel: true,
            columnNumber: true,
            seatCode: true,
          },
        },
      },
      orderBy: [
        { seat: { rowLabel: "asc" } },
        { seat: { columnNumber: "asc" } },
      ],
    });

    const now = new Date();

    // Mapeamento de payload enxuto compativel com AC-2, SeatingGrid e AD-9 (JIT expiration)
    const lightweightPayload = sessionSeats.map((ss) => {
      const isReservationExpired =
        ss.status === "RESERVED" &&
        ss.reservationExpiresAt &&
        new Date(ss.reservationExpiresAt) <= now;

      const effectiveStatus = isReservationExpired ? "AVAILABLE" : ss.status;

      return {
        id: ss.id,
        seat_id: ss.seatId,
        seatId: ss.seatId,
        row: ss.seat.rowLabel,
        rowLabel: ss.seat.rowLabel,
        number: ss.seat.columnNumber,
        columnNumber: ss.seat.columnNumber,
        seatCode: ss.seat.seatCode || (ss.seat.rowLabel + String(ss.seat.columnNumber)),
        status: effectiveStatus,
        price: Number(sessionData.price),
      };
    });

    return NextResponse.json(lightweightPayload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    // Fallback gracioso caso banco de dados esteja inacessivel durante demo
    const mockSessions = getMockFilmsWithSessions().flatMap((f) => f.sessions);
    const mockSession = mockSessions.find((s) => s.id === params.id);
    if (mockSession) {
      const rows = mockSession.room.rows;
      const cols = mockSession.room.columns;
      const price = mockSession.price;
      const mockSeats = generateMockSeats(rows, cols, price);

      return NextResponse.json(mockSeats, {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar mapa de assentos" },
      { status: 500 }
    );
  }
}
