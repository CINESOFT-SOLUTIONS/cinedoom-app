import { NextRequest, NextResponse } from "next/server";
import { rawPrisma } from "@/shared/db/prisma";
import { SessionSeatsService } from "@/features/catalogo/application/session-seats.service";
import { generateMockSeats, getMockFilmsWithSessions } from "@/modules/portal/mock-cinema-data";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Route Handler Publico para Consulta do Mapa de Assentos
 * Permite que usuarios naveguem e selecionem assentos ANTES do login
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const sessionId = params.id;
  let tenantId = request.headers.get("x-tenant-id");

  try {
    if (!tenantId) {
      const sessionRecord = await rawPrisma.session.findUnique({
        where: { id: sessionId },
        select: { tenantId: true },
      }).catch(() => null);

      if (sessionRecord?.tenantId) {
        tenantId = sessionRecord.tenantId;
      } else {
        const defaultTenant = await rawPrisma.tenant.findFirst({
          where: { active: true },
          select: { id: true },
        }).catch(() => null);
        tenantId = defaultTenant?.id || null;
      }
    }

    if (tenantId) {
      const seatsPayload = await SessionSeatsService.getSessionSeatsMap(sessionId, tenantId);
      if (seatsPayload) {
        return NextResponse.json(seatsPayload, {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      }
    }

    // Fallback para sessoes mock demonstrativas
    const mockSessions = getMockFilmsWithSessions().flatMap((f) => f.sessions);
    const mockSession = mockSessions.find((s) => s.id === sessionId);
    if (mockSession) {
      const mockSeats = generateMockSeats(
        mockSession.room.rows,
        mockSession.room.columns,
        mockSession.price,
        sessionId
      );

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
  } catch (error) {
    // Fallback gracioso
    const mockSessions = getMockFilmsWithSessions().flatMap((f) => f.sessions);
    const mockSession = mockSessions.find((s) => s.id === sessionId);
    if (mockSession) {
      const mockSeats = generateMockSeats(
        mockSession.room.rows,
        mockSession.room.columns,
        mockSession.price,
        sessionId
      );
      return NextResponse.json(mockSeats, { status: 200 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar mapa de assentos" },
      { status: 500 }
    );
  }
}
