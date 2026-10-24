import { NextRequest, NextResponse } from "next/server";
import { FilmService } from "@/features/catalogo";

/**
 * Controller para Catalogo Publico de Filmes e Sessoes
 * Rastreabilidade: Controller-Service-Repository, ISO/IEC/IEEE 12207:2021
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const headerTenantId = request.headers.get("x-tenant-id");
  const queryTenantId = searchParams.get("tenantId");
  const tenantId = headerTenantId || queryTenantId;

  const payload = await FilmService.getCatalogWithSessions(tenantId);
  return NextResponse.json(payload, { status: 200 });
}
