import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  FilmService,
  updateFilmSchema,
  formatZodErrors,
  FilmNotFoundError,
  FilmInUseError,
} from "@/modules/backoffice";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado na requisicao." },
      { status: 401 }
    );
  }

  try {
    const film = await FilmService.getFilmById(params.id, tenantId);
    return NextResponse.json(film, { status: 200 });
  } catch (error) {
    if (error instanceof FilmNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar filme" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para editar filmes (AC-5)." },
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

  const parseResult = updateFilmSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de atualizacao de filme invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const updated = await FilmService.updateFilm(params.id, parseResult.data, tenantId);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof FilmNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar filme" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para excluir filmes (AC-5)." },
      { status: 403 }
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant nao identificado na requisicao." },
      { status: 401 }
    );
  }

  try {
    await FilmService.deleteFilm(params.id, tenantId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof FilmNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof FilmInUseError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir filme" },
      { status: 500 }
    );
  }
}
