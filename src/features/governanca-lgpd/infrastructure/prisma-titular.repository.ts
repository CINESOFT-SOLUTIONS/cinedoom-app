import { rawPrisma } from "@/shared/db/prisma";
import type { ITitularRepository } from "../domain/titular-repository.interface";

export class PrismaTitularRepository implements ITitularRepository {
  async findById(id: string, tenantId: string) {
    return rawPrisma.buyer.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });
  }

  async findByCpfHash(cpfHash: string, tenantId: string) {
    return rawPrisma.buyer.findFirst({
      where: {
        tenantId,
        cpfHash,
      },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });
  }

  async countTickets(buyerId: string): Promise<number> {
    return rawPrisma.ticket.count({
      where: {
        buyerId,
      },
    });
  }

  async anonymizeInPlace(
    buyerId: string,
    data: {
      name: string;
      email: string;
      cpfHash: string;
      cpfEncrypted: string;
      anonymizedAt: Date;
    }
  ) {
    return rawPrisma.buyer.update({
      where: {
        id: buyerId,
      },
      data,
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        anonymizedAt: true,
      },
    });
  }
}

export const defaultTitularRepository = new PrismaTitularRepository();
