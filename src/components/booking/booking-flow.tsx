"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Film,
  Info,
  Check,
  Plus,
  Minus,
  Sparkles,
  Timer,
  AlertCircle,
} from "lucide-react";
import { SeatingGrid, type GridSeatItem } from "@/modules/bilheteria/components/seating-grid";
import { AgeRatingBadge } from "@/components/home/age-rating-badge";
import { getRoomExperienceCategory, getRoomDisplayName } from "@/shared/experiences";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { formatDuration, getPrimaryGenre } from "@/components/home/film-utils";
import type { FilmItem, SessionItem } from "@/components/home/types";

export type BookingStep = 1 | 2 | 3 | 4;

interface SessionPortalDetail {
  id: string;
  tenantId: string;
  cinemaName: string;
  status: string;
  startsAt: string;
  price: number;
  canReserveOnline: boolean;
  minutesUntilSession: number;
  film: {
    id: string;
    title: string;
    synopsis?: string;
    duration: number;
    classification?: string;
    genre?: string;
    posterUrl?: string;
    director?: string;
  };
  room: {
    id: string;
    name: string;
    capacity: number;
    rows: number;
    columns: number;
  };
}

interface BookingFlowProps {
  initialFilmId?: string;
  initialSessionId?: string;
}

const STORAGE_KEY = "cinedoom_booking_state_v1";

export function BookingFlow({ initialFilmId, initialSessionId }: BookingFlowProps) {
  const router = useRouter();
  const { data: authSession, status: authStatus } = useSession();
  const { openLogin } = useAuthModal();

  // Estados principais da jornada
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [availableFilms, setAvailableFilms] = useState<FilmItem[]>([]);
  const [selectedFilm, setSelectedFilm] = useState<FilmItem | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionPortalDetail | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSessionId || "");
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);

  // Estados do mapa de assentos (Etapa 2)
  const [seats, setSeats] = useState<GridSeatItem[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [seatsLoading, setSeatsLoading] = useState<boolean>(false);

  // Estados de ingressos (Etapa 3)
  const [ticketQuantities, setTicketQuantities] = useState<{ inteira: number; meia: number }>({
    inteira: 0,
    meia: 0,
  });

  // Estados de comprador (Etapa 4)
  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerEmail, setBuyerEmail] = useState<string>("");
  const [buyerCpf, setBuyerCpf] = useState<string>("");
  const [lgpdConsent, setLgpdConsent] = useState<boolean>(false);

  // Bloqueio temporario de 10 minutos
  const [holdToken, setHoldToken] = useState<string>("");
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [isHoldExpired, setIsHoldExpired] = useState<boolean>(false);

  // Feedback e submissao
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [generalLoading, setGeneralLoading] = useState<boolean>(true);

  // 1. Gera as 7 abas de data a partir de hoje
  const dateTabs = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const dayName = isToday
        ? "Hoje"
        : isTomorrow
        ? "Amanhã"
        : d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
      const dayNumber = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return { index: i, dayName, dayNumber, date: d };
    });
  }, []);

  // 2. Carrega catálogo de filmes para Etapa 1
  useEffect(() => {
    async function loadCatalog() {
      try {
        setGeneralLoading(true);
        const res = await fetch("/api/portal/filmes", { cache: "no-store" });
        if (res.ok) {
          const data: FilmItem[] = await res.json();
          setAvailableFilms(data);

          if (initialFilmId) {
            const found = data.find((f) => f.id === initialFilmId);
            if (found) setSelectedFilm(found);
          } else if (data.length > 0) {
            setSelectedFilm(data[0]);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo de filmes:", err);
      } finally {
        setGeneralLoading(false);
      }
    }
    loadCatalog();
  }, [initialFilmId]);

  // 3. Se veio initialSessionId, posiciona
  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  // 4. Carrega detalhes da sessão selecionada
  useEffect(() => {
    if (!selectedSessionId) return;

    async function loadSession() {
      try {
        const res = await fetch(`/api/portal/sessoes/${selectedSessionId}`, { cache: "no-store" });
        if (res.ok) {
          const data: SessionPortalDetail = await res.json();
          setSessionDetail(data);

          if (data.film) {
            setSelectedFilm((prev) => {
              if (prev && prev.id === data.film.id) return prev;
              return {
                id: data.film.id,
                title: data.film.title,
                synopsis: data.film.synopsis || "",
                duration: data.film.duration,
                classification: data.film.classification || "L",
                genre: data.film.genre || "Cinema",
                posterUrl: data.film.posterUrl || "",
                director: data.film.director || "",
                sessions: [],
              };
            });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar sessão:", err);
      }
    }
    loadSession();
  }, [selectedSessionId]);

  // 5. Polling de Assentos (Etapa 2)
  const fetchSeats = useCallback(async () => {
    if (!selectedSessionId) return;
    try {
      const res = await fetch(`/api/portal/sessoes/${selectedSessionId}/assentos`, {
        cache: "no-store",
      }).catch(() => null);

      let data: GridSeatItem[] | null = null;
      if (res && res.ok) {
        data = await res.json();
      } else {
        const fallbackRes = await fetch(`/api/sessoes/${selectedSessionId}/assentos`, {
          cache: "no-store",
          headers: sessionDetail?.tenantId ? { "x-tenant-id": sessionDetail.tenantId } : {},
        }).catch(() => null);
        if (fallbackRes && fallbackRes.ok) {
          data = await fallbackRes.json();
        }
      }

      if (data && Array.isArray(data)) {
        setSeats(data);
        setSelectedSeatIds((prev) =>
          prev.filter((id) => {
            const current = data?.find((s) => s.id === id);
            return current && (current.status === "AVAILABLE" || current.status === "RESERVED");
          })
        );
      }
    } catch (err) {
      console.error("Erro no polling de assentos:", err);
    }
  }, [selectedSessionId, sessionDetail?.tenantId]);

  useEffect(() => {
    if (selectedSessionId && currentStep === 2) {
      setSeatsLoading(true);
      fetchSeats().finally(() => setSeatsLoading(false));
      const interval = setInterval(fetchSeats, 2500);
      return () => clearInterval(interval);
    }
  }, [selectedSessionId, currentStep, fetchSeats]);

  // 6. Preenche dados do comprador a partir da autenticação
  useEffect(() => {
    if (authSession?.user) {
      if (authSession.user.name && !buyerName) setBuyerName(authSession.user.name);
      if (authSession.user.email && !buyerEmail) setBuyerEmail(authSession.user.email);
    }
  }, [authSession, buyerName, buyerEmail]);

  // 7. Sincroniza quantidades padrão de ingressos quando a seleção de assentos muda
  useEffect(() => {
    const seatCount = selectedSeatIds.length;
    if (seatCount > 0) {
      setTicketQuantities((prev) => {
        const currentSum = prev.inteira + prev.meia;
        if (currentSum !== seatCount) {
          return { inteira: seatCount, meia: 0 };
        }
        return prev;
      });
    } else {
      setTicketQuantities({ inteira: 0, meia: 0 });
    }
  }, [selectedSeatIds.length]);

  // 8. Cronômetro regressivo dos 10 minutos
  useEffect(() => {
    if (!holdExpiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((holdExpiresAt - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        setIsHoldExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  // 9. Persistência em sessionStorage para sobreviver a refresh e login
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.holdExpiresAt && parsed.holdExpiresAt > Date.now()) {
          setHoldToken(parsed.holdToken || "");
          setHoldExpiresAt(parsed.holdExpiresAt);
          if (parsed.selectedSeatIds) setSelectedSeatIds(parsed.selectedSeatIds);
          if (parsed.ticketQuantities) setTicketQuantities(parsed.ticketQuantities);
          if (parsed.selectedSessionId) setSelectedSessionId(parsed.selectedSessionId);
          if (parsed.currentStep && parsed.currentStep >= 3) {
            setCurrentStep(parsed.currentStep);
          }
        } else if (parsed.holdExpiresAt && parsed.holdExpiresAt <= Date.now()) {
          setIsHoldExpired(true);
        }
      }
    } catch {
      // Ignora erro de storage
    }
  }, []);

  const saveStateToStorage = useCallback(
    (step: BookingStep, customToken?: string, customExpires?: number) => {
      try {
        const stateToSave = {
          currentStep: step,
          selectedFilmId: selectedFilm?.id,
          selectedSessionId,
          selectedSeatIds,
          ticketQuantities,
          holdToken: customToken || holdToken,
          holdExpiresAt: customExpires || holdExpiresAt,
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch {
        // Ignora erro de storage
      }
    },
    [selectedFilm?.id, selectedSessionId, selectedSeatIds, ticketQuantities, holdToken, holdExpiresAt]
  );

  // Valores monetários
  const unitPrice = sessionDetail?.price || 35.0;
  const inteiraPrice = unitPrice;
  const meiaPrice = unitPrice * 0.5;
  const totalAmount =
    ticketQuantities.inteira * inteiraPrice + ticketQuantities.meia * meiaPrice;

  // Formatação MM:SS
  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [remainingSeconds]);

  // Handlers de Navegação
  const handleSelectSession = (sessId: string) => {
    setSelectedSessionId(sessId);
    setErrorNotice(null);
    setCurrentStep(2);
    saveStateToStorage(2);
  };

  const handleSeatToggle = (seat: GridSeatItem) => {
    if (seat.status !== "AVAILABLE" && seat.status !== "RESERVED") return;
    setErrorNotice(null);

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        if (prev.length >= 5) {
          setErrorNotice("Limite máximo de 5 assentos por reserva online.");
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  const handleProceedToTickets = async () => {
    if (selectedSeatIds.length === 0) {
      setErrorNotice("Por favor, selecione ao menos uma poltrona no mapa para continuar.");
      return;
    }
    setErrorNotice(null);
    setIsSubmitting(true);

    try {
      const token =
        holdToken || `hold_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch(`/api/portal/sessoes/${selectedSessionId}/bloqueio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatIds: selectedSeatIds,
          holdToken: token,
          action: "HOLD",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErrorNotice(
            "Uma ou mais poltronas selecionadas acabaram de ser bloqueadas ou reservadas por outro cliente. Por favor, escolha outros lugares."
          );
          fetchSeats();
        } else {
          setErrorNotice(data.error || "Não foi possível bloquear as poltronas temporariamente.");
        }
        return;
      }

      const expiresTimestamp = new Date(data.expiresAt).getTime();
      setHoldToken(data.holdToken);
      setHoldExpiresAt(expiresTimestamp);
      setIsHoldExpired(false);
      setCurrentStep(3);
      saveStateToStorage(3, data.holdToken, expiresTimestamp);
    } catch (err) {
      console.error("Erro ao bloquear assentos:", err);
      const expiresTimestamp = Date.now() + 10 * 60 * 1000;
      setHoldExpiresAt(expiresTimestamp);
      setCurrentStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToSummary = () => {
    setErrorNotice(null);

    const totalTickets = ticketQuantities.inteira + ticketQuantities.meia;
    if (totalTickets !== selectedSeatIds.length) {
      setErrorNotice(
        `A soma dos ingressos (${totalTickets}) deve ser exatamente igual ao total de poltronas selecionadas (${selectedSeatIds.length}).`
      );
      return;
    }

    if (isHoldExpired) {
      setErrorNotice("O tempo limite de 10 minutos para concluir a reserva expirou. Reinicie a seleção.");
      return;
    }

    saveStateToStorage(4);

    if (authStatus !== "authenticated" || !authSession?.user) {
      openLogin({
        redirectOnLogin: false,
        onSuccess: () => {
          setCurrentStep(4);
          saveStateToStorage(4);
        },
      });
      return;
    }

    setCurrentStep(4);
  };

  const handleConfirmReservation = async () => {
    setErrorNotice(null);

    if (isHoldExpired) {
      setErrorNotice("O tempo de bloqueio de 10 minutos expirou. Por favor, reinicie a seleção de poltronas.");
      return;
    }

    if (!lgpdConsent) {
      setErrorNotice("O consentimento com a LGPD e termos do cinema é obrigatório para confirmar a reserva.");
      return;
    }

    if (!buyerCpf || buyerCpf.replace(/\D/g, "").length !== 11) {
      setErrorNotice("Por favor, informe um CPF válido para resgate dos ingressos na bilheteria.");
      return;
    }

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionDetail?.tenantId) {
        headers["x-tenant-id"] = sessionDetail.tenantId;
      }

      const res = await fetch("/api/portal/reservas", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sessionId: selectedSessionId,
          sessionSeatIds: selectedSeatIds,
          holdToken,
          ticketTypes: ticketQuantities,
          buyer: {
            name: buyerName || authSession?.user?.name || "Cliente CineDoom",
            email: buyerEmail || authSession?.user?.email || "cliente@cinedoom.com",
            cpf: buyerCpf,
            lgpdConsent: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setErrorNotice("Um ou mais assentos foram perdidos por expiração do prazo ou conflito.");
        } else if (res.status === 422 && data.code === "ANTECEDENCE_VIOLATION") {
          setErrorNotice("Reservas online encerradas: falta menos de 60 minutos para a sessão.");
        } else {
          setErrorNotice(data.error || "Não foi possível concluir a reserva.");
        }
        return;
      }

      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}

      const reservationId = data.reservation.id;
      router.push(`/portal/reservas/${reservationId}/comprovante`);
    } catch (err) {
      console.error("Erro ao confirmar reserva:", err);
      setErrorNotice("Falha na comunicação com o servidor ao processar a reserva.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    setHoldExpiresAt(null);
    setHoldToken("");
    setSelectedSeatIds([]);
    setTicketQuantities({ inteira: 0, meia: 0 });
    setIsHoldExpired(false);
    setErrorNotice(null);
    setCurrentStep(1);
  };

  const handleExpiredOk = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.location.href = "/";
  };

  useEffect(() => {
    if (!isHoldExpired) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        handleExpiredOk();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHoldExpired]);

  // Sessões agrupadas por sala para a data selecionada na Etapa 1
  const sessionsByRoom = useMemo(() => {
    if (!selectedFilm?.sessions) return {};
    const targetDate = dateTabs[selectedDateIndex].date;

    const filtered = selectedFilm.sessions.filter((s) => {
      const sDate = new Date(s.startsAt);
      return (
        sDate.getFullYear() === targetDate.getFullYear() &&
        sDate.getMonth() === targetDate.getMonth() &&
        sDate.getDate() === targetDate.getDate()
      );
    });

    const map: Record<string, SessionItem[]> = {};
    filtered.forEach((sess) => {
      const room = sess.room.name;
      if (!map[room]) map[room] = [];
      map[room].push(sess);
    });

    Object.keys(map).forEach((r) => {
      map[r].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    });

    return map;
  }, [selectedFilm, selectedDateIndex, dateTabs]);

  const roomNames = Object.keys(sessionsByRoom).sort();

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-3 text-white flex-1 flex flex-col justify-between">
      {/* 1. BARRA DE PROGRESSO SUPERIOR COMPACTA */}
      <nav
        aria-label="Progresso da Reserva"
        className="w-full bg-[#121829]/95 border border-white/10 rounded-xl px-4 py-2 sm:py-2.5 shadow-md backdrop-blur-md mb-2 sm:mb-3 shrink-0"
      >
        <div className="flex items-center justify-between relative max-w-2xl mx-auto">
          <div className="absolute top-1/2 left-5 right-5 -translate-y-1/2 h-0.5 bg-white/10 -z-0" />
          <div
            className="absolute top-1/2 left-5 -translate-y-1/2 h-0.5 bg-cta transition-all duration-300 -z-0"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />

          {[
            { step: 1, label: "Sessões", icon: Calendar },
            { step: 2, label: "Assentos", icon: Ticket },
            { step: 3, label: "Ingressos", icon: Sparkles },
            { step: 4, label: "Resumo", icon: CheckCircle },
          ].map(({ step, label }) => {
            const isCompleted = step < currentStep;
            const isCurrent = step === currentStep;
            const canClick = isCompleted;

            return (
              <button
                key={step}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && setCurrentStep(step as BookingStep)}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 group outline-none ${
                  canClick ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-150 border-2 ${
                    isCompleted
                      ? "bg-cta border-cta text-white shadow-xs shadow-cta/30"
                      : isCurrent
                      ? "bg-[#1A2238] border-cta text-cta ring-2 ring-cta/25 shadow-sm scale-105"
                      : "bg-[#0A0E1A] border-white/20 text-slate-400 opacity-60"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-semibold tracking-wide uppercase inline-block ${
                    isCurrent
                      ? "text-white font-bold"
                      : isCompleted
                      ? "text-slate-200 group-hover:text-cta"
                      : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Alerta de Erro Compacto */}
      {errorNotice && (
        <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-2 text-xs mb-2 shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-rose-400 hover:text-white text-[10px] font-bold uppercase shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 1: SESSÕES (Layout 2 Colunas no Desktop: Sem Rolagem Vertical)      */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <section className="flex-1 flex flex-col justify-between animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* Coluna Esquerda: Filme Selecionado com Sinopse Completa + Seletor de Datas */}
            <div className="lg:col-span-5 flex flex-col gap-2.5">
              {/* Card do Filme com Sinopse Completa */}
              {selectedFilm && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md flex gap-3.5 items-start">
                  <div className="relative aspect-[2/3] w-20 sm:w-24 rounded-lg overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-sm shrink-0">
                    {selectedFilm.posterUrl ? (
                      <Image
                        src={selectedFilm.posterUrl}
                        alt={selectedFilm.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Film className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                    <div className="absolute top-1 left-1 z-10 scale-90 origin-top-left">
                      <AgeRatingBadge rating={selectedFilm.classification} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[10px] font-bold text-cta uppercase tracking-wider block truncate">
                      Filme Selecionado
                    </span>
                    <h1 className="text-sm sm:text-base font-bold text-white leading-tight">
                      {selectedFilm.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                      <span>{getPrimaryGenre(selectedFilm.genre)}</span>
                      <span>•</span>
                      <span className="font-mono">{formatDuration(selectedFilm.duration)}</span>
                      {selectedFilm.director && (
                        <>
                          <span>•</span>
                          <span>Dir. {selectedFilm.director}</span>
                        </>
                      )}
                    </div>
                    {selectedFilm.synopsis && (
                      <p className="text-xs text-slate-300/90 pt-1 leading-relaxed">
                        {selectedFilm.synopsis}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Seletor de Datas Compacto */}
              <div className="p-3 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-cta" />
                    <span>Escolha a Data</span>
                  </span>
                  <span className="text-[10px] text-slate-400">7 dias disponíveis</span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-4 gap-1.5">
                  {dateTabs.map((tab) => {
                    const isSelected = selectedDateIndex === tab.index;
                    return (
                      <button
                        key={tab.index}
                        type="button"
                        onClick={() => setSelectedDateIndex(tab.index)}
                        className={`flex flex-col items-center py-1.5 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-cta text-white shadow-sm shadow-cta/30 scale-102"
                            : "bg-[#0A0E1A] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10"
                        }`}
                      >
                        <span className="text-[9px] uppercase tracking-wider">{tab.dayName}</span>
                        <span className="text-xs font-bold font-mono">{tab.dayNumber}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Salas e Horários Agrupados */}
            <div className="lg:col-span-7 p-3.5 sm:p-4 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md flex flex-col justify-start gap-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-cta" />
                  <span>Escolha uma sessão</span>
                </h2>
              </div>

              {roomNames.length === 0 ? (
                <div className="py-10 text-center space-y-1.5 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                  <Ticket className="w-8 h-8 text-slate-600 mx-auto opacity-70" />
                  <p className="text-xs font-semibold text-rose-400/90">
                    Nenhuma sessão disponível para esta data.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Consulte os outros dias no seletor de datas ao lado para encontrar horários.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 items-start">
                  {roomNames.map((roomName) => {
                    const roomSessions = sessionsByRoom[roomName];
                    const category = getRoomExperienceCategory(roomName);
                    const displayName = getRoomDisplayName(roomName);

                    return (
                      <div
                        key={roomName}
                        className="p-3 rounded-xl bg-[#0B0F1A] border border-white/10 shadow-xs flex flex-col justify-start gap-2 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3 h-3 text-cta shrink-0" />
                            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider truncate">
                              {displayName}
                            </h3>
                          </div>
                          <span
                            className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              category === "IMAX"
                                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                : category === "VIP"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {category}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {roomSessions.map((sess) => {
                            const time = new Date(sess.startsAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            const isSelected = selectedSessionId === sess.id;

                            return (
                              <button
                                key={sess.id}
                                type="button"
                                onClick={() => handleSelectSession(sess.id)}
                                className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs tracking-wide transition-all cursor-pointer min-w-[64px] flex items-center justify-center ${
                                  isSelected
                                    ? "bg-cta text-white ring-2 ring-white/80 scale-105 shadow-sm shadow-cta/40"
                                    : "bg-[#141A2D] hover:bg-cta hover:text-white border border-white/10 text-slate-200"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: ASSENTOS (Otimização do Viewport: Tela, Fileiras e Controles)    */}
      {/* ========================================================================= */}
      {/* ETAPA 2: ASSENTOS (Layout 2 Colunas no Desktop: Sem Rolagem Vertical)     */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <section className="flex-1 flex flex-col justify-between animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            {/* Coluna Lateral: Resumo da Sessão, Poltronas, Legenda e Ação */}
            <div className="lg:col-span-4 flex flex-col gap-2.5">
              {/* Card de Sessão e Voltar */}
              <div className="p-3 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md space-y-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para Sessões</span>
                </button>

                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">
                      {selectedFilm?.title}
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      {sessionDetail?.room.name || "Sala"}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-cta/20 text-cta border border-cta/30 font-bold font-mono text-xs shrink-0">
                    {sessionDetail?.startsAt
                      ? new Date(sessionDetail.startsAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Horário"}
                  </span>
                </div>
              </div>

              {/* Card de Poltronas Selecionadas & Botão de Avanço */}
              <div className="p-3 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Poltronas ({selectedSeatIds.length}/5)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    R$ {unitPrice.toFixed(2)} un
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 min-h-[30px] items-center">
                  {selectedSeatIds.length === 0 ? (
                    <span className="text-slate-400 text-xs italic">
                      Toque nas poltronas brancas no mapa ao lado
                    </span>
                  ) : (
                    selectedSeatIds.map((id) => {
                      const s = seats.find((st) => st.id === id);
                      return (
                        <span
                          key={id}
                          className="px-2 py-0.5 rounded-md bg-cta/20 text-cta border border-cta/30 text-xs font-bold font-mono"
                        >
                          {s?.seatCode || id.slice(-2)}
                        </span>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  disabled={selectedSeatIds.length === 0 || isSubmitting}
                  onClick={handleProceedToTickets}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedSeatIds.length === 0 || isSubmitting
                      ? "bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50"
                      : "bg-cta hover:bg-cta-hover text-white shadow-cta/30 active:scale-95"
                  }`}
                >
                  <span>Continuar para Ingressos ({selectedSeatIds.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Legenda Cromática Oficial CineDoom */}
              <div className="p-2.5 sm:p-3 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Legenda de Assentos
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-white border border-slate-300 shadow-xs shadow-white/30" />
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#E94560] border border-[#D63D56] shadow-xs shadow-[#E94560]/40" />
                    <span>Selecionado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#EF4444]/20 border border-[#EF4444]/40" />
                    <span className="text-gray-400">Vendido</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#0F3460] border border-[#203A63] shadow-xs shadow-[#0F3460]/40" />
                    <span className="text-gray-400">Reservado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[#9CA3AF]/20 border border-[#9CA3AF]/40" />
                    <span className="text-gray-400">Bloqueado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Central: Mapa de Assentos com Tela de Projeção */}
            <div className="lg:col-span-8 p-2.5 sm:p-3 rounded-2xl bg-[#0B0F1A] border border-white/10 shadow-xl flex flex-col justify-center items-center">
              {seatsLoading && seats.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 border-2 border-cta border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">Carregando poltronas...</span>
                </div>
              ) : (
                <SeatingGrid
                  seats={seats}
                  selectedSeatIds={selectedSeatIds}
                  onSeatToggle={handleSeatToggle}
                  maxSelection={5}
                  unitPrice={unitPrice}
                  showLegend={false}
                  showScreen={true}
                  showSummary={false}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: INGRESSOS (Layout 2 Colunas no Desktop: Sem Rolagem Vertical)     */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <section className="flex-1 flex flex-col justify-between animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* Coluna Esquerda: Resumo da Sessão e Assentos */}
            <div className="lg:col-span-4 flex flex-col gap-2.5">
              <div className="p-3.5 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md space-y-2">
                <span className="text-[10px] font-bold text-cta uppercase tracking-wider block">
                  Resumo da Escolha
                </span>
                <h2 className="text-sm font-bold text-white leading-tight">
                  {selectedFilm?.title}
                </h2>
                <div className="text-xs text-slate-300 space-y-0.5">
                  <p>{sessionDetail?.room.name || "Sala de Cinema"}</p>
                  <p className="font-mono text-slate-400">
                    {sessionDetail?.startsAt
                      ? new Date(sessionDetail.startsAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Poltronas Escolhidas ({selectedSeatIds.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedSeatIds.map((id) => {
                      const s = seats.find((st) => st.id === id);
                      return (
                        <span
                          key={id}
                          className="px-1.5 py-0.5 rounded bg-cta/20 border border-cta/40 text-cta text-[10px] font-bold font-mono"
                        >
                          {s?.seatCode || id.slice(-2)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total da Reserva:</span>
                  <span className="text-base font-extrabold text-cta font-mono">
                    R$ {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Cards dos Tipos de Ingressos */}
            <div className="lg:col-span-8 flex flex-col gap-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Card Inteira */}
                <div className="p-3.5 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Inteira</h3>
                      <p className="text-[11px] text-slate-400">Padrão sem desconto</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-white">
                        R$ {inteiraPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs text-slate-300">Quantidade:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={ticketQuantities.inteira <= 0}
                        onClick={() =>
                          setTicketQuantities((prev) => ({
                            ...prev,
                            inteira: Math.max(0, prev.inteira - 1),
                          }))
                        }
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-sm font-mono">
                        {ticketQuantities.inteira}
                      </span>
                      <button
                        type="button"
                        disabled={
                          ticketQuantities.inteira + ticketQuantities.meia >= selectedSeatIds.length
                        }
                        onClick={() =>
                          setTicketQuantities((prev) => ({
                            ...prev,
                            inteira: prev.inteira + 1,
                          }))
                        }
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    Subtotal:{" "}
                    <span className="font-bold text-white font-mono">
                      R$ {(ticketQuantities.inteira * inteiraPrice).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Card Meia-entrada */}
                <div className="p-3.5 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Meia-entrada</span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          -50%
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">Estudantes, 60+, PCD, Professores</p>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-white">
                        R$ {meiaPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-xs text-slate-300">Quantidade:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={ticketQuantities.meia <= 0}
                        onClick={() =>
                          setTicketQuantities((prev) => ({
                            ...prev,
                            meia: Math.max(0, prev.meia - 1),
                          }))
                        }
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-sm font-mono">
                        {ticketQuantities.meia}
                      </span>
                      <button
                        type="button"
                        disabled={
                          ticketQuantities.inteira + ticketQuantities.meia >= selectedSeatIds.length
                        }
                        onClick={() =>
                          setTicketQuantities((prev) => ({
                            ...prev,
                            meia: prev.meia + 1,
                          }))
                        }
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    Subtotal:{" "}
                    <span className="font-bold text-white font-mono">
                      R$ {(ticketQuantities.meia * meiaPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informação de Compatibilidade */}
              <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-cta shrink-0" />
                  <span>
                    Total:{" "}
                    <strong className="text-white">
                      {ticketQuantities.inteira + ticketQuantities.meia} de {selectedSeatIds.length}
                    </strong>{" "}
                    ingressos selecionados.
                  </span>
                </span>
                <span className="font-bold text-cta font-mono">R$ {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Barra de Ações Inferior */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Voltar para Assentos
            </button>

            <button
              type="button"
              disabled={
                ticketQuantities.inteira + ticketQuantities.meia !== selectedSeatIds.length ||
                isHoldExpired
              }
              onClick={handleProceedToSummary}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                ticketQuantities.inteira + ticketQuantities.meia !== selectedSeatIds.length ||
                isHoldExpired
                  ? "bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50"
                  : "bg-cta hover:bg-cta-hover text-white shadow-cta/30 active:scale-95"
              }`}
            >
              <span>Avançar para Resumo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: RESUMO E CONFIRMAÇÃO (Layout 2 Colunas: Sem Rolagem Vertical)    */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <section className="flex-1 flex flex-col justify-between animate-in fade-in duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* Coluna Esquerda: Voucher e Poltronas */}
            <div className="lg:col-span-6 flex flex-col gap-2.5">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#121829]/95 border border-white/10 shadow-md space-y-3">
                <div className="flex gap-3 items-center border-b border-white/10 pb-3">
                  <div className="relative aspect-[2/3] w-14 sm:w-16 rounded-lg overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-xs shrink-0">
                    {selectedFilm?.posterUrl ? (
                      <Image
                        src={selectedFilm.posterUrl}
                        alt={selectedFilm.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Film className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <AgeRatingBadge rating={selectedFilm?.classification} />
                      <span className="text-[10px] text-slate-400 font-semibold truncate">
                        {getPrimaryGenre(selectedFilm?.genre)}
                      </span>
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                      {selectedFilm?.title}
                    </h2>
                    <p className="text-[11px] text-slate-300 truncate">
                      CineDoom • {sessionDetail?.room.name || "Sala"} •{" "}
                      <span className="font-mono text-white">
                        {sessionDetail?.startsAt
                          ? new Date(sessionDetail.startsAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                      Poltronas ({selectedSeatIds.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {selectedSeatIds.map((id) => {
                        const s = seats.find((st) => st.id === id);
                        return (
                          <span
                            key={id}
                            className="px-1.5 py-0.5 rounded bg-[#0F3460] text-cta border border-cta/30 font-bold font-mono text-[10px]"
                          >
                            {s?.seatCode || id.slice(-2)}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                    <span className="text-slate-400 uppercase font-semibold text-[10px] block">
                      Detalhamento
                    </span>
                    <div className="space-y-0.5 text-[11px] font-mono text-slate-300">
                      {ticketQuantities.inteira > 0 && (
                        <div className="flex justify-between">
                          <span>{ticketQuantities.inteira}x Inteira</span>
                          <span>R$ {(ticketQuantities.inteira * inteiraPrice).toFixed(2)}</span>
                        </div>
                      )}
                      {ticketQuantities.meia > 0 && (
                        <div className="flex justify-between">
                          <span>{ticketQuantities.meia}x Meia</span>
                          <span>R$ {(ticketQuantities.meia * meiaPrice).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                  <span className="font-bold text-slate-300">Valor Total da Reserva</span>
                  <span className="text-base font-extrabold text-cta font-mono">
                    R$ {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Dados Comprador, Instruções de Resgate e Confirmação */}
            <div className="lg:col-span-6 flex flex-col gap-2.5">
              {/* Form Compacto do Comprador */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3 h-3 text-cta" />
                  <span>Titular da Reserva</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block">Nome</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="Nome"
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0A0E1A] border border-white/10 text-white text-[11px] focus:border-cta outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">E-mail</label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="E-mail"
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0A0E1A] border border-white/10 text-white text-[11px] focus:border-cta outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">CPF</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={buyerCpf}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                        if (v.length > 9) {
                          setBuyerCpf(`${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`);
                        } else if (v.length > 6) {
                          setBuyerCpf(`${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`);
                        } else if (v.length > 3) {
                          setBuyerCpf(`${v.slice(0, 3)}.${v.slice(3)}`);
                        } else {
                          setBuyerCpf(v);
                        }
                      }}
                      placeholder="000.000.000-00"
                      className="w-full px-2 py-1.5 rounded-lg bg-[#0A0E1A] border border-white/10 text-white text-[11px] font-mono focus:border-cta outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Informações Oficiais de Resgate */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[10px] uppercase tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Instruções de Resgate Presencial</span>
                </div>
                <p className="text-slate-300 text-[10px] leading-tight">
                  Apresente este código na bilheteria física do cinema para efetuar o pagamento presencial em dinheiro, débito ou crédito até <strong>1 hora antes do início da sessão</strong>.
                </p>
                <p className="text-slate-400 text-[9px] leading-tight">
                  Para meia-entrada, apresente documento comprobatório oficial e documento com foto.
                </p>
              </div>

              {/* Checkbox LGPD */}
              <label className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer text-[10px] text-slate-300 leading-tight">
                <input
                  type="checkbox"
                  checked={lgpdConsent}
                  onChange={(e) => setLgpdConsent(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 text-cta focus:ring-cta focus:ring-offset-0 bg-[#0A0E1A]"
                />
                <span>
                  Concordo com os termos de reserva e autorizo o tratamento dos dados informados sob a LGPD (Lei nº 13.709/2018).
                </span>
              </label>

              {/* Ações */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  Revisar
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !lgpdConsent || isHoldExpired}
                  onClick={handleConfirmReservation}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSubmitting || !lgpdConsent || isHoldExpired
                      ? "bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50"
                      : "bg-cta hover:bg-cta-hover text-white shadow-cta/40 active:scale-95"
                  }`}
                >
                  {isSubmitting ? (
                    <span>Confirmando...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirmar Reserva (R$ {totalAmount.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* CONTADOR REGRESSIVO PERSISTENTE (BARRA FIXA INFERIOR COMPACTA)            */}
      {/* ========================================================================= */}
      {holdExpiresAt && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0A0E1A]/95 border-t border-white/10 py-1.5 px-4 shadow-xl backdrop-blur-xl animate-in slide-in-from-bottom duration-200">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 h-9 sm:h-10">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  isHoldExpired || remainingSeconds <= 120
                    ? "bg-rose-500/20 text-rose-400 animate-pulse"
                    : "bg-cta/20 text-cta"
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-300 font-semibold truncate">
                {isHoldExpired ? "Prazo Expirado" : "Tempo restante para concluir sua reserva:"}
              </span>
              <span
                className={`text-xs sm:text-sm font-extrabold font-mono tracking-wider ${
                  isHoldExpired || remainingSeconds <= 120 ? "text-rose-400 animate-pulse" : "text-white"
                }`}
              >
                {isHoldExpired ? "00:00" : formattedCountdown}
              </span>
            </div>

            {isHoldExpired ? (
              <button
                type="button"
                onClick={handleExpiredOk}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
              >
                OK
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 hidden sm:inline-block">
                Poltronas bloqueadas temporariamente
              </span>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE TEMPO ESGOTADO (10 MINUTOS) */}
      {isHoldExpired && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expired-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm bg-[#121829] border border-white/20 rounded-3xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/30">
              <Timer className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 id="expired-modal-title" className="text-lg font-bold text-white">
                Tempo Esgotado!
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                O prazo de 10 minutos para concluir sua reserva expirou. As poltronas selecionadas foram liberadas.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleExpiredOk}
                className="w-full py-2.5 px-4 rounded-xl bg-cta hover:bg-cta-hover text-white font-bold text-sm tracking-wide shadow-lg shadow-cta/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
