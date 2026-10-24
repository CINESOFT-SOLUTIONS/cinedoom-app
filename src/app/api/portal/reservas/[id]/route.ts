import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { PortalService } from "@/modules/portal";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de cinema/tenant nao identificado na requisicao." },
      { status: 401 }
    );
  }

  try {
    const reservation = await PortalService.getReservationById(params.id, tenantId);
    if (!reservation) {
      return NextResponse.json(
        { error: "Reserva nao encontrada." },
        { status: 404 }
      );
    }
    return NextResponse.json(reservation, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar reserva." },
      { status: 500 }
    );
  }
}
