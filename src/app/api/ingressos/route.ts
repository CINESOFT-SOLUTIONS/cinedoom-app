import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { CancellationService } from "@/modules/bilheteria";

/**
 * Route Handler para Listagem de Ingressos do Tenant (TC-12 / TC-18)
 */
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") || undefined;
  const statusParam = searchParams.get("status") as "SOLD" | "CANCELLED" | null;
  const status = statusParam || undefined;

  try {
    const tickets = await CancellationService.getTickets(tenantId, { sessionId, status });
    return NextResponse.json(tickets, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar ingressos" },
      { status: 500 }
    );
  }
}
