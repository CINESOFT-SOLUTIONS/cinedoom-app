/**
 * Utilitários padronizados para formatação de metadados dos filmes do CineDoom.
 * Garante consistência estrutural e semântica em todos os cards e modais,
 * respeitando as regras de omissão de campos ausentes e extração de gênero principal.
 */

/**
 * Extrai e normaliza o gênero cinematográfico principal a partir do campo de gênero.
 * Regra: Seleciona o primeiro gênero quando houver múltiplos (separadores: •, ·, /, ,, ;, |)
 * e aplica formatação uniforme (Sentence case, ex: "Ficção científica", "Drama histórico").
 * Retorna null se ausente, vazio ou semanticamente inválido.
 * NUNCA substitui por diretor, elenco ou dedução de título.
 */
export function getPrimaryGenre(genre?: string | null): string | null {
  if (!genre || typeof genre !== "string") return null;

  const trimmed = genre.trim();
  if (!trimmed) return null;

  // Extrai o primeiro token delimitado por separadores comuns
  const firstToken = trimmed.split(/[•·\/,;|]/)[0]?.trim();
  if (!firstToken) return null;

  // Formata para Sentence case (primeira palavra maiúscula, seguintes minúsculas)
  const words = firstToken.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const formatted = words
    .map((word, idx) => {
      if (idx === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    })
    .join(" ");

  return formatted || null;
}

/**
 * Formata a duração em minutos com sufixo padronizado "min".
 * Exemplo: 142 -> "142 min", 166 -> "166 min".
 * Retorna null se ausente ou inválido (sem fallback falso).
 */
export function formatDuration(durationMinutes?: number | null): string | null {
  if (
    durationMinutes === undefined ||
    durationMinutes === null ||
    typeof durationMinutes !== "number" ||
    isNaN(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return null;
  }

  return `${Math.round(durationMinutes)} min`;
}

/**
 * Gera a linha padronizada de metadados para exibição no card de filme:
 * Ordem estrita: [Gênero cinematográfico principal] · [Duração]
 * Exemplo: "Ação · 142 min" ou "Ficção científica · 166 min"
 * Separador oficial: ' · ' (ponto mediano \u00B7)
 * Se algum campo estiver ausente, omite sem substituir seu conteúdo por outro campo.
 */
export function formatFilmMetaLine(film: {
  genre?: string | null;
  duration?: number | null;
}): string {
  const genre = getPrimaryGenre(film.genre);
  const duration = formatDuration(film.duration);

  if (genre && duration) {
    return `${genre} · ${duration}`;
  }
  if (genre) {
    return genre;
  }
  if (duration) {
    return duration;
  }
  return "";
}
