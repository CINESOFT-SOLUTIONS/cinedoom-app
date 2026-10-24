import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  UserService,
  createUserSchema,
  formatZodErrors,
  EmailAlreadyInUseError,
  InvalidRoleAssignmentError,
} from "@/features/identidade";

/**
 * Route Handler para Gestao de Atendentes pelo Gerente
 * Rastreabilidade: AC-5, US-6, TASK-13
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  // AC-5: Somente GERENTE pode gerenciar usuarios; ATENDENTE e CLIENTE recebem 403
  if (userRole && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para gerenciar usuarios do cinema (AC-5)." },
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
    const users = await UserService.listUsers(tenantId);
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar usuarios do cinema." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  // AC-5: Apenas GERENTE pode cadastrar atendentes
  if (userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para cadastrar operadores (AC-5)." },
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

  const parseResult = createUserSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de usuario invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const newUser = await UserService.createAttendant(parseResult.data, tenantId);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }
    if (error instanceof InvalidRoleAssignmentError) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar usuario." },
      { status: 500 }
    );
  }
}
