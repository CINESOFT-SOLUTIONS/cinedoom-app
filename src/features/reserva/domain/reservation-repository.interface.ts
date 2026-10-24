export interface ExecuteReservationParams {
  sessionId: string;
  tenantId: string;
  sortedSeatIds: string[];
  buyer: {
    name: string;
    email: string;
    cleanCpf: string;
    cpfHash: string;
    cpfEncrypted: string;
    lgpdConsentAt: Date;
  };
  userId: string | null;
}

export interface RegisterClientParams {
  tenantId: string;
  name: string;
  email: string;
  passwordHash: string;
  cpfHash: string;
  cpfEncrypted: string;
  lgpdConsentAt: Date;
}

export interface IPublicReservationRepository {
  findDefaultActiveTenantId(): Promise<string | null>;
  isTenantActive(tenantId: string): Promise<boolean>;
  findUserByEmail(tenantId: string, email: string): Promise<{ id: string } | null>;
  findBuyerByCpfHash(tenantId: string, cpfHash: string): Promise<{ id: string } | null>;
  registerClientTransaction(params: RegisterClientParams): Promise<{ user: any; buyerId: string }>;
  executeReservationTransaction(params: ExecuteReservationParams): Promise<any>;
  findReservationByIdOrCode(idOrCode: string, tenantId: string): Promise<any | null>;
  findUserReservations(userId: string, tenantId: string): Promise<any[]>;
  cancelPendingReservation(reservationId: string, userId: string, tenantId: string): Promise<any>;
}
