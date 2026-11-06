export const BOOKING_STORAGE_KEY = "cinedoom_booking_state_v1";

export interface SavedReservationState {
  contextId: string;
  selectedFilmId?: string;
  selectedSessionId?: string;
  cinemaTenantId?: string;
  roomId?: string;
  roomName?: string;
  selectedSeatIds: string[];
  ticketQuantities: {
    inteira: number;
    meia: number;
  };
  holdToken?: string;
  holdExpiresAt?: number | null;
  currentStep: number;
  createdAt: number;
}

/**
 * Gera um identificador único para o ciclo de vida de uma reserva.
 */
export function generateReservationContextId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 9);
  return `res_ctx_${ts}_${rand}`;
}

/**
 * Libera um bloqueio temporário de poltronas no backend de forma segura e não-bloqueante.
 */
export async function releaseReservationHold(
  sessionId?: string,
  holdToken?: string
): Promise<boolean> {
  if (!sessionId || !holdToken) return false;

  try {
    const payload = JSON.stringify({
      action: "RELEASE",
      holdToken,
    });

    const res = await fetch(`/api/portal/sessoes/${sessionId}/bloqueio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });

    return res.ok;
  } catch (err) {
    console.warn("Falha ao liberar bloqueio temporário no backend:", err);
    return false;
  }
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.sessionStorage) {
    return window.sessionStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).sessionStorage) {
    return (globalThis as any).sessionStorage;
  }
  return null;
}

/**
 * Obtém com segurança o estado da reserva armazenado no sessionStorage.
 */
export function getSavedReservationContext(): SavedReservationState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(BOOKING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedReservationState;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Limpa o contexto da reserva do sessionStorage.
 */
export function clearReservationContext(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(BOOKING_STORAGE_KEY);
  } catch {}
}

/**
 * Salva o contexto da reserva atual no sessionStorage.
 */
export function saveReservationContext(state: SavedReservationState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Quando o usuário inicia uma nova reserva para outro filme ou sessão,
 * abandona o contexto anterior, liberando as poltronas no backend e limpando o storage.
 */
export async function abandonPreviousReservationIfDifferent(
  targetFilmId?: string,
  targetSessionId?: string
): Promise<boolean> {
  const saved = getSavedReservationContext();
  if (!saved) return false;

  const isDifferentFilm = Boolean(
    targetFilmId && saved.selectedFilmId && saved.selectedFilmId !== targetFilmId
  );
  const isDifferentSession = Boolean(
    targetSessionId && saved.selectedSessionId && saved.selectedSessionId !== targetSessionId
  );

  if (isDifferentFilm || isDifferentSession) {
    // Libera assentos anteriores se houver token ativo
    if (saved.holdToken && saved.selectedSessionId) {
      await releaseReservationHold(saved.selectedSessionId, saved.holdToken);
    }
    clearReservationContext();
    return true;
  }

  return false;
}
