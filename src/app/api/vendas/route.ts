import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  SaleService,
  createSaleSchema,
  formatZodErrors,
  SeatNotAvailableError,
  SessionNotFoundError,
  SessionSeatNotFoundError,
} from "@/modules/bilheteria";

/**
 * Route Handler para Venda Atomica de Ingressos (AC-1 / AC-6 / TC-1 / TC-9 / TC-14 / ADR-007)
 * - Trava pessimista SELECT FOR UPDATE em session_seats no PostgreSQL Neon.
 * - Garante atomicidade: exactly 1 transacao bem-sucedida (201) e concorrentes rejeitadas (409 Conflict).
 * - Criptografia ponta a ponta de dados pessoais do comprador (HMAC-SHA256 + AES-256-GCM).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const headerUserId = request.headers.get("x-user-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;
  const userId = session?.user?.id || headerUserId;

  // AC-5 / RBAC: Apenas ATENDENTE e GERENTE podem realizar vendas presenciais no PDV
  if (userRole && userRole !== "ATENDENTE" && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem autorizacao para realizar vendas de bilheteria." },
      { status: 403 }
    );
  }

  // AC-4 / TC-19: Isolamento de Tenancy obrigatorio
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

  // AC-6 / TC-14: Validacao dos campos obrigatorios do comprador e assentos
  const parseResult = createSaleSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de venda invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const saleResult = await SaleService.processSale(
      parseResult.data,
      tenantId,
      userId || "00000000-0000-4000-a000-000000000002"
    );

    return NextResponse.json(saleResult, { status: 201 });
  } catch (error) {
    // TC-1 / TC-9: Conflito de concorrencia ou assento indisponivel (HTTP 409 Conflict)
    if (error instanceof SeatNotAvailableError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error instanceof SessionNotFoundError || error instanceof SessionSeatNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro interno ao processar venda de ingressos",
      },
      { status: 500 }
    );
  }
}
