// Catalogo de Mocks e Fallback para as 4 Salas e 420 Assentos do CineDoom

export interface MockRoom {
  id: string;
  name: string;
  capacity: number;
  rows: number;
  columns: number;
  type: "CONFORT" | "IMAX" | "VIP";
}

export const MOCK_ROOMS: MockRoom[] = [
  {
    id: "00000000-0000-4000-a000-000000000201",
    name: "Sala 1 - Confort",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "CONFORT",
  },
  {
    id: "00000000-0000-4000-a000-000000000202",
    name: "Sala 2 - Confort",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "CONFORT",
  },
  {
    id: "00000000-0000-4000-a000-000000000203",
    name: "Sala 3 - IMAX Laser",
    capacity: 120,
    rows: 10,
    columns: 12,
    type: "IMAX",
  },
  {
    id: "00000000-0000-4000-a000-000000000204",
    name: "Sala 4 - VIP Prime",
    capacity: 60,
    rows: 6,
    columns: 10,
    type: "VIP",
  },
];

export function getMockRooms() {
  return MOCK_ROOMS;
}

export function getMockFilmsWithSessions() {
  const today = new Date();
  
  function createTime(hours: number, minutes = 0) {
    const d = new Date(today);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  }

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
      sessions: [
        {
          id: "00000000-0000-4000-b000-000000000301",
          startsAt: createTime(19, 0),
          price: 42.0,
          status: "OPEN",
          room: {
            id: MOCK_ROOMS[2].id,
            name: MOCK_ROOMS[2].name,
            capacity: MOCK_ROOMS[2].capacity,
            rows: MOCK_ROOMS[2].rows,
            columns: MOCK_ROOMS[2].columns,
            type: MOCK_ROOMS[2].type,
          },
        },
        {
          id: "00000000-0000-4000-b000-000000000302",
          startsAt: createTime(21, 45),
          price: 42.0,
          status: "OPEN",
          room: {
            id: MOCK_ROOMS[2].id,
            name: MOCK_ROOMS[2].name,
            capacity: MOCK_ROOMS[2].capacity,
            rows: MOCK_ROOMS[2].rows,
            columns: MOCK_ROOMS[2].columns,
            type: MOCK_ROOMS[2].type,
          },
        },
      ],
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
      sessions: [
        {
          id: "00000000-0000-4000-b000-000000000303",
          startsAt: createTime(20, 0),
          price: 54.0,
          status: "OPEN",
          room: {
            id: MOCK_ROOMS[3].id,
            name: MOCK_ROOMS[3].name,
            capacity: MOCK_ROOMS[3].capacity,
            rows: MOCK_ROOMS[3].rows,
            columns: MOCK_ROOMS[3].columns,
            type: MOCK_ROOMS[3].type,
          },
        },
      ],
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
      sessions: [
        {
          id: "00000000-0000-4000-b000-000000000304",
          startsAt: createTime(18, 30),
          price: 32.0,
          status: "OPEN",
          room: {
            id: MOCK_ROOMS[0].id,
            name: MOCK_ROOMS[0].name,
            capacity: MOCK_ROOMS[0].capacity,
            rows: MOCK_ROOMS[0].rows,
            columns: MOCK_ROOMS[0].columns,
            type: MOCK_ROOMS[0].type,
          },
        },
        {
          id: "00000000-0000-4000-b000-000000000305",
          startsAt: createTime(21, 0),
          price: 32.0,
          status: "OPEN",
          room: {
            id: MOCK_ROOMS[0].id,
            name: MOCK_ROOMS[0].name,
            capacity: MOCK_ROOMS[0].capacity,
            rows: MOCK_ROOMS[0].rows,
            columns: MOCK_ROOMS[0].columns,
            type: MOCK_ROOMS[0].type,
          },
        },
      ],
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
      sessions: [
        {
          id: "00000000-0000-4000-b000-000000000306",
          startsAt: createTime(15, 30),
          price: 32.0,
          status: "OPEN",
          room: {
            id: MOCK_ROOMS[1].id,
            name: MOCK_ROOMS[1].name,
            capacity: MOCK_ROOMS[1].capacity,
            rows: MOCK_ROOMS[1].rows,
            columns: MOCK_ROOMS[1].columns,
            type: MOCK_ROOMS[1].type,
          },
        },
        {
          id: "00000000-0000-4000-b000-000000000307",
          startsAt: createTime(17, 45),
          price: 32.0,
          status: "OPEN",
          room: {
            id: MOCK_ROOMS[1].id,
            name: MOCK_ROOMS[1].name,
            capacity: MOCK_ROOMS[1].capacity,
            rows: MOCK_ROOMS[1].rows,
            columns: MOCK_ROOMS[1].columns,
            type: MOCK_ROOMS[1].type,
          },
        },
      ],
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
