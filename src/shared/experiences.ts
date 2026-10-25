/**
 * Fonte única de verdade para Salas e Categorias de Experiência do CineDoom.
 *
 * Estrutura Oficial do Complexo (4 Salas em 3 Experiências):
 * - Salas 1 e 2 — Clássica: experiência tradicional de cinema, com 120 lugares por sala, tela panorâmica, som de qualidade e poltronas confortáveis.
 * - Sala 3 — IMAX: experiência audiovisual imersiva, com 120 lugares, projeção IMAX a laser e sistema de som imersivo.
 * - Sala 4 — VIP: experiência premium, com 60 lugares, poltronas reclináveis, mesas de apoio individuais e maior conforto.
 */

export type ExperienceCategory = "Clássica" | "IMAX" | "VIP";

export type ProgramacaoFilter = "Todos" | "Clássica" | "IMAX" | "VIP";

export const EXPERIENCE_CATEGORIES: readonly ExperienceCategory[] = [
  "Clássica",
  "IMAX",
  "VIP",
] as const;

export const PROGRAMACAO_FILTERS: readonly ProgramacaoFilter[] = [
  "Todos",
  "Clássica",
  "IMAX",
  "VIP",
] as const;

export interface ExperienceInfo {
  id: string;
  category: ExperienceCategory;
  title: string;
  rooms: string;
  roomsLabel: string;
  roomsList: string[];
  roomNumbers: number[];
  capacityPerRoom: number;
  totalSeats: number;
  totalCapacity: number;
  badge: string;
  shortDescription: string;
  description: string;
  features: string[];
  specs: {
    projection: string;
    sound: string;
    seats: string;
    extras: string;
  };
}

export const EXPERIENCES_DATA: Record<ExperienceCategory, ExperienceInfo> = {
  Clássica: {
    id: "classica",
    category: "Clássica",
    title: "Clássica",
    rooms: "Salas 1 e 2",
    roomsLabel: "Salas 1 e 2",
    roomsList: ["Sala 1", "Sala 2"],
    roomNumbers: [1, 2],
    capacityPerRoom: 120,
    totalSeats: 240,
    totalCapacity: 240,
    badge: "Salas 1 e 2 • 120 Lugares por sala",
    shortDescription:
      "Experiência tradicional de cinema com tela panorâmica, som de qualidade e poltronas confortáveis.",
    description:
      "Experiência tradicional de cinema nas Salas 1 e 2, equipadas com tela panorâmica digital, som surround de qualidade e 120 poltronas ergonômicas e confortáveis por sala.",
    features: [
      "Tela panorâmica digital",
      "Som surround de qualidade",
      "Poltronas confortáveis com amplo espaçamento",
    ],
    specs: {
      projection: "Projeção 4K Digital Panorâmica",
      sound: "Áudio Surround Multicanal 7.1",
      seats: "Poltronas ergonômicas stadium com declive",
      extras: "Amplo espaçamento e porta-copos individuais",
    },
  },
  IMAX: {
    id: "imax",
    category: "IMAX",
    title: "IMAX",
    rooms: "Sala 3",
    roomsLabel: "Sala 3",
    roomsList: ["Sala 3"],
    roomNumbers: [3],
    capacityPerRoom: 120,
    totalSeats: 120,
    totalCapacity: 120,
    badge: "Sala 3 • 120 Lugares",
    shortDescription:
      "Experiência audiovisual imersiva com projeção IMAX a laser e sistema de som imersivo.",
    description:
      "Experiência audiovisual imersiva na Sala 3, com 120 lugares stadium, projeção IMAX a laser de altíssimo contraste e sistema de som imersivo multicanal de máxima fidelidade sonora.",
    features: [
      "Projeção IMAX a laser",
      "Sistema de som imersivo",
      "Tela monumental de chão ao teto",
    ],
    specs: {
      projection: "Projeção IMAX a Laser 4K",
      sound: "Sistema de Som Imersivo Multicanal IMAX",
      seats: "120 assentos stadium em geometria de alta visibilidade",
      extras: "Geometria de sala customizada para campo de visão expandido",
    },
  },
  VIP: {
    id: "vip",
    category: "VIP",
    title: "VIP",
    rooms: "Sala 4",
    roomsLabel: "Sala 4",
    roomsList: ["Sala 4"],
    roomNumbers: [4],
    capacityPerRoom: 60,
    totalSeats: 60,
    totalCapacity: 60,
    badge: "Sala 4 • 60 Lugares",
    shortDescription:
      "Experiência premium com poltronas reclináveis, mesas de apoio individuais e maior conforto.",
    description:
      "Experiência premium na Sala 4 com capacidade exclusiva para 60 pessoas, equipada com poltronas reclináveis com acionamento individual, mesas de apoio para bebidas e petiscos e maior conforto.",
    features: [
      "Poltronas reclináveis individuais",
      "Mesas de apoio para bebidas e petiscos",
      "Ambiente intimista com maior conforto",
    ],
    specs: {
      projection: "Projeção Digital de Alta Definição",
      sound: "Acústica Intimista de Estúdio",
      seats: "Poltronas com reclinação individual",
      extras: "Mesas de apoio laterais e maior distanciamento",
    },
  },
};

/**
 * Identifica a categoria de experiência a partir do nome da sala.
 * Salas 1 e 2 -> Clássica
 * Sala 3 -> IMAX
 * Sala 4 -> VIP
 */
export function getRoomExperienceCategory(roomName?: string | null): ExperienceCategory {
  if (!roomName || typeof roomName !== "string") return "Clássica";
  const lower = roomName.toLowerCase().trim();

  // IMAX: Sala 3 ou menção a IMAX
  if (
    lower.includes("imax") ||
    lower.includes("sala 3") ||
    lower.includes("sala3") ||
    lower === "3"
  ) {
    return "IMAX";
  }

  // VIP: Sala 4 ou menção a VIP
  if (
    lower.includes("vip") ||
    lower.includes("sala 4") ||
    lower.includes("sala4") ||
    lower === "4"
  ) {
    return "VIP";
  }

  // Salas 1 e 2 -> Clássica
  return "Clássica";
}

/**
 * Retorna o número/identificador limpo da sala (ex: "Sala 1", "Sala 2", "Sala 3", "Sala 4").
 */
export function getRoomDisplayName(roomName?: string | null): string {
  if (!roomName || typeof roomName !== "string") return "Sala";
  const lower = roomName.toLowerCase();
  if (lower.includes("sala 1") || lower.includes("sala1")) return "Sala 1";
  if (lower.includes("sala 2") || lower.includes("sala2")) return "Sala 2";
  if (lower.includes("sala 3") || lower.includes("sala3")) return "Sala 3";
  if (lower.includes("sala 4") || lower.includes("sala4")) return "Sala 4";

  // Se já começar com "Sala <número>", normaliza
  const match = roomName.match(/Sala\s*\d+/i);
  if (match) {
    const digits = match[0].replace(/\D/g, "");
    return `Sala ${digits}`;
  }

  return roomName.trim();
}

/**
 * Retorna a identificação completa e padronizada da sala com sua experiência:
 * Ex: "Sala 1 — Clássica", "Sala 2 — Clássica", "Sala 3 — IMAX", "Sala 4 — VIP"
 */
export function getRoomWithExperience(roomName?: string | null): string {
  const room = getRoomDisplayName(roomName);
  const category = getRoomExperienceCategory(roomName);
  return `${room} — ${category}`;
}

/**
 * Verifica se uma sala atende ao filtro da programação selecionado.
 */
export function matchesProgramacaoFilter(
  roomName: string,
  filter: ProgramacaoFilter | string
): boolean {
  if (!filter || filter === "Todos" || filter === "TODOS") return true;
  if (filter === "Clássica" || filter === "CONFORT") {
    return getRoomExperienceCategory(roomName) === "Clássica";
  }
  return getRoomExperienceCategory(roomName) === filter;
}
