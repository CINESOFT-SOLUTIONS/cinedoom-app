import { rawPrisma } from "@/shared/db/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  registerClientSchema,
  formatZodErrorsPortal,
  PortalService,
  PortalValidationError,
} from "@/modules/portal";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Payload JSON invalido ou malformatado." },
      { status: 400 }
    );
  }

  let payload = typeof body === "object" && body !== null ? { ...(body as Record<string, unknown>) } : {};
  if (!payload.tenantId) {
    const defaultTenant = await rawPrisma.tenant.findFirst({
      where: { active: true },
      select: { id: true },
    });
    if (defaultTenant) {
      payload.tenantId = defaultTenant.id;
    }
  }

  const parseResult = registerClientSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de cadastro invalidos.",
        errors: formatZodErrorsPortal(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const result = await PortalService.registerClient(parseResult.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PortalValidationError) {
      return NextResponse.json(
        { error: error.message, field: error.field },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao cadastrar cliente" },
      { status: 500 }
    );
  }
}
