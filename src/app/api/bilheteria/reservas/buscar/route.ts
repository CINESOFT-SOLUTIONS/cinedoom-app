import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { CounterService, ReservationNotFoundError } from "@/features/bilheteria";

/**
 * Controller para Busca de Reserva no Balcao de Bilheteria
 * Rastreabilidade: Controller-Service-Repository, ISO/IEC/IEEE 12207:2021
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole && userRole !== "ATENDENTE" && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: apenas ATENDENTE ou GERENTE." },
      { status: 403 }
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado." },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("codigo") || searchParams.get("code");
  const cpf = searchParams.get("cpf");

  try {
    if (code) {
      const reservation = await CounterService.findReservationByCode(code, tenantId);
      return NextResponse.json(reservation, { status: 200 });
    }

    if (cpf) {
      const reservation = await CounterService.findReservationByCpf(cpf, tenantId);
      return NextResponse.json(reservation, { status: 200 });
    }

    return NextResponse.json(
      { error: "Informe codigo ou CPF para buscar reserva." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar reserva" },
      { status: 500 }
    );
  }
}
