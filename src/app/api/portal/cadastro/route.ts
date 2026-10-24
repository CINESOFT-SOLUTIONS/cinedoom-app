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

  const parseResult = registerClientSchema.safeParse(body);
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
