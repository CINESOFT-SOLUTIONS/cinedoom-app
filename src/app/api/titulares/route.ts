import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { AnonymizationService } from "@/modules/compliance";

/**
 * Route Handler para Consulta de Titular pelo Gerente/DPO
 * Rastreabilidade: AC-5, AC-6, TASK-14
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Apenas Gerente/DPO pode consultar dados cadastrais de titulares." },
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
  const cpfOrId = searchParams.get("cpf") || searchParams.get("id") || searchParams.get("busca");

  if (!cpfOrId) {
    return NextResponse.json(
      { error: "Parametro de busca 'cpf' ou 'id' e obrigatorio." },
      { status: 400 }
    );
  }

  try {
    const titular = await AnonymizationService.findTitular(cpfOrId, tenantId);
    if (!titular) {
      return NextResponse.json(
        { error: "Titular nao encontrado para o cinema informado." },
        { status: 404 }
      );
    }
    return NextResponse.json(titular, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar titular." },
      { status: 500 }
    );
  }
}
