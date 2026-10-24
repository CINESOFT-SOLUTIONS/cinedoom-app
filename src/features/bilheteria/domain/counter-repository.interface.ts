export interface CounterSaleInput {
  reservationCode: string;
  tenantId: string;
  soldByUserId: string;
  paymentMethod?: string;
}

export interface ICounterRepository {
  findReservationByCode(reservationCode: string, tenantId: string): Promise<any | null>;
  confirmReservationPayment(input: CounterSaleInput): Promise<{
    success: boolean;
    message: string;
    reservationId: string;
    status: string;
    confirmedAt: Date | null;
  }>;
}
