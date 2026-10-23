import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  SessionService,
  createSessionSchema,
  formatZodErrors,
  SessionScheduleConflictError,
  SessionFilmNotFoundError,
  SessionRoomNotFoundError,
} from "@/modules/backoffice";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para gerenciar sessoes (AC-5, AC-8)." },
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
    const { searchParams } = new URL(request.url);
    const filmId = searchParams.get("filmId") || undefined;
    const roomId = searchParams.get("roomId") || undefined;
    const date = searchParams.get("date") || undefined;

    const sessions = await SessionService.listSessions(tenantId, { filmId, roomId, date });
    return NextResponse.json(sessions, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno ao listar sessoes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Apenas usuarios com perfil GERENTE podem agendar sessoes (AC-5, AC-8)." },
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

  const parseResult = createSessionSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de criacao de sessao invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const createdSession = await SessionService.createSession(parseResult.data, tenantId);
    return NextResponse.json(createdSession, { status: 201 });
  } catch (error) {
    if (error instanceof SessionScheduleConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof SessionFilmNotFoundError || error instanceof SessionRoomNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar sessao cinematografica" },
      { status: 500 }
    );
  }
}
