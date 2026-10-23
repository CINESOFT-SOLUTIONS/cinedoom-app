import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  CancellationService,
  cancelTicketSchema,
  formatZodErrors,
  TicketNotFoundError,
  TicketAlreadyCancelledError,
  SessionAlreadyOccurredError,
  CancellationAuditFailedError,
} from "@/modules/bilheteria";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Route Handler para Cancelamento Auditavel de Ingressos (AC-3 / AC-5 / ADR-010 / TC-3 / TC-11)
 * Regra: Persiste registro imutavel na tabela cancellation_audits ANTES de liberar o SessionSeat.
 * Se a gravacao da auditoria falhar, o assento permanece vendido (rollback estrito).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const headerUserId = request.headers.get("x-user-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;
  const userId = session?.user?.id || headerUserId;

  // AC-5 / RBAC: Somente ATENDENTE e GERENTE podem cancelar ingressos no PDV
  if (userRole && userRole !== "ATENDENTE" && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem autorizacao para realizar cancelamentos de bilheteria." },
      { status: 403 }
    );
  }

  // AC-4 / TC-19: Isolamento de Tenancy
  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado na requisicao (AC-4 / TC-19)." },
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

  // Validacao Zod: Motivo de cancelamento e compulsorio (TC-3 / AC-3)
  const parseResult = cancelTicketSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de cancelamento invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const result = await CancellationService.cancelTicket(
      params.id,
      parseResult.data,
      tenantId,
      userId || "00000000-0000-4000-a000-000000000002"
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof TicketNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof TicketAlreadyCancelledError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof SessionAlreadyOccurredError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    if (error instanceof CancellationAuditFailedError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno ao processar cancelamento",
      },
      { status: 500 }
    );
  }
}
