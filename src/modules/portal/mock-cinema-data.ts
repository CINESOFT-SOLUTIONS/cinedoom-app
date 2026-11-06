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
    name: "Sala 1 - Clássica",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "CLASSICA",
  },
  {
    id: "00000000-0000-4000-a000-000000000202",
    name: "Sala 2 - Clássica",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "CLASSICA",
  },
  {
    id: "00000000-0000-4000-a000-000000000203",
    name: "Sala 3 - IMAX",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "IMAX",
  },
  {
    id: "00000000-0000-4000-a000-000000000204",
    name: "Sala 4 - VIP",
    capacity: 60,
    rows: 6,
    columns: 10,
    type: "VIP",
  },
];

export function getMockRooms() {
  return MOCK_ROOMS;
}

interface SessionTemplate {
  roomIndex: number;
  hour: number;
  minute: number;
  price: number;
  idCode: string;
}

// Modelos de horários diversificados por filme para toda a semana (matinê, tarde, noite e sessão da madrugada)
const DUNA_TEMPLATES: SessionTemplate[] = [
  { roomIndex: 2, hour: 11, minute: 0, price: 42.0, idCode: "0314" },
  { roomIndex: 2, hour: 14, minute: 0, price: 42.0, idCode: "0310" },
  { roomIndex: 3, hour: 14, minute: 30, price: 54.0, idCode: "0350" }, // Sessão extra VIP vespertina
  { roomIndex: 0, hour: 16, minute: 0, price: 36.0, idCode: "0351" },  // Sessão extra Clássica
  { roomIndex: 3, hour: 16, minute: 30, price: 54.0, idCode: "0311" },
  { roomIndex: 2, hour: 19, minute: 0, price: 42.0, idCode: "0301" }, // ID histórico original
  { roomIndex: 0, hour: 20, minute: 15, price: 36.0, idCode: "0312" },
  { roomIndex: 2, hour: 21, minute: 45, price: 42.0, idCode: "0302" }, // ID histórico original
  { roomIndex: 3, hour: 22, minute: 30, price: 54.0, idCode: "0313" },
  { roomIndex: 1, hour: 23, minute: 0, price: 36.0, idCode: "0352" },  // Sessão extra Clássica noturna
];

const OPPENHEIMER_TEMPLATES: SessionTemplate[] = [
  { roomIndex: 2, hour: 10, minute: 30, price: 46.0, idCode: "0353" }, // Sessão extra IMAX matutina
  { roomIndex: 1, hour: 13, minute: 30, price: 34.0, idCode: "0325" },
  { roomIndex: 3, hour: 14, minute: 15, price: 54.0, idCode: "0320" },
  { roomIndex: 1, hour: 16, minute: 45, price: 34.0, idCode: "0321" },
  { roomIndex: 2, hour: 17, minute: 15, price: 46.0, idCode: "0322" },
  { roomIndex: 0, hour: 17, minute: 30, price: 34.0, idCode: "0354" }, // Sessão extra Clássica entardecer
  { roomIndex: 3, hour: 20, minute: 0, price: 54.0, idCode: "0303" }, // ID histórico original
  { roomIndex: 1, hour: 21, minute: 15, price: 34.0, idCode: "0323" },
  { roomIndex: 2, hour: 22, minute: 0, price: 46.0, idCode: "0355" },  // Sessão extra IMAX noite
  { roomIndex: 3, hour: 23, minute: 15, price: 54.0, idCode: "0324" },
];

const POBRES_CRIATURAS_TEMPLATES: SessionTemplate[] = [
  { roomIndex: 0, hour: 11, minute: 15, price: 32.0, idCode: "0356" }, // Sessão extra Clássica manhã
  { roomIndex: 0, hour: 13, minute: 45, price: 32.0, idCode: "0334" },
  { roomIndex: 0, hour: 14, minute: 30, price: 32.0, idCode: "0330" },
  { roomIndex: 1, hour: 15, minute: 0, price: 32.0, idCode: "0357" },  // Sessão extra Clássica tarde
  { roomIndex: 3, hour: 16, minute: 15, price: 50.0, idCode: "0331" },
  { roomIndex: 0, hour: 18, minute: 30, price: 32.0, idCode: "0304" }, // ID histórico original
  { roomIndex: 1, hour: 19, minute: 30, price: 32.0, idCode: "0332" },
  { roomIndex: 3, hour: 20, minute: 30, price: 50.0, idCode: "0358" }, // Sessão extra VIP noite
  { roomIndex: 0, hour: 21, minute: 0, price: 32.0, idCode: "0305" }, // ID histórico original
  { roomIndex: 3, hour: 22, minute: 15, price: 50.0, idCode: "0333" },
];

const DIVERTIDA_MENTE_TEMPLATES: SessionTemplate[] = [
  { roomIndex: 0, hour: 9, minute: 30, price: 28.0, idCode: "0359" },  // Sessão matinê infantil
  { roomIndex: 1, hour: 10, minute: 15, price: 28.0, idCode: "0346" },
  { roomIndex: 1, hour: 11, minute: 30, price: 28.0, idCode: "0340" },
  { roomIndex: 3, hour: 12, minute: 30, price: 45.0, idCode: "0360" }, // Sessão VIP família
  { roomIndex: 1, hour: 13, minute: 30, price: 30.0, idCode: "0341" },
  { roomIndex: 0, hour: 14, minute: 15, price: 30.0, idCode: "0342" },
  { roomIndex: 1, hour: 15, minute: 30, price: 32.0, idCode: "0306" }, // ID histórico original
  { roomIndex: 2, hour: 16, minute: 0, price: 40.0, idCode: "0361" },  // Sessão extra IMAX tarde
  { roomIndex: 0, hour: 17, minute: 0, price: 30.0, idCode: "0343" },
  { roomIndex: 1, hour: 17, minute: 45, price: 32.0, idCode: "0307" }, // ID histórico original
  { roomIndex: 2, hour: 18, minute: 30, price: 40.0, idCode: "0344" },
  { roomIndex: 0, hour: 20, minute: 0, price: 30.0, idCode: "0345" },
  { roomIndex: 1, hour: 20, minute: 45, price: 30.0, idCode: "0362" }, // Sessão noturna adicional
];

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

function generateSessions(templates: SessionTemplate[], baseDate: Date, _totalDays = 7) {
  const sessions = [];

  // Gera sessões de -1 (cobrindo fuso horário / transição noturna) até +8 dias (total 10 dias)
  for (let dayOffset = -1; dayOffset <= 8; dayOffset++) {
    // dayHex seguro de 0 a f mantendo formato estrito de UUID v4
    // dayOffset 0 usa '0' para manter retrocompatibilidade com IDs canônicos pré-definidos
    const dayHex = dayOffset === 0 ? "0" : dayOffset < 0 ? "f" : (dayOffset % 15).toString(16);

    for (const t of templates) {
      const room = MOCK_ROOMS[t.roomIndex];
      const d = new Date(baseDate);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(t.hour, t.minute, 0, 0);

      // Gera UUID válido v4 e mantém os IDs originais no dia 0
      const sessionId = `00000000-0000-4000-b00${dayHex}-00000000${t.idCode}`;

      sessions.push({
        id: sessionId,
        startsAt: d.toISOString(),
        price: t.price,
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
    }
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
      sessions: generateSessions(DUNA_TEMPLATES, today, 7),
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
      sessions: generateSessions(OPPENHEIMER_TEMPLATES, today, 7),
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
      sessions: generateSessions(POBRES_CRIATURAS_TEMPLATES, today, 7),
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
      sessions: generateSessions(DIVERTIDA_MENTE_TEMPLATES, today, 7),
    },
  ];
}

export function generateMockSeats(rows: number, cols: number, price: number) {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    for (let c = 1; c <= cols; c++) {
      const isReserved = (r === 2 && (c === 5 || c === 6)) || (r === 3 && (c === 4 || c === 5));
      seats.push({
        id: `seat-${rowLabel}${c}`,
        seat_id: `seat-${rowLabel}${c}`,
        seatId: `seat-${rowLabel}${c}`,
        row: rowLabel,
        rowLabel,
        number: c,
        columnNumber: c,
        seatCode: `${rowLabel}${c}`,
        status: isReserved ? "RESERVED" : "AVAILABLE",
        price,
      });
    }
  }
  return seats;
}
