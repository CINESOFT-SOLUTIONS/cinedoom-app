import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  FilmService,
  createFilmSchema,
  formatZodErrors,
} from "@/modules/backoffice";

/**
 * Route Handler para Catálogo de Filmes
 * Rastreabilidade: AC-5, AC-8, TC-8, TC-16, ADR-003
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado na requisicao." },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("busca") || searchParams.get("search") || undefined;

  try {
    const films = await FilmService.listFilms(tenantId, search);
    return NextResponse.json(films, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar catalogo de filmes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  // AC-5 / TC-5: Apenas GERENTE pode cadastrar filmes; ATENDENTE recebe 403
  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para cadastrar filmes (AC-5 / TC-5)." },
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

  // Validacao com Zod (AC-8, TC-16)
  const parseResult = createFilmSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de filme invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    // Persistencia com sucesso: status 201 Created (TC-8)
    const film = await FilmService.createFilm(parseResult.data, tenantId);
    return NextResponse.json(film, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar filme" },
      { status: 500 }
    );
  }
}
