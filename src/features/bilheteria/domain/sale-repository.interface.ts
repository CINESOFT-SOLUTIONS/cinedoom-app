export interface ProcessSaleTransactionParams {
  sessionId: string;
  tenantId: string;
  sortedSeatIds: string[];
  soldByUserId: string;
  buyer: {
    name: string;
    email: string;
    cleanCpf: string;
    cpfHash: string;
    cpfEncrypted: string;
    lgpdConsentAt: Date;
  };
}

export interface ProcessSaleTransactionResult {
  buyer: {
    id: string;
    name: string;
    email: string;
    cpfMasked: string;
  };
  tickets: Array<{
    id: string;
    seatId: string;
    price: number;
    status: string;
    soldAt: Date;
  }>;
}

export interface ISaleRepository {
  executeSaleTransaction(
    params: ProcessSaleTransactionParams
  ): Promise<ProcessSaleTransactionResult>;
}
