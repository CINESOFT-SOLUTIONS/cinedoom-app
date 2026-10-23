"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type GridSeatItem } from "../components/seating-grid";

export interface UseSessionSeatsOptions {
  intervalMs?: number; // default: 2000 (AC-2)
  enabled?: boolean;
  onSeatsUpdated?: (seats: GridSeatItem[]) => void;
  onError?: (error: Error) => void;
}

export interface UseSessionSeatsResult {
  seats: GridSeatItem[];
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Hook React para Polling Continuo do Mapa de Assentos (AC-2 / ADR-006)
 * - Consulta a rota GET /api/sessoes/[id]/assentos a cada 2000ms.
 * - Suspende requisicoes em background utilizando a Page Visibility API.
 * - Limpa timers no unmount para evitar memory leaks.
 */
export function useSessionSeats(
  sessionId: string | null | undefined,
  options: UseSessionSeatsOptions = {}
): UseSessionSeatsResult {
  const {
    intervalMs = 2000,
    enabled = true,
    onSeatsUpdated,
    onError,
  } = options;

  const [seats, setSeats] = useState<GridSeatItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  const fetchSeats = useCallback(async () => {
    if (!sessionId || isFetchingRef.current) return;

    // Se a aba estiver oculta, suspende requisicao para economizar conexoes
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    isFetchingRef.current = true;
    try {
      const response = await fetch(`/api/sessoes/${sessionId}/assentos`, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!isMountedRef.current) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Falha ao buscar assentos: HTTP ${response.status}`);
      }

      const data: GridSeatItem[] = await response.json();
      if (!isMountedRef.current) return;

      setSeats(data);
      setError(null);
      setLastUpdated(new Date());
      setIsLoading(false);

      if (onSeatsUpdated) {
        onSeatsUpdated(data);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido ao carregar assentos";
      setError(errorMsg);
      setIsLoading(false);

      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [sessionId, onSeatsUpdated, onError]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!sessionId || !enabled) {
      setIsLoading(false);
      setIsPolling(false);
      return;
    }

    setIsLoading(true);
    // Chamada imediata ao montar ou trocar de sessao
    fetchSeats();
    setIsPolling(true);

    // Configura o ciclo fixo de 2000ms (AC-2)
    const intervalTimer = setInterval(() => {
      fetchSeats();
    }, intervalMs);

    // Page Visibility API: ao focar na aba novamente, dispara busca imediata
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSeats();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalTimer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [sessionId, intervalMs, enabled, fetchSeats]);

  return {
    seats,
    isLoading,
    isPolling,
    error,
    lastUpdated,
    refetch: fetchSeats,
  };
}
