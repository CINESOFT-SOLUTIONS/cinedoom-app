import { rawPrisma } from "@/shared/db/prisma";

export interface HoldRecord {
  holdToken: string;
  sessionId: string;
  seatIds: string[];
  expiresAt: Date;
  tenantId: string;
}

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutos (600 segundos)

// Registro de bloqueios ativos em memoria para rapida validacao e sincronizacao de tokens
const activeHolds = new Map<string, HoldRecord>();

export class TemporaryHoldServiceClass {
  getHold(holdToken: string): HoldRecord | null {
    const hold = activeHolds.get(holdToken);
    if (!hold) return null;

    if (new Date() > hold.expiresAt) {
      activeHolds.delete(holdToken);
      return null;
    }

    return hold;
  }

  isSeatHeldByOther(sessionId: string, seatId: string, currentHoldToken?: string): boolean {
    const now = new Date();
    let isHeld = false;

    activeHolds.forEach((hold, token) => {
      if (hold.sessionId === sessionId && hold.seatIds.includes(seatId)) {
        if (now > hold.expiresAt) {
          activeHolds.delete(token);
        } else if (token !== currentHoldToken) {
          isHeld = true;
        }
      }
    });

    return isHeld;
  }

  async holdSeats(params: {
    sessionId: string;
    seatIds: string[];
    holdToken: string;
    tenantId?: string;
  }): Promise<{ holdToken: string; expiresAt: Date; remainingSeconds: number }> {
    const { sessionId, seatIds, holdToken } = params;
    const now = new Date();

    if (!seatIds || seatIds.length === 0) {
      throw new Error("Selecione ao menos um assento para bloquear.");
    }

    if (seatIds.length > 5) {
      throw new Error("Limite maximo de 5 assentos por reserva excedido.");
    }

    // 1. Resolve o tenantId se nao fornecido
    let tenantId = params.tenantId;
    if (!tenantId) {
      try {
        const session = await rawPrisma.session.findUnique({
          where: { id: sessionId },
          select: { tenantId: true },
        });
        tenantId = session?.tenantId || "";
      } catch {
        tenantId = "";
      }
    }

    // 2. Se ja existir um bloqueio anterior com este token, reaproveita o expiresAt original
    const existingHold = activeHolds.get(holdToken);
    let expiresAt: Date;

    if (existingHold && now < existingHold.expiresAt && existingHold.sessionId === sessionId) {
      // Mantem o prazo original sem reiniciar o contador de 10 minutos
      expiresAt = existingHold.expiresAt;
    } else {
      expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);
    }

    // 3. Bloqueio no Banco de Dados com transacao e concorrencia
    try {
      await rawPrisma.$transaction(async (tx) => {
        // Busca assentos no banco
        const sessionSeats = await tx.sessionSeat.findMany({
          where: {
            id: { in: seatIds },
            sessionId,
          },
        });

        if (sessionSeats.length > 0) {
          // Verifica se algum assento esta vendido ou bloqueado por outro usuario
          for (const seat of sessionSeats) {
            const isExpired =
              seat.status === "RESERVED" &&
              seat.reservationExpiresAt &&
              new Date(seat.reservationExpiresAt) <= now;

            const isHeldByCurrentHold =
              existingHold && existingHold.seatIds.includes(seat.id);

            if (seat.status !== "AVAILABLE" && !isExpired && !isHeldByCurrentHold) {
              throw new Error(
                `O assento selecionado (${seat.id}) ja foi reservado ou bloqueado por outro cliente.`
              );
            }
          }

          // Se o usuario mudou de assentos, libera os assentos antigos
          if (existingHold) {
            const seatsToRelease = existingHold.seatIds.filter((id) => !seatIds.includes(id));
            if (seatsToRelease.length > 0) {
              await tx.sessionSeat.updateMany({
                where: {
                  id: { in: seatsToRelease },
                  sessionId,
                  status: "RESERVED",
                },
                data: {
                  status: "AVAILABLE",
                  reservationExpiresAt: null,
                },
              });
            }
          }

          // Atualiza os novos assentos para RESERVED com o prazo de expiracao
          await tx.sessionSeat.updateMany({
            where: {
              id: { in: seatIds },
              sessionId,
            },
            data: {
              status: "RESERVED",
              reservationExpiresAt: expiresAt,
            },
          });
        }
      });
    } catch (err: any) {
      // Se for erro de concorrencia de assento, propaga
      if (err.message?.includes("ja foi reservado ou bloqueado")) {
        throw err;
      }
      // Em caso de ambiente mock/sem banco, valida via memoria
      for (const seatId of seatIds) {
        if (this.isSeatHeldByOther(sessionId, seatId, holdToken)) {
          throw new Error("Um ou mais assentos selecionados acabaram de ser bloqueados por outro cliente.");
        }
      }
    }

    // 4. Registra na memoria
    activeHolds.set(holdToken, {
      holdToken,
      sessionId,
      seatIds,
      expiresAt,
      tenantId: tenantId || "",
    });

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    return {
      holdToken,
      expiresAt,
      remainingSeconds,
    };
  }

  async releaseHold(holdToken?: string | null): Promise<void> {
    if (!holdToken) return;
    const hold = activeHolds.get(holdToken);
    if (!hold) return;

    activeHolds.delete(holdToken);

    try {
      await rawPrisma.sessionSeat.updateMany({
        where: {
          id: { in: hold.seatIds },
          sessionId: hold.sessionId,
          status: "RESERVED",
        },
        data: {
          status: "AVAILABLE",
          reservationExpiresAt: null,
        },
      });
    } catch {
      // Silencioso se estiver em mock
    }
  }

  isHoldValid(holdToken: string, sessionId: string, seatIds: string[]): boolean {
    const hold = this.getHold(holdToken);
    if (!hold) return false;
    if (hold.sessionId !== sessionId) return false;
    if (new Date() > hold.expiresAt) return false;

    // Todos os assentos solicitados devem pertencer ao bloqueio ativo
    return seatIds.every((id) => hold.seatIds.includes(id));
  }
}

export const TemporaryHoldService = new TemporaryHoldServiceClass();
