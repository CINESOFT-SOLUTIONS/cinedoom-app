import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { CounterService, ReservationNotFoundError } from "@/modules/bilheteria";
import { CryptoService, maskCPF } from "@/modules/crypto";
import { rawPrisma } from "@/shared/db/prisma";

async function rawPrismaFindByCpfHash(tenantId: string, cpfHash: string) {
  const reservation = await rawPrisma.reservation.findFirst({
    where: {
      tenantId,
      buyerCpfHash: cpfHash,
      status: "PENDING",
    },
    include: {
      session: {
        include: {
          film: true,
          room: true,
        },
      },
      sessionSeats: {
        include: {
          seat: true,
        },
      },
      buyer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!reservation) return null;

  let buyerCpfMasked = "***.***.***-**";
  try {
    if (reservation.buyer?.cpfEncrypted) {
      const plain = CryptoService.decryptCPF(reservation.buyer.cpfEncrypted);
      buyerCpfMasked = maskCPF(plain);
    }
  } catch {
    buyerCpfMasked = "***.***.***-**";
  }

  return {
    ...reservation,
    buyerCpfMasked,
  };
}

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
      { error: "Contexto de tenant nao identificado." },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("codigo") || searchParams.get("code");
  const cpf = searchParams.get("cpf");

  try {
    if (code) {
      const reservation = await CounterService.findReservationByCode(code, tenantId);
      return NextResponse.json(reservation, { status: 200 });
    }

    if (cpf) {
      const sanitized = cpf.replace(/\D/g, "");
      const cpfHash = CryptoService.hashCPF(sanitized);
      const reservation = await rawPrismaFindByCpfHash(tenantId, cpfHash);
      if (!reservation) {
        throw new ReservationNotFoundError();
      }
      return NextResponse.json(reservation, { status: 200 });
    }

    return NextResponse.json(
      { error: "Informe codigo ou CPF para buscar reserva." },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof ReservationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar reserva" },
      { status: 500 }
    );
  }
}
