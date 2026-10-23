import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { CancellationService, TicketNotFoundError } from "@/modules/bilheteria";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Route Handler para Consulta de Ingresso Individual por ID (TC-12 / TC-18)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole && userRole !== "ATENDENTE" && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem autorizacao para consultar ingressos." },
      { status: 403 }
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado na requisicao." },
      { status: 401 }
    );
  }

  try {
    const ticket = await CancellationService.getTicketById(params.id, tenantId);
    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar ingresso" },
      { status: 500 }
    );
  }
}
