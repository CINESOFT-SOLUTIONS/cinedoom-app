import { NextRequest, NextResponse } from "next/server";
import { TemporaryHoldService } from "@/features/reserva/application/temporary-hold.service";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const sessionId = params.id;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON invalido." }, { status: 400 });
  }

  const { seatIds, holdToken, action } = body;

  if (action === "RELEASE") {
    if (holdToken) {
      await TemporaryHoldService.releaseHold(holdToken);
    }
    return NextResponse.json({ success: true, released: true });
  }

  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return NextResponse.json(
      { error: "Selecione ao menos um assento para efetuar o bloqueio." },
      { status: 400 }
    );
  }

  if (seatIds.length > 5) {
    return NextResponse.json(
      { error: "Limite maximo de 5 assentos por reserva excedido." },
      { status: 422 }
    );
  }

  const effectiveToken = holdToken || `hold_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const result = await TemporaryHoldService.holdSeats({
      sessionId,
      seatIds,
      holdToken: effectiveToken,
      tenantId: request.headers.get("x-tenant-id") || undefined,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const message = error.message || "Nao foi possivel bloquear os assentos selecionados.";
    const isConflict =
      message.includes("ja foi") ||
      message.includes("bloqueado") ||
      message.includes("reservado");

    return NextResponse.json(
      { error: message, code: isConflict ? "SEAT_NOT_AVAILABLE" : "HOLD_FAILED" },
      { status: isConflict ? 409 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const url = new URL(request.url);
  const holdToken = url.searchParams.get("holdToken");

  if (holdToken) {
    await TemporaryHoldService.releaseHold(holdToken);
  }

  return NextResponse.json({ success: true });
}

