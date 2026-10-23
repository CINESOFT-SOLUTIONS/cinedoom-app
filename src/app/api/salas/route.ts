import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  RoomService,
  createRoomSchema,
  formatZodErrors,
} from "@/modules/backoffice";

/**
 * Route Handler para Salas e Layout Físico
 * Rastreabilidade: AC-5, AC-8, TASK-7, ADR-003
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

  try {
    const rooms = await RoomService.listRooms(tenantId);
    return NextResponse.json(rooms, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar salas do cinema" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  // AC-5: Apenas GERENTE pode cadastrar salas; ATENDENTE recebe 403
  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para cadastrar salas (AC-5)." },
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

  // Validacao com Zod (AC-8, TC-16 pattern)
  const parseResult = createRoomSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de sala invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    // Cria a sala e todos os assentos fisicos em transacao (TASK-7)
    const room = await RoomService.createRoom(parseResult.data, tenantId);
    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao cadastrar sala" },
      { status: 500 }
    );
  }
}
