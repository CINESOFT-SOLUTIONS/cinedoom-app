import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  CounterService,
  ReservationNotFoundError,
  ReservationNotCancellableError,
} from "@/modules/bilheteria";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const headerUserId = request.headers.get("x-user-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;
  const userId = session?.user?.id || headerUserId;

  if (userRole && userRole !== "ATENDENTE" && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: apenas ATENDENTE ou GERENTE." },
      { status: 403 }
    );
  }

  if (!tenantId || !userId) {
    return NextResponse.json(
      { error: "Contexto de tenant/usuario nao identificado." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Payload JSON invalido ou malformatado." },
      { status: 400 }
    );
  }

  const { reservationCode, paymentMethod } = body as any;

  if (!reservationCode) {
    return NextResponse.json(
      { error: "reservationCode e obrigatorio." },
      { status: 400 }
    );
  }

  try {
    const result = await CounterService.confirmReservationPayment({
      reservationCode,
      tenantId,
      soldByUserId: userId,
      paymentMethod,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ReservationNotCancellableError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao confirmar pagamento" },
      { status: 500 }
    );
  }
}
