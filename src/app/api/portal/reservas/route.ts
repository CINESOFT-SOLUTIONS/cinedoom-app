import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { PortalService } from "@/modules/portal";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const userId = session?.user?.id || (request.headers.get("x-user-id") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (!userId || !tenantId) {
    return NextResponse.json(
      { error: "Autenticacao obrigatoria para consultar reservas." },
      { status: 401 }
    );
  }

  if (userRole && userRole !== "CLIENTE") {
    // Permite CLIENTE; se houver role mas nao for cliente, ainda bloqueia rotas privadas do portal
    // mas manter coerente com "painel do proprio cliente"
  }

  if (userRole === "ATENDENTE" || userRole === "GERENTE") {
    return NextResponse.json(
      { error: "Acesso restrito ao proprio cliente." },
      { status: 403 }
    );
  }

  try {
    const reservations = await PortalService.listMyReservations(userId, tenantId);
    return NextResponse.json(reservations, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar reservas" },
      { status: 500 }
    );
  }
}
