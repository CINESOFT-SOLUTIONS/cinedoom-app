import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import {
  RoomService,
  updateRoomSchema,
  formatZodErrors,
  RoomNotFoundError,
  RoomInUseError,
} from "@/modules/backoffice";
import { MOCK_ROOMS, isSeatBlockedForMaintenance } from "@/modules/portal/mock-cinema-data";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: Perfil sem permissao para gerenciar salas (AC-5, AC-8)." },
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
    const room = await RoomService.getRoomById(params.id, tenantId);
    if (room && (room as any).seats) {
      const seatsWithMaintenance = (room as any).seats.map((s: any) => {
        const code = s.seatCode || `${s.rowLabel}${s.columnNumber}`;
        const isBlocked = s.status === "BLOCKED" || isSeatBlockedForMaintenance(code, room.id);
        return {
          ...s,
          status: isBlocked ? "BLOCKED" : s.status || "AVAILABLE",
        };
      });
      return NextResponse.json({ ...room, seats: seatsWithMaintenance }, { status: 200 });
    }
    return NextResponse.json(room, { status: 200 });
  } catch (error) {
    // Fallback gracioso para salas mock oficiais
    const mockRoom = MOCK_ROOMS.find((r) => r.id === params.id);
    if (mockRoom) {
      const seats = [];
      for (let r = 0; r < mockRoom.rows; r++) {
        const rowLabel = String.fromCharCode(65 + r);
        for (let c = 1; c <= mockRoom.columns; c++) {
          const code = `${rowLabel}${c}`;
          const isBlocked = isSeatBlockedForMaintenance(code, mockRoom.id);
          seats.push({
            id: `${mockRoom.id}-seat-${code}`,
            roomId: mockRoom.id,
            rowLabel,
            columnNumber: c,
            seatCode: code,
            status: isBlocked ? "BLOCKED" : "AVAILABLE",
          });
        }
      }
      return NextResponse.json(
        {
          id: mockRoom.id,
          name: mockRoom.name,
          capacity: mockRoom.capacity,
          layoutMetadata: {
            rows: mockRoom.rows,
            columns: mockRoom.columns,
            totalSeats: mockRoom.capacity,
          },
          seats,
        },
        { status: 200 }
      );
    }

    if (error instanceof RoomNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar sala" },
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
      { error: "Acesso negado: Perfil sem permissao para editar salas (AC-5)." },
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

  const parseResult = updateRoomSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        message: "Dados de atualizacao de sala invalidos.",
        errors: formatZodErrors(parseResult.error),
      },
      { status: 422 }
    );
  }

  try {
    const updated = await RoomService.updateRoom(params.id, parseResult.data, tenantId);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof RoomNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar sala" },
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
      { error: "Acesso negado: Perfil sem permissao para excluir salas (AC-5)." },
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
    await RoomService.deleteRoom(params.id, tenantId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof RoomNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof RoomInUseError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao excluir sala" },
      { status: 500 }
    );
  }
}
