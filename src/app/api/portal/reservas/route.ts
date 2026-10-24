import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  PortalService,
  createReservationSchema,
  formatZodErrorsPortal,
  ReservationAntecedenceError,
  SeatNotAvailableError,
  SessionNotFoundError,
  SessionSeatNotFoundError,
  PortalValidationError,
} from "@/modules/portal";

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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de cinema/tenant nao identificado na requisicao." },
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

  const parseResult = createReservationSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de reserva invalidos.",
        errors: formatZodErrorsPortal(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const loggedUserId = session?.user?.id;
    const result = await PortalService.createReservation(
      parseResult.data,
      tenantId,
      loggedUserId
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReservationAntecedenceError) {
      return NextResponse.json(
        { error: error.message, code: "ANTECEDENCE_VIOLATION" },
        { status: 422 }
      );
    }
    if (error instanceof SeatNotAvailableError) {
      return NextResponse.json(
        { error: error.message, code: "SEAT_NOT_AVAILABLE" },
        { status: 409 }
      );
    }
    if (
      error instanceof SessionNotFoundError ||
      error instanceof SessionSeatNotFoundError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    if (error instanceof PortalValidationError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar reserva" },
      { status: 500 }
    );
  }
}
