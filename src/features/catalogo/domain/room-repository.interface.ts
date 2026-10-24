import type {
  CreateRoomInput,
  UpdateRoomInput,
} from "../application/room.schema";

export interface RoomWithDetails {
  id: string;
  tenantId: string;
  name: string;
  capacity: number;
  layoutMetadata: any;
  createdAt: Date;
  updatedAt: Date;
  seats?: any[];
  _count?: {
    seats?: number;
    sessions?: number;
  };
  seatsGeneratedCount?: number;
}

/**
 * Contrato de persistencia para o Dominio de Salas e Assentos (Clean Architecture / Repository Pattern)
 */
export interface IRoomRepository {
  findMany(tenantId: string): Promise<RoomWithDetails[]>;
  findById(id: string, tenantId: string): Promise<RoomWithDetails | null>;
  createWithSeats(
    tenantId: string,
    data: CreateRoomInput
  ): Promise<RoomWithDetails>;
  update(id: string, data: UpdateRoomInput): Promise<RoomWithDetails>;
  deleteWithSeats(id: string, tenantId: string): Promise<RoomWithDetails>;
  countSessions(roomId: string, tenantId: string): Promise<number>;
}
