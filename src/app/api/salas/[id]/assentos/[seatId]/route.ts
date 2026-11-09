import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { rawPrisma } from "@/shared/db/prisma";
import { toggleSeatMaintenance } from "@/modules/portal/mock-cinema-data";

interface RouteParams {
  params: {
    id: string;
    seatId: string;
  };
}

/**
 * Alterna o bloqueio de manutencao de um assento fisico na sala
 * Afeta sessoes futuras e a persistencia fisica da poltrona (AC-5, TASK-7)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para gerenciar assentos das salas." },
      { status: 403 }
    );
  }

  const { id: roomId, seatId } = params;

  // Atualiza no cache/memoria de fallback (para mocks resilientes)
  const toggledInMock = toggleSeatMaintenance(seatId);

  // Tenta persistir no banco de dados se conectado
  if (tenantId) {
    try {
      const seat = await rawPrisma.seat.findFirst({
        where: { id: seatId, roomId, tenantId },
      });

      if (seat) {
        const nextStatus = seat.status === "BLOCKED" ? "AVAILABLE" : "BLOCKED";
        const updated = await rawPrisma.seat.update({
          where: { id: seat.id },
          data: { status: nextStatus },
        });

        // Sincroniza em sessões abertas/agendadas futuras
        const openSessions = await rawPrisma.session.findMany({
          where: {
            roomId,
            tenantId,
            status: { in: ["OPEN", "SCHEDULED"] },
            startsAt: { gte: new Date() },
          },
          select: { id: true },
        });

        if (openSessions.length > 0) {
          const sessionIds = openSessions.map((s) => s.id);
          await rawPrisma.sessionSeat.updateMany({
            where: {
              sessionId: { in: sessionIds },
              seatId: seat.id,
              status: nextStatus === "BLOCKED" ? "AVAILABLE" : "BLOCKED",
            },
            data: {
              status: nextStatus === "BLOCKED" ? "BLOCKED" : "AVAILABLE",
            },
          });
        }

        return NextResponse.json({
          success: true,
          seatId: updated.id,
          status: updated.status,
        });
      }
    } catch {
      // Falha de banco, usa retorno de memoria
    }
  }

  return NextResponse.json({
    success: true,
    seatId,
    status: toggledInMock ? "BLOCKED" : "AVAILABLE",
  });
}

