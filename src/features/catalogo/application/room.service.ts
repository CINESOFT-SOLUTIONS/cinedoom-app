import type { IRoomRepository } from "../domain/room-repository.interface";
import { defaultRoomRepository } from "../infrastructure/prisma-room.repository";
import type {
  CreateRoomInput,
  UpdateRoomInput,
} from "./room.schema";

export class RoomNotFoundError extends Error {
  constructor(message = "Sala nao encontrada neste cinema.") {
    super(message);
    this.name = "RoomNotFoundError";
  }
}

export class RoomInUseError extends Error {
  constructor(message = "Nao e possivel excluir a sala pois existem sessoes agendadas para ela.") {
    super(message);
    this.name = "RoomInUseError";
  }
}

/**
 * Servico de Aplicacao para Gestao de Salas e Geracao Fisica de Assentos (TASK-7)
 * Desacoplado da camada de dados via IRoomRepository
 */
export class RoomServiceClass {
  constructor(private roomRepo: IRoomRepository = defaultRoomRepository) {}

  /**
   * Lista as salas cadastradas para o tenant com contagem de assentos e sessoes
   */
  async listRooms(tenantId: string) {
    return this.roomRepo.findMany(tenantId);
  }

  /**
   * Obtem detalhes da sala e todos os assentos fisicos ordenados por fileira e coluna
   */
  async getRoomById(id: string, tenantId: string) {
    const room = await this.roomRepo.findById(id, tenantId);
    if (!room) {
      throw new RoomNotFoundError();
    }
    return room;
  }

  /**
   * Cria a sala e gera deterministicamente a matriz de assentos fisicos em transacao ACID
   */
  async createRoom(data: CreateRoomInput, tenantId: string) {
    return this.roomRepo.createWithSeats(tenantId, data);
  }

  /**
   * Atualiza o nome da sala
   */
  async updateRoom(id: string, data: UpdateRoomInput, tenantId: string) {
    await this.getRoomById(id, tenantId);
    return this.roomRepo.update(id, data);
  }

  /**
   * Exclui a sala e seus assentos fisicos se nao houver sessoes cadastradas
   */
  async deleteRoom(id: string, tenantId: string) {
    const room = await this.getRoomById(id, tenantId);
    const sessionsCount = await this.roomRepo.countSessions(id, tenantId);

    if (sessionsCount > 0) {
      throw new RoomInUseError(
        'A sala "' + room.name + '" possui ' + String(sessionsCount) + ' sessao(oes) vinculada(s) e nao pode ser excluida.'
      );
    }

    return this.roomRepo.deleteWithSeats(id, tenantId);
  }
}

export const RoomService = new RoomServiceClass();
export const listRooms = RoomService.listRooms.bind(RoomService);
export const getRoomById = RoomService.getRoomById.bind(RoomService);
export const createRoom = RoomService.createRoom.bind(RoomService);
export const updateRoom = RoomService.updateRoom.bind(RoomService);
export const deleteRoom = RoomService.deleteRoom.bind(RoomService);
