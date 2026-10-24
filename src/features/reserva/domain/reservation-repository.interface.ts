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

export interface IPublicReservationRepository {
  executeReservationTransaction(params: ExecuteReservationParams): Promise<any>;
  findReservationByIdOrCode(idOrCode: string, tenantId: string): Promise<any | null>;
  findUserReservations(userId: string, tenantId: string): Promise<any[]>;
  cancelPendingReservation(reservationId: string, userId: string, tenantId: string): Promise<any>;
}
