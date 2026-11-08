/**
 * Fonte única de verdade para Salas e Categorias de Experiência do CineDoom.
 *
 * Estrutura Oficial do Complexo (4 Salas em 3 Experiências):
 * - Salas 1 e 2 — CLÁSSICA: experiência tradicional de cinema, com 120 lugares, tela panorâmica, som de qualidade e poltronas confortáveis.
 * - Sala 3 — IMAX: experiência audiovisual imersiva, com 120 lugares, projeção IMAX a laser e sistema de som imersivo.
 * - Sala 4 — VIP: experiência premium, com 60 lugares, poltronas reclináveis, mesas de apoio individuais e maior conforto.
 */

export type ExperienceCategory = "CLÁSSICA" | "IMAX" | "VIP";

export type ProgramacaoFilter = "Todos" | "CLÁSSICA" | "IMAX" | "VIP";

export const EXPERIENCE_CATEGORIES: readonly ExperienceCategory[] = [
  "CLÁSSICA",
  "IMAX",
  "VIP",
] as const;

export const PROGRAMACAO_FILTERS: readonly ProgramacaoFilter[] = [
  "Todos",
  "CLÁSSICA",
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
  CLÁSSICA: {
    id: "classica",
    category: "CLÁSSICA",
    title: "CLÁSSICA",
    rooms: "Salas 1 e 2",
    roomsLabel: "Salas 1 e 2",
    roomsList: ["Sala 1", "Sala 2"],
    roomNumbers: [1, 2],
    capacityPerRoom: 120,
    totalSeats: 240,
    totalCapacity: 240,
    badge: "Salas 1 e 2 • 120 Lugares por sala",
    shortDescription:
      "Aproveite seus filmes favoritos em uma sala projetada para proporcionar conforto e uma ótima experiência audiovisual, com tela ampla, som de qualidade e poltronas espaçosas.",
    description:
      "Aproveite seus filmes favoritos em uma sala projetada para proporcionar conforto e uma ótima experiência audiovisual, com tela ampla, som de qualidade e poltronas espaçosas.",
    features: [
      "Tela ampla de alta definição",
      "Som de qualidade",
      "Poltronas confortáveis e espaçosas",
    ],
    specs: {
      projection: "Projeção Digital de Alta Definição",
      sound: "Som de Qualidade",
      seats: "Poltronas confortáveis e espaçosas",
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
      "Viva o cinema em outra escala, com imagens de alta nitidez, uma tela de grandes dimensões e som potente que envolve você em cada cena. O formato da sala favorece uma experiência imersiva.",
    description:
      "Viva o cinema em outra escala, com imagens de alta nitidez, uma tela de grandes dimensões e som potente que envolve você em cada cena. O formato da sala favorece uma experiência imersiva.",
    features: [
      "Imagens de alta nitidez",
      "Som potente que envolve você",
      "Tela de grandes dimensões para uma experiência imersiva.",
    ],
    specs: {
      projection: "Projeção IMAX a Laser",
      sound: "Som potente que envolve você",
      seats: "Tela de grandes dimensões para uma experiência imersiva.",
      extras: "Visão ampla e imersiva da tela",
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
      "Desfrute de uma sessão mais confortável em poltronas reclináveis, com mesas individuais para apoiar suas bebidas e petiscos. Um ambiente pensado para você relaxar e aproveitar o filme no seu próprio ritmo.",
    description:
      "Desfrute de uma sessão mais confortável em poltronas reclináveis, com mesas individuais para apoiar suas bebidas e petiscos. Um ambiente pensado para você relaxar e aproveitar o filme no seu próprio ritmo.",
    features: [
      "Poltronas reclináveis",
      "Mesas individuais de apoio",
      "Ambiente para relaxar no seu próprio ritmo",
    ],
    specs: {
      projection: "Projeção Digital de Alta Definição",
      sound: "Som Aconchegante e Nítido",
      seats: "Poltronas reclináveis com acionamento individual",
      extras: "Mesas individuais para bebidas e petiscos",
    },
  },
};

/**
 * Identifica a categoria de experiência a partir do nome da sala.
 * Salas 1 e 2 -> CLÁSSICA
 * Sala 3 -> IMAX
 * Sala 4 -> VIP
 */
export function getRoomExperienceCategory(roomName?: string | null): ExperienceCategory {
  if (!roomName || typeof roomName !== "string") return "CLÁSSICA";
  const lower = roomName.toLowerCase().trim();

  // IMAX: Sala 3 ou menção a IMAX
  if (
    lower.includes("imax") ||
    lower.includes("sala 3") ||
    lower.includes("sala 03") ||
    lower.includes("sala3") ||
    lower.includes("sala03") ||
    lower === "3" ||
    lower === "03"
  ) {
    return "IMAX";
  }

  // VIP: Sala 4 ou menção a VIP
  if (
    lower.includes("vip") ||
    lower.includes("sala 4") ||
    lower.includes("sala 04") ||
    lower.includes("sala4") ||
    lower.includes("sala04") ||
    lower === "4" ||
    lower === "04"
  ) {
    return "VIP";
  }

  // Salas 1 e 2 -> CLÁSSICA
  return "CLÁSSICA";
}

/**
 * Retorna o identificador padronizado com 2 dígitos apenas com o número da sala
 * (ex: "Sala 01", "Sala 02", "Sala 03", "Sala 04"), sem sufixo de especificação.
 */
export function getCanonicalRoomName(roomName?: string | null): string {
  if (!roomName || typeof roomName !== "string") return "Sala 01";
  const lower = roomName.toLowerCase().trim();
  if (lower.includes("sala 01") || lower.includes("sala 1") || lower.includes("sala01") || lower.includes("sala1") || lower === "1" || lower === "01") {
    return "Sala 01";
  }
  if (lower.includes("sala 02") || lower.includes("sala 2") || lower.includes("sala02") || lower.includes("sala2") || lower === "2" || lower === "02") {
    return "Sala 02";
  }
  if (lower.includes("sala 03") || lower.includes("sala 3") || lower.includes("sala03") || lower.includes("sala3") || lower === "3" || lower === "03") {
    return "Sala 03";
  }
  if (lower.includes("sala 04") || lower.includes("sala 4") || lower.includes("sala04") || lower.includes("sala4") || lower === "4" || lower === "04") {
    return "Sala 04";
  }

  const match = roomName.match(/Sala\s*(\d+)/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num)) {
      return `Sala ${String(num).padStart(2, "0")}`;
    }
  }

  return roomName.trim();
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
 * Ex: "Sala 1 — CLÁSSICA", "Sala 2 — CLÁSSICA", "Sala 3 — IMAX", "Sala 4 — VIP"
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
  if (filter === "CLÁSSICA" || filter === "CONFORT") {
    return getRoomExperienceCategory(roomName) === "CLÁSSICA";
  }
  return getRoomExperienceCategory(roomName) === filter;
}
