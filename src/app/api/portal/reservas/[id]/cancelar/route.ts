import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { PortalService, PortalValidationError } from "@/modules/portal";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const headerUserId = request.headers.get("x-user-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const userId = session?.user?.id || headerUserId;
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (!userId || !tenantId) {
    return NextResponse.json(
      { error: "Autenticacao obrigatoria para cancelar reserva." },
      { status: 401 }
    );
  }

  if (userRole === "ATENDENTE" || userRole === "GERENTE") {
    return NextResponse.json(
      { error: "Acesso restrito ao proprio cliente." },
      { status: 403 }
    );
  }

  try {
    const reservation = await PortalService.cancelMyReservation(
      params.id,
      userId,
      tenantId
    );
    return NextResponse.json(
      {
        message: "Reserva cancelada com sucesso.",
        reservationId: reservation.id,
        status: reservation.status,
        cancelledAt: reservation.cancelledAt,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PortalValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao cancelar reserva" },
      { status: 500 }
    );
  }
}
