import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "@/features/catalogo";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * Controller para Detalhes de Sessao no Portal Publico
 * Rastreabilidade: Controller-Service-Repository, ISO/IEC/IEEE 12207:2021
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const payload = await SessionService.getSessionPortalDetails(params.id);
  return NextResponse.json(payload, { status: 200 });
}
