import { CryptoService, maskCPF } from "@/modules/crypto";
import type {
  ICounterRepository,
  CounterSaleInput,
} from "../domain/counter-repository.interface";
import {
  defaultCounterRepository,
  ReservationNotFoundError,
  ReservationNotCancellableError,
} from "../infrastructure/prisma-counter.repository";

export { ReservationNotFoundError, ReservationNotCancellableError };
export type { CounterSaleInput };

export class CounterServiceClass {
  constructor(
    private counterRepo: ICounterRepository = defaultCounterRepository
  ) {}

  async findReservationByCode(reservationCode: string, tenantId: string) {
    const reservation = await this.counterRepo.findReservationByCode(
      reservationCode,
      tenantId
    );

    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    let buyerCpfMasked = "***.***.***-**";

    try {
      if (reservation.buyer?.cpfEncrypted) {
        const plainCpf = CryptoService.decryptCPF(reservation.buyer.cpfEncrypted);
        buyerCpfMasked = maskCPF(plainCpf);
      } else if (reservation.buyerCpfEncrypted) {
        const plainCpf = CryptoService.decryptCPF(reservation.buyerCpfEncrypted);
        buyerCpfMasked = maskCPF(plainCpf);
      }
    } catch {
      buyerCpfMasked = "***.***.***-**";
    }

    return {
      ...reservation,
      buyerCpfMasked,
    };
  }

  async findReservationByCpfHash(cpfHash: string, tenantId: string) {
    const reservation = await this.counterRepo.findReservationByCpfHash(
      cpfHash,
      tenantId
    );

    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    let buyerCpfMasked = "***.***.***-**";

    try {
      if (reservation.buyer?.cpfEncrypted) {
        const plainCpf = CryptoService.decryptCPF(reservation.buyer.cpfEncrypted);
        buyerCpfMasked = maskCPF(plainCpf);
      } else if (reservation.buyerCpfEncrypted) {
        const plainCpf = CryptoService.decryptCPF(reservation.buyerCpfEncrypted);
        buyerCpfMasked = maskCPF(plainCpf);
      }
    } catch {
      buyerCpfMasked = "***.***.***-**";
    }

    return {
      ...reservation,
      buyerCpfMasked,
    };
  }

  async findReservationByCpf(cpf: string, tenantId: string) {
    const sanitized = cpf.replace(/\D/g, "");
    const cpfHash = CryptoService.hashCPF(sanitized);
    return this.findReservationByCpfHash(cpfHash, tenantId);
  }

  async confirmReservationPayment(input: CounterSaleInput) {
    return this.counterRepo.confirmReservationPayment(input);
  }
}

export const CounterService = new CounterServiceClass();
export const findReservationByCode = CounterService.findReservationByCode.bind(CounterService);
export const findReservationByCpfHash = CounterService.findReservationByCpfHash.bind(CounterService);
export const findReservationByCpf = CounterService.findReservationByCpf.bind(CounterService);
export const confirmReservationPayment = CounterService.confirmReservationPayment.bind(CounterService);
