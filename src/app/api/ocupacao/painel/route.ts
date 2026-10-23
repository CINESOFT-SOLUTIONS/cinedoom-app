import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { getOccupancyPanel } from "@/modules/ocupacao";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: apenas GERENTE pode acessar o painel de ocupacao." },
      { status: 403 }
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado na requisicao." },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const roomId = searchParams.get("salaId") || searchParams.get("roomId") || undefined;
  const dateParam = searchParams.get("data") || searchParams.get("date");

  let date: Date | undefined;
  if (dateParam) {
    const parsed = new Date(dateParam);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  try {
    const panel = await getOccupancyPanel(tenantId, { roomId, date });
    return NextResponse.json(panel, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar painel de ocupacao" },
      { status: 500 }
    );
  }
}
