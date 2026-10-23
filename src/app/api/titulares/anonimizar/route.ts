import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  AnonymizationService,
  anonymizeTitularSchema,
  formatZodErrors,
  TitularNotFoundError,
  TitularAlreadyAnonymizedError,
} from "@/modules/compliance";

/**
 * Route Handler para Atendimento ao Art. 18 da LGPD (Direito ao Esquecimento).
 * Executa a anonimizacao in-place de dados pessoais do comprador sem quebrar FK do CDC (ADR-009).
 * Rastreabilidade: AC-5, AC-6, TASK-14, ADR-009
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  // AC-5 / TC-5: Rota restrita a GERENTE/DPO; ATENDENTE e CLIENTE recebem 403
  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Apenas Gerente/DPO possui autorizacao para executar a anonimizacao de dados pessoais (AC-5 / AC-6)." },
      { status: 403 }
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado na requisicao." },
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

  const parseResult = anonymizeTitularSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados para anonimizacao invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const result = await AnonymizationService.anonymizeTitular(
      parseResult.data,
      tenantId
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof TitularNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    if (error instanceof TitularAlreadyAnonymizedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno ao processar anonimizacao." },
      { status: 500 }
    );
  }
}
