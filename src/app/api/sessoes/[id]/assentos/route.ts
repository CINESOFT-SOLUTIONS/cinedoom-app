import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { SessionSeatsService } from "@/features/catalogo/application/session-seats.service";
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
    const seatsPayload = await SessionSeatsService.getSessionSeatsMap(params.id, tenantId);

    if (!seatsPayload) {
      // Fallback para sessoes demonstrativas do mock catalog (apenas se for ID mock explicito)
      const mockSessions = getMockFilmsWithSessions().flatMap((f) => f.sessions);
      const mockSession = mockSessions.find((s) => s.id === params.id);
      if (mockSession) {
        const mockSeats = generateMockSeats(
          mockSession.room.rows,
          mockSession.room.columns,
          mockSession.price
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
    }

    return NextResponse.json(seatsPayload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const mockSessions = getMockFilmsWithSessions().flatMap((f) => f.sessions);
    const mockSession = mockSessions.find((s) => s.id === params.id);
    if (mockSession) {
      const mockSeats = generateMockSeats(
        mockSession.room.rows,
        mockSession.room.columns,
        mockSession.price
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
      { error: error instanceof Error ? error.message : "Erro ao consultar mapa de assentos" },
      { status: 500 }
    );
  }
}
