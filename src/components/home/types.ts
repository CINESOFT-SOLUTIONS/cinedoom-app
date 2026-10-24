export interface SessionItem {
  id: string;
  startsAt: string;
  price: number;
  status: string;
  room: {
    id: string;
    name: string;
    capacity: number;
  };
}

export interface FilmItem {
  id: string;
  title: string;
  originalTitle?: string;
  synopsis?: string;
  duration: number;
  classification?: string;
  genre?: string;
  posterUrl?: string;
  director?: string;
  cast?: string;
  sessions: SessionItem[];
}

export const GENRE_MAP: Record<string, string> = {
  "Duna: Parte Dois": "Ficção Científica • Aventura • IMAX Laser",
  "Oppenheimer": "Drama Histórico • Biografia • 70mm",
  "Pobres Criaturas": "Fantasia • Romance • Sala Confort",
  "Interestelar": "Ficção Científica • Aventura • IMAX Laser",
};
