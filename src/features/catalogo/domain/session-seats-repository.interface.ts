export interface ISessionSeatsRepository {
  findSessionPriceAndStatus(
    sessionId: string,
    tenantId: string
  ): Promise<{ id: string; price: any; status: string; roomId?: string } | null>;
  findSessionSeats(sessionId: string, tenantId: string): Promise<any[]>;
}
