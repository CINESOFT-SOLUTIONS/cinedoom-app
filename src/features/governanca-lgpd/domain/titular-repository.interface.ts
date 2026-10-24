export interface AnonymizationResult {
  buyerId: string;
  tenantId: string;
  name: string;
  email: string;
  anonymizedAt: Date;
  ticketsPreserved: number;
  message: string;
}

export interface TitularDetails {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  cpfMasked: string;
  isAnonymized: boolean;
  anonymizedAt: Date | null;
  lgpdConsentAt: Date;
  ticketsCount: number;
}

export interface ITitularRepository {
  findById(id: string, tenantId: string): Promise<any | null>;
  findByCpfHash(cpfHash: string, tenantId: string): Promise<any | null>;
  countTickets(buyerId: string): Promise<number>;
  anonymizeInPlace(buyerId: string, data: {
    name: string;
    email: string;
    cpfHash: string;
    cpfEncrypted: string;
    anonymizedAt: Date;
  }): Promise<{ id: string; tenantId: string; name: string; email: string; anonymizedAt: Date | null }>;
}
