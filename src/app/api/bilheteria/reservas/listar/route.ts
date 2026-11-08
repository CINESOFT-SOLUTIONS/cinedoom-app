import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { rawPrisma } from "@/shared/db/prisma";
import { CryptoService, maskCPF } from "@/modules/crypto";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const headerTenantId = request.headers.get("x-tenant-id");
  const userRole = session?.user?.role || (request.headers.get("x-user-role") as any);
  const tenantId = session?.user?.tenantId || headerTenantId;

  if (userRole && userRole !== "ATENDENTE" && userRole !== "GERENTE") {
    return NextResponse.json(
      { error: "Acesso negado: apenas ATENDENTE ou GERENTE." },
      { status: 403 }
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { error: "Contexto de tenant não identificado." },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status"); // ex: PENDING, CONFIRMED, etc.
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 30;

  try {
    const where: any = {
      tenantId,
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    const reservations = await rawPrisma.reservation.findMany({
      where,
      include: {
        session: {
          include: {
            film: {
              select: {
                id: true,
                title: true,
                durationMinutes: true,
              },
            },
            room: {
              select: {
                id: true,
                name: true,
                capacity: true,
              },
            },
          },
        },
        sessionSeats: {
          include: {
            seat: {
              select: {
                id: true,
                rowLabel: true,
                columnNumber: true,
                seatCode: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            cpfEncrypted: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    const formatted = reservations.map((res) => {
      let buyerCpfMasked = "***.***.***-**";
      try {
        if (res.buyer?.cpfEncrypted) {
          const plainCpf = CryptoService.decryptCPF(res.buyer.cpfEncrypted);
          buyerCpfMasked = maskCPF(plainCpf);
        } else if (res.buyerCpfEncrypted) {
          const plainCpf = CryptoService.decryptCPF(res.buyerCpfEncrypted);
          buyerCpfMasked = maskCPF(plainCpf);
        }
      } catch {
        buyerCpfMasked = "***.***.***-**";
      }

      const seatsFormatted = res.sessionSeats.map(
        (ss) => ss.seat?.seatCode || `${ss.seat?.rowLabel}${ss.seat?.columnNumber}`
      );

      return {
        id: res.id,
        code: res.code,
        status: res.status,
        totalAmount: Number(res.totalPrice),
        createdAt: res.createdAt,
        expiresAt: res.expiresAt,
        buyerName: res.buyerName || res.buyer?.name || "Cliente",
        buyerCpfMasked,
        filmTitle: res.session?.film?.title || "Filme Indisponível",
        roomName: res.session?.room?.name || "Sala",
        sessionStartsAt: res.session?.startsAt,
        seats: seatsFormatted,
      };
    });

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar reservas" },
      { status: 500 }
    );
  }
}
