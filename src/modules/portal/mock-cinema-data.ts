// Catalogo de Mocks e Fallback para as 4 Salas e 420 Assentos do CineDoom

export interface MockRoom {
  id: string;
  name: string;
  capacity: number;
  rows: number;
  columns: number;
  type: "CLASSICA" | "IMAX" | "VIP" | "CONFORT";
}

export const MOCK_ROOMS: MockRoom[] = [
  {
    id: "00000000-0000-4000-a000-000000000201",
    name: "Sala 01",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "CLASSICA",
  },
  {
    id: "00000000-0000-4000-a000-000000000202",
    name: "Sala 02",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "CLASSICA",
  },
  {
    id: "00000000-0000-4000-a000-000000000203",
    name: "Sala 03",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "IMAX",
  },
  {
    id: "00000000-0000-4000-a000-000000000204",
    name: "Sala 04",
    capacity: 60,
    rows: 6,
    columns: 10,
    type: "VIP",
  },
];

interface SessionTemplate {
  roomIndex: number;
  hour: number;
  minute: number;
  price: number;
  idCode: string;
}

// Grade Semanal Canônica CineDoom (Total: 52 sessões semanais)
// Associação estrita Sala <-> Filme:
// - Sala 01 (Clássica): Divertida Mente 2 (roomIndex: 0)
// - Sala 02 (Clássica): Oppenheimer (roomIndex: 1)
// - Sala 03 (IMAX): Duna: Parte Dois (roomIndex: 2)
// - Sala 04 (VIP): Pobres Criaturas (roomIndex: 3)
//
// Mapeamento por dia da semana (0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado):
interface DaySchedule {
  sala01: { hour: number; minute: number }[]; // Divertida Mente 2
  sala02: { hour: number; minute: number }[]; // Oppenheimer
  sala03: { hour: number; minute: number }[]; // Duna: Parte Dois
  sala04: { hour: number; minute: number }[]; // Pobres Criaturas
}

const WEEKLY_CANONICAL_SCHEDULE: Record<number, DaySchedule> = {
  // Quinta (weekday 4)
  4: {
    sala01: [{ hour: 14, minute: 0 }, { hour: 19, minute: 0 }],
    sala02: [{ hour: 15, minute: 0 }, { hour: 20, minute: 0 }],
    sala03: [{ hour: 14, minute: 30 }, { hour: 19, minute: 30 }],
    sala04: [{ hour: 15, minute: 30 }, { hour: 20, minute: 30 }],
  },
  // Sexta (weekday 5)
  5: {
    sala01: [{ hour: 14, minute: 30 }, { hour: 19, minute: 30 }],
    sala02: [{ hour: 14, minute: 0 }, { hour: 19, minute: 0 }],
    sala03: [{ hour: 15, minute: 0 }, { hour: 20, minute: 0 }],
    sala04: [{ hour: 15, minute: 30 }, { hour: 20, minute: 30 }],
  },
  // Sábado (weekday 6)
  6: {
    sala01: [{ hour: 12, minute: 0 }, { hour: 16, minute: 0 }, { hour: 20, minute: 0 }],
    sala02: [{ hour: 13, minute: 0 }, { hour: 17, minute: 0 }, { hour: 21, minute: 0 }],
    sala03: [{ hour: 12, minute: 30 }, { hour: 16, minute: 30 }, { hour: 20, minute: 30 }],
    sala04: [{ hour: 13, minute: 30 }, { hour: 17, minute: 30 }, { hour: 21, minute: 30 }],
  },
  // Domingo (weekday 0)
  0: {
    sala01: [{ hour: 13, minute: 0 }, { hour: 17, minute: 0 }, { hour: 21, minute: 0 }],
    sala02: [{ hour: 12, minute: 0 }, { hour: 16, minute: 0 }, { hour: 20, minute: 0 }],
    sala03: [{ hour: 13, minute: 30 }, { hour: 17, minute: 30 }, { hour: 21, minute: 30 }],
    sala04: [{ hour: 12, minute: 30 }, { hour: 16, minute: 30 }, { hour: 20, minute: 30 }],
  },
  // Segunda (weekday 1)
  1: {
    sala01: [{ hour: 16, minute: 0 }],
    sala02: [{ hour: 17, minute: 0 }],
    sala03: [{ hour: 16, minute: 30 }],
    sala04: [{ hour: 17, minute: 30 }],
  },
  // Terça (weekday 2)
  2: {
    sala01: [{ hour: 17, minute: 0 }],
    sala02: [{ hour: 16, minute: 0 }],
    sala03: [{ hour: 17, minute: 30 }],
    sala04: [{ hour: 16, minute: 30 }],
  },
  // Quarta (weekday 3)
  3: {
    sala01: [{ hour: 16, minute: 30 }],
    sala02: [{ hour: 17, minute: 30 }],
    sala03: [{ hour: 16, minute: 0 }],
    sala04: [{ hour: 17, minute: 0 }],
  },
};

function getCinemaBaseDate(): Date {
  const now = new Date();
  try {
    const brDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const [year, month, day] = brDateStr.split("-").map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day, 12, 0, 0);
    }
  } catch {
    // Fallback caso Intl falhe
  }
  return new Date();
}

export interface MockSession {
  id: string;
  startsAt: string;
  price: number;
  status: string;
  room: {
    id: string;
    name: string;
    capacity: number;
    rows: number;
    columns: number;
    type: string;
  };
}

function generateSessionsForFilm(roomIndex: number, filmPrefix: string, baseDate: Date): MockSession[] {
  const sessions: MockSession[] = [];
  const room = MOCK_ROOMS[roomIndex];

  // Gera sessões para a janela do calendário cobrindo -1 até +8 dias
  for (let dayOffset = -1; dayOffset <= 8; dayOffset++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dayOffset);

    const weekday = d.getDay();
    const daySchedule = WEEKLY_CANONICAL_SCHEDULE[weekday];
    if (!daySchedule) continue;

    let slots: { hour: number; minute: number }[] = [];
    if (roomIndex === 0) slots = daySchedule.sala01;
    else if (roomIndex === 1) slots = daySchedule.sala02;
    else if (roomIndex === 2) slots = daySchedule.sala03;
    else if (roomIndex === 3) slots = daySchedule.sala04;

    const dayHex = dayOffset === 0 ? "0" : dayOffset < 0 ? "f" : (dayOffset % 15).toString(16);

    slots.forEach((slot, slotIdx) => {
      const sessionDate = new Date(d);
      sessionDate.setHours(slot.hour, slot.minute, 0, 0);

      const hourStr = String(slot.hour).padStart(2, "0");
      const minStr = String(slot.minute).padStart(2, "0");
      const idCode = `${filmPrefix}${hourStr}${minStr}`.padEnd(8, "0").slice(0, 8);
      const sessionId = `00000000-0000-4000-b00${dayHex}-00000000${idCode}`;

      sessions.push({
        id: sessionId,
        startsAt: sessionDate.toISOString(),
        price: 30.0,
        status: "OPEN",
        room: {
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          rows: room.rows,
          columns: room.columns,
          type: room.type,
        },
      });
    });
  }

  return sessions;
}

export function getMockFilmsWithSessions() {
  const today = getCinemaBaseDate();

  return [
    {
      id: "00000000-0000-4000-a000-000000000101",
      title: "Duna: Parte Dois",
      director: "Denis Villeneuve",
      synopsis: "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família.",
      duration: 166,
      classification: "14",
      genre: "Ficção Científica • Aventura",
      posterUrl: "/posters/duna-2.jpg",
      sessions: generateSessionsForFilm(2, "03", today), // Sala 03 (IMAX)
    },
    {
      id: "00000000-0000-4000-a000-000000000102",
      title: "Oppenheimer",
      director: "Christopher Nolan",
      synopsis: "A história do físico americano J. Robert Oppenheimer, seu papel no Projeto Manhattan e o desenvolvimento da bomba atômica.",
      duration: 180,
      classification: "16",
      genre: "Drama Histórico • Biografia",
      posterUrl: "/posters/oppenheimer.jpg",
      sessions: generateSessionsForFilm(1, "02", today), // Sala 02 (Clássica)
    },
    {
      id: "00000000-0000-4000-a000-000000000103",
      title: "Pobres Criaturas",
      director: "Yorgos Lanthimos",
      synopsis: "A fantástica evolução de Bella Baxter, uma jovem trazida de volta à vida pelo brilhante e heterodoxo cientista Dr. Godwin Baxter.",
      duration: 141,
      classification: "18",
      genre: "Romance • Fantasia • Comédia",
      posterUrl: "/posters/pobres-criaturas.jpg",
      sessions: generateSessionsForFilm(3, "04", today), // Sala 04 (VIP)
    },
    {
      id: "00000000-0000-4000-a000-000000000104",
      title: "Divertida Mente 2",
      director: "Kelsey Mann",
      synopsis: "Com a chegada da adolescência, a sala de controle mental de Riley passa por uma demolição para abrir espaço para novas emoções inesperadas.",
      duration: 96,
      classification: "L",
      genre: "Animação • Família • Aventura",
      posterUrl: "/posters/divertida-mente-2.jpg",
      sessions: generateSessionsForFilm(0, "01", today), // Sala 01 (Clássica)
    },
  ];
}

// Conjunto global em memória de assentos bloqueados para manutenção física nas salas (escopo por Sala)
// Usamos globalThis para evitar reset do Map durante Fast Refresh do Next.js em desenvolvimento
const globalForCinema = globalThis as unknown as {
  roomMaintenanceBlockedSeats?: Map<string, Set<string>>;
};

const ROOM_MAINTENANCE_BLOCKED_SEATS =
  globalForCinema.roomMaintenanceBlockedSeats ?? new Map<string, Set<string>>();

if (process.env.NODE_ENV !== "production") {
  globalForCinema.roomMaintenanceBlockedSeats = ROOM_MAINTENANCE_BLOCKED_SEATS;
}

export function getMaintenanceKey(roomId?: string): string {
  if (!roomId) return "DEFAULT";
  // Se for UUID de sala mock canônica ou ID genérico, normaliza para associar por número de sala também
  for (let i = 0; i < MOCK_ROOMS.length; i++) {
    const r = MOCK_ROOMS[i];
    if (r.id === roomId || roomId.includes(`020${i + 1}`) || roomId.includes(`sala-0${i + 1}`) || roomId.toLowerCase().includes(`sala 0${i + 1}`)) {
      return r.id;
    }
  }
  return roomId;
}

export function toggleSeatMaintenance(seatCodeOrId: string, roomId?: string): boolean {
  // Extrai código limpo como "A1" de formatos "seat-A1", "0000-seat-A1", "A1", etc.
  const codeMatch = seatCodeOrId.match(/([A-Z]\d+)$/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : seatCodeOrId.replace(/^seat-/, "").toUpperCase();
  const roomKey = getMaintenanceKey(roomId);

  if (!ROOM_MAINTENANCE_BLOCKED_SEATS.has(roomKey)) {
    ROOM_MAINTENANCE_BLOCKED_SEATS.set(roomKey, new Set<string>());
  }

  const roomBlockedSet = ROOM_MAINTENANCE_BLOCKED_SEATS.get(roomKey)!;
  if (roomBlockedSet.has(code)) {
    roomBlockedSet.delete(code);
    return false;
  } else {
    roomBlockedSet.add(code);
    return true;
  }
}

export function isSeatBlockedForMaintenance(seatCodeOrId: string, roomId?: string): boolean {
  const codeMatch = seatCodeOrId.match(/([A-Z]\d+)$/i);
  const code = codeMatch ? codeMatch[1].toUpperCase() : seatCodeOrId.replace(/^seat-/, "").toUpperCase();

  if (roomId) {
    const roomKey = getMaintenanceKey(roomId);
    const roomBlockedSet = ROOM_MAINTENANCE_BLOCKED_SEATS.get(roomKey);
    if (roomBlockedSet && roomBlockedSet.has(code)) return true;

    // Também checa se o roomId bruto sem normalização possui chave direta
    if (roomKey !== roomId) {
      const rawSet = ROOM_MAINTENANCE_BLOCKED_SEATS.get(roomId);
      if (rawSet && rawSet.has(code)) return true;
    }
  }

  // Verifica também na chave DEFAULT (compatibilidade com chamadas sem roomId)
  const defaultSet = ROOM_MAINTENANCE_BLOCKED_SEATS.get("DEFAULT");
  if (defaultSet && defaultSet.has(code)) return true;

  return false;
}

export function getRoomBlockedSeats(roomId: string): Set<string> {
  const roomBlockedSet = ROOM_MAINTENANCE_BLOCKED_SEATS.get(roomId);
  const defaultSet = ROOM_MAINTENANCE_BLOCKED_SEATS.get("DEFAULT");
  const combined = new Set<string>();
  if (roomBlockedSet) {
    roomBlockedSet.forEach((c) => combined.add(c));
  }
  if (defaultSet) {
    defaultSet.forEach((c) => combined.add(c));
  }
  return combined;
}

export function generateMockSeats(rows: number, cols: number, price: number, sessionId?: string, roomId?: string) {
  // Se sessionId for fornecido e roomId não, tenta descobrir o roomId da sessão mock
  let resolvedRoomId = roomId;
  if (!resolvedRoomId && sessionId) {
    const allSessions = getMockFilmsWithSessions().flatMap((f) => f.sessions);
    const session = allSessions.find((s) => s.id === sessionId);
    if (session) {
      resolvedRoomId = session.room.id;
    }
  }

  const seats = [];
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    for (let c = 1; c <= cols; c++) {
      const code = `${rowLabel}${c}`;
      const isBlocked = isSeatBlockedForMaintenance(code, resolvedRoomId);
      seats.push({
        id: `seat-${rowLabel}${c}`,
        seat_id: `seat-${rowLabel}${c}`,
        seatId: `seat-${rowLabel}${c}`,
        row: rowLabel,
        rowLabel,
        number: c,
        columnNumber: c,
        seatCode: code,
        status: isBlocked ? "BLOCKED" : "AVAILABLE",
        price,
      });
    }
  }
  return seats;
}
