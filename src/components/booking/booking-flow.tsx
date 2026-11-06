"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  ShieldCheck,
  User,
  Mail,
  CreditCard,
  RefreshCw,
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

          // Se veio filme inicial, seleciona
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

  // 3. Se veio initialSessionId, carrega a sessao imediatamente e posiciona
  useEffect(() => {
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
    }
  }, [initialSessionId]);

  // 4. Carrega detalhes da sessao selecionada
  useEffect(() => {
    if (!selectedSessionId) return;

    async function loadSession() {
      try {
        const res = await fetch(`/api/portal/sessoes/${selectedSessionId}`, { cache: "no-store" });
        if (res.ok) {
          const data: SessionPortalDetail = await res.json();
          setSessionDetail(data);

          // Sincroniza filme selecionado com a sessão
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

  // 5. Polling de Assentos (Etapa 2) - Consulta pública sem exigir login
  const fetchSeats = useCallback(async () => {
    if (!selectedSessionId) return;
    try {
      // Tenta rota pública primeiro, fallback para rota canônica
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

        // Se algum assento selecionado foi vendido por outrem, remove
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

  // 6. Preenche dados do comprador a partir da autenticação quando disponível
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
      // Se a soma atual for diferente da quantidade de assentos, define inteira como padrão
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

  // 8. Cronômetro regressivo dos 10 minutos (iniciado na Etapa 3 ou se holdExpiresAt estiver ativo)
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

  // Calcula valores monetários
  const unitPrice = sessionDetail?.price || 35.0;
  const inteiraPrice = unitPrice;
  const meiaPrice = unitPrice * 0.5;
  const totalAmount =
    ticketQuantities.inteira * inteiraPrice + ticketQuantities.meia * meiaPrice;

  // Formatação MM:SS para o contador
  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [remainingSeconds]);

  // Handlers de Navegação entre Etapas
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

  // Avançar da Etapa 2 para a Etapa 3: Inicia Bloqueio Temporário de 10 minutos
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
      // Se offline/mock, avança com timer local
      const expiresTimestamp = Date.now() + 10 * 60 * 1000;
      setHoldExpiresAt(expiresTimestamp);
      setCurrentStep(3);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Avançar da Etapa 3 para a Etapa 4: Exige Autenticação
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

    // Salva estado antes de verificar autenticação
    saveStateToStorage(4);

    // Se NÃO estiver autenticado, abre o modal existente de autenticação
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

    // Se já estiver autenticado, avança direto para o Resumo
    setCurrentStep(4);
  };

  // Confirmar Reserva (Etapa 4)
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

      // Limpa rascunho de storage e redireciona para o comprovante
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

    // Ordena horários em cada sala
    Object.keys(map).forEach((r) => {
      map[r].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    });

    return map;
  }, [selectedFilm, selectedDateIndex, dateTabs]);

  const roomNames = Object.keys(sessionsByRoom).sort();

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-6 pb-28 text-white space-y-6">
      {/* 1. BARRA DE PROGRESSO SUPERIOR (4 ETAPAS SEQUENCIAIS) */}
      <nav aria-label="Progresso da Reserva" className="w-full bg-[#121829]/90 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between relative max-w-3xl mx-auto">
          {/* Linha de Conexão entre Etapas */}
          <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-white/10 -z-0" />
          <div
            className="absolute top-1/2 left-6 -translate-y-1/2 h-0.5 bg-cta transition-all duration-300 -z-0"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />

          {[
            { step: 1, label: "Sessões", icon: Calendar },
            { step: 2, label: "Assentos", icon: Ticket },
            { step: 3, label: "Ingressos", icon: Sparkles },
            { step: 4, label: "Resumo", icon: CheckCircle },
          ].map(({ step, label, icon: StepIcon }) => {
            const isCompleted = step < currentStep;
            const isCurrent = step === currentStep;
            const isPending = step > currentStep;
            const canClick = isCompleted;

            return (
              <button
                key={step}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && setCurrentStep(step as BookingStep)}
                className={`relative z-10 flex flex-col items-center gap-1.5 group outline-none ${
                  canClick ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 border-2 ${
                    isCompleted
                      ? "bg-cta border-cta text-white shadow-md shadow-cta/30"
                      : isCurrent
                      ? "bg-[#1A2238] border-cta text-cta ring-4 ring-cta/20 shadow-lg scale-110"
                      : "bg-[#0A0E1A] border-white/20 text-slate-400 opacity-60"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" /> : step}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-semibold tracking-wide uppercase ${
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

      {/* Alerta de Erro Global */}
      {errorNotice && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorNotice}</div>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-rose-400 hover:text-white text-xs font-bold uppercase"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 1: SESSÕES (Filme, Seletor de Datas, Salas e Horários Interativos) */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <section className="space-y-6 animate-in fade-in duration-200">
          {/* Cabeçalho com Informações do Filme Selecionado */}
          {selectedFilm && (
            <div className="p-4 sm:p-6 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-lg flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <div className="relative aspect-[2/3] w-28 sm:w-36 rounded-xl overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-md shrink-0">
                {selectedFilm.posterUrl ? (
                  <Image
                    src={selectedFilm.posterUrl}
                    alt={selectedFilm.title}
                    fill
                    sizes="144px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Film className="w-8 h-8 opacity-40" />
                  </div>
                )}
                <div className="absolute top-2 left-2 z-10">
                  <AgeRatingBadge rating={selectedFilm.classification} />
                </div>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left">
                <span className="text-xs font-bold text-cta uppercase tracking-widest block">
                  Filme Selecionado
                </span>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight">
                  {selectedFilm.title}
                </h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {getPrimaryGenre(selectedFilm.genre)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatDuration(selectedFilm.duration)}
                  </span>
                  {selectedFilm.director && (
                    <>
                      <span>•</span>
                      <span>Dir. {selectedFilm.director}</span>
                    </>
                  )}
                </div>
                {selectedFilm.synopsis && (
                  <p className="text-xs sm:text-sm text-slate-300/90 line-clamp-3 pt-1">
                    {selectedFilm.synopsis}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Informações do Cinema */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cta" />
              <span className="font-bold text-white">CineDoom Prime Cinemas</span>
              <span className="text-slate-400">• Shopping Cidade - Piso 3</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Projeção Digital Laser 4K</span>
            </div>
          </div>

          {/* Seletor de Datas Disponíveis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cta" />
                <span>Escolha a Data</span>
              </h2>
              <span className="text-xs text-slate-400">7 dias disponíveis</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {dateTabs.map((tab) => {
                const isSelected = selectedDateIndex === tab.index;
                return (
                  <button
                    key={tab.index}
                    type="button"
                    onClick={() => setSelectedDateIndex(tab.index)}
                    className={`flex flex-col items-center px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-cta text-white shadow-lg shadow-cta/30 scale-105"
                        : "bg-[#121829] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10"
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-wider">{tab.dayName}</span>
                    <span className="text-sm font-bold font-mono">{tab.dayNumber}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Salas e Horários Agrupados */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Ticket className="w-4 h-4 text-cta" />
              <span>Salas & Horários Disponíveis</span>
            </h2>

            {roomNames.length === 0 ? (
              <div className="py-12 text-center space-y-2 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <Ticket className="w-10 h-10 text-slate-600 mx-auto opacity-70" />
                <p className="text-sm font-semibold text-rose-400/90">
                  Nenhuma sessão disponível para esta data.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Consulte os outros dias nas abas de data acima para encontrar horários abertos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {roomNames.map((roomName) => {
                  const roomSessions = sessionsByRoom[roomName];
                  const category = getRoomExperienceCategory(roomName);
                  const displayName = getRoomDisplayName(roomName);

                  return (
                    <div
                      key={roomName}
                      className="p-4 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md flex flex-col justify-start gap-3 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-cta shrink-0" />
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                            {displayName}
                          </h3>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
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

                      {/* Botões interativos dos horários */}
                      <div className="flex flex-wrap gap-2">
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
                              className={`px-3.5 py-2 rounded-xl font-mono font-bold text-xs sm:text-sm tracking-wide transition-all cursor-pointer min-w-[72px] flex items-center justify-center ${
                                isSelected
                                  ? "bg-cta text-white ring-2 ring-white/80 scale-105 shadow-md shadow-cta/40"
                                  : "bg-[#182035] hover:bg-cta hover:text-white border border-white/10 text-slate-200 shadow-xs"
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
        </section>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: ASSENTOS (Reutilização Integral do SeatingGrid Oficial CineDoom)  */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <section className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Sessões</span>
            </button>

            <div className="text-center sm:text-right">
              <span className="text-xs text-slate-400 block">
                {selectedFilm?.title} • {sessionDetail?.room.name || "Sala"}
              </span>
              <span className="text-sm font-bold text-white">
                Sessão das{" "}
                {sessionDetail?.startsAt
                  ? new Date(sessionDetail.startsAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Horário selecionado"}
              </span>
            </div>
          </div>

          {/* Componente SeatingGrid Existente Reutilizado com Poltronas Estilizadas */}
          <div className="p-4 sm:p-6 rounded-3xl bg-[#0B0F1A] border border-white/10 shadow-2xl">
            {seatsLoading && seats.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-2 border-cta border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Carregando mapa de poltronas...</span>
              </div>
            ) : (
              <SeatingGrid
                seats={seats}
                selectedSeatIds={selectedSeatIds}
                onSeatToggle={handleSeatToggle}
                maxSelection={5}
                unitPrice={unitPrice}
                showLegend={true}
                showScreen={true}
                showSummary={true}
              />
            )}
          </div>

          {/* Botão de Continuidade para Ingressos */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Alterar Sessão
            </button>

            <button
              type="button"
              disabled={selectedSeatIds.length === 0 || isSubmitting}
              onClick={handleProceedToTickets}
              className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                selectedSeatIds.length === 0 || isSubmitting
                  ? "bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50"
                  : "bg-cta hover:bg-cta-hover text-white shadow-cta/30 hover:scale-[1.02] active:scale-95"
              }`}
            >
              {isSubmitting ? (
                <span>Iniciando bloqueio...</span>
              ) : (
                <>
                  <span>Continuar para Ingressos ({selectedSeatIds.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: INGRESSOS (Seleção de Categorias, Controles +/- e Regra de 5)    */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <section className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Assentos</span>
            </button>

            <div className="text-right">
              <span className="text-xs text-slate-400 block">Poltronas Selecionadas</span>
              <div className="flex gap-1 justify-end">
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
          </div>

          {/* Cards de Tipos de Ingressos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inteira */}
            <div className="p-5 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Inteira</h3>
                  <p className="text-xs text-slate-400">Ingresso padrão individual sem desconto</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase font-semibold block">Valor Unitário</span>
                  <span className="text-lg font-bold text-white font-mono">
                    R$ {inteiraPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className="text-xs text-slate-300 font-semibold">Quantidade</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={ticketQuantities.inteira <= 0}
                    onClick={() =>
                      setTicketQuantities((prev) => ({
                        ...prev,
                        inteira: Math.max(0, prev.inteira - 1),
                      }))
                    }
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-base font-mono">
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
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400">
                Subtotal:{" "}
                <span className="font-bold text-white font-mono">
                  R$ {(ticketQuantities.inteira * inteiraPrice).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Meia-entrada */}
            <div className="p-5 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-md space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>Meia-entrada</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      -50%
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Estudantes, idosos (60+), PCD e professores (Lei Federal nº 12.933/2013)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase font-semibold block">Valor Unitário</span>
                  <span className="text-lg font-bold text-white font-mono">
                    R$ {meiaPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className="text-xs text-slate-300 font-semibold">Quantidade</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={ticketQuantities.meia <= 0}
                    onClick={() =>
                      setTicketQuantities((prev) => ({
                        ...prev,
                        meia: Math.max(0, prev.meia - 1),
                      }))
                    }
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-base font-mono">
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
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400">
                Subtotal:{" "}
                <span className="font-bold text-white font-mono">
                  R$ {(ticketQuantities.meia * meiaPrice).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Validação de Compatibilidade de Ingressos vs Assentos */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cta shrink-0" />
              <span>
                Total de ingressos selecionados:{" "}
                <strong className="text-white font-mono">
                  {ticketQuantities.inteira + ticketQuantities.meia}
                </strong>{" "}
                de{" "}
                <strong className="text-white font-mono">{selectedSeatIds.length}</strong>{" "}
                poltronas (limite máximo de 5).
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-400">Total da Reserva: </span>
              <span className="text-lg font-extrabold text-cta font-mono">
                R$ {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Revisar Poltronas
            </button>

            <button
              type="button"
              disabled={
                ticketQuantities.inteira + ticketQuantities.meia !== selectedSeatIds.length ||
                isHoldExpired
              }
              onClick={handleProceedToSummary}
              className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                ticketQuantities.inteira + ticketQuantities.meia !== selectedSeatIds.length ||
                isHoldExpired
                  ? "bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50"
                  : "bg-cta hover:bg-cta-hover text-white shadow-cta/30 hover:scale-[1.02] active:scale-95"
              }`}
            >
              <span>Avançar para Resumo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: RESUMO E CONFIRMAÇÃO (Voucher Completo, Regras & Resgate)        */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <section className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#121829]/90 border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Ingressos</span>
            </button>

            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Revisão Final da Reserva
            </span>
          </div>

          {/* Card Detalhado de Resumo */}
          <div className="p-5 sm:p-7 rounded-3xl bg-[#121829]/95 border border-white/10 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start border-b border-white/10 pb-5">
              <div className="relative aspect-[2/3] w-24 sm:w-28 rounded-xl overflow-hidden bg-[#0A0E1A] border border-white/10 shadow-md shrink-0">
                {selectedFilm?.posterUrl ? (
                  <Image
                    src={selectedFilm.posterUrl}
                    alt={selectedFilm.title}
                    fill
                    sizes="112px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <Film className="w-8 h-8 opacity-40" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <AgeRatingBadge rating={selectedFilm?.classification} />
                  <span className="text-xs text-slate-400 font-semibold">
                    {getPrimaryGenre(selectedFilm?.genre)}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {selectedFilm?.title}
                </h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cta" />
                    CineDoom Prime Cinemas
                  </span>
                  <span>•</span>
                  <span>{sessionDetail?.room.name || "Sala de Cinema"}</span>
                  <span>•</span>
                  <span className="font-mono">
                    {sessionDetail?.startsAt
                      ? new Date(sessionDetail.startsAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de Poltronas e Ingressos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                <span className="text-slate-400 uppercase font-semibold block">
                  Poltronas Selecionadas ({selectedSeatIds.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSeatIds.map((id) => {
                    const s = seats.find((st) => st.id === id);
                    return (
                      <span
                        key={id}
                        className="px-2 py-1 rounded-md bg-[#0F3460] text-cta border border-cta/30 font-bold font-mono text-xs"
                      >
                        {s?.seatCode || id.slice(-2)}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                <span className="text-slate-400 uppercase font-semibold block">Detalhamento dos Ingressos</span>
                <div className="space-y-1 text-slate-200">
                  {ticketQuantities.inteira > 0 && (
                    <div className="flex justify-between font-mono">
                      <span>{ticketQuantities.inteira}x Inteira</span>
                      <span>R$ {(ticketQuantities.inteira * inteiraPrice).toFixed(2)}</span>
                    </div>
                  )}
                  {ticketQuantities.meia > 0 && (
                    <div className="flex justify-between font-mono">
                      <span>{ticketQuantities.meia}x Meia-entrada</span>
                      <span>R$ {(ticketQuantities.meia * meiaPrice).toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm">
                  <span>Valor Total da Reserva</span>
                  <span className="text-cta font-mono text-base">R$ {totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Dados do Comprador e CPF para Retirada */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cta" />
                <span>Titular da Reserva (Resgate Presencial)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white text-xs focus:border-cta outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">E-mail para Confirmação</label>
                  <input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white text-xs focus:border-cta outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">CPF (apenas números)</label>
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
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white text-xs font-mono focus:border-cta outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Informações Oficiais de Resgate da Reserva (Conhecimento Canônico do Projeto) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Instruções Importantes de Resgate da Reserva</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
                <li>
                  <strong className="text-white">Pagamento Presencial:</strong> Apresente o código da reserva na bilheteria física do cinema para efetuar o pagamento em dinheiro, débito ou crédito até <strong>1 hora antes do início da sessão</strong>.
                </li>
                <li>
                  <strong className="text-white">Documentação Obrigatória:</strong> Para ingressos de meia-entrada, apresente documento comprobatório oficial (carteira de estudante, identidade para idosos) junto com documento de identificação com foto.
                </li>
                <li>
                  <strong className="text-white">Cancelamento Gratuito:</strong> É permitido o cancelamento online sem custo diretamente no portal em <em>Minhas Reservas</em> até 60 minutos antes da sessão.
                </li>
              </ul>
            </div>

            {/* Termos de Consentimento LGPD */}
            <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={lgpdConsent}
                onChange={(e) => setLgpdConsent(e.target.checked)}
                className="mt-0.5 rounded border-white/20 text-cta focus:ring-cta focus:ring-offset-0 bg-[#0A0E1A]"
              />
              <span>
                Concordo com os termos de reserva e autorizo o tratamento dos dados informados para fins de emissão de ingressos, controle de acesso e conformidade com a LGPD (Lei nº 13.709/2018).
              </span>
            </label>
          </div>

          {/* Botão Final: Confirmar Reserva */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              Revisar Ingressos
            </button>

            <button
              type="button"
              disabled={isSubmitting || !lgpdConsent || isHoldExpired}
              onClick={handleConfirmReservation}
              className={`px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-xl transition-all flex items-center gap-2 cursor-pointer ${
                isSubmitting || !lgpdConsent || isHoldExpired
                  ? "bg-slate-700/50 text-slate-400 cursor-not-allowed opacity-50"
                  : "bg-cta hover:bg-cta-hover text-white shadow-cta/40 hover:scale-[1.02] active:scale-95"
              }`}
            >
              {isSubmitting ? (
                <span>Confirmando Reserva...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Reserva (R$ {totalAmount.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* CONTADOR REGRESSIVO PERSISTENTE DE 10 MINUTOS (BARRA FIXA INFERIOR)       */}
      {/* ========================================================================= */}
      {holdExpiresAt && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0A0E1A]/95 border-t border-white/10 p-3 sm:p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isHoldExpired || remainingSeconds <= 120
                    ? "bg-rose-500/20 text-rose-400 animate-pulse"
                    : "bg-cta/20 text-cta"
                }`}
              >
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold block">
                  {isHoldExpired ? "Prazo Expirado" : "Tempo restante para concluir sua reserva"}
                </span>
                <span
                  className={`text-sm sm:text-base font-extrabold font-mono tracking-wider ${
                    isHoldExpired || remainingSeconds <= 120 ? "text-rose-400 animate-pulse" : "text-white"
                  }`}
                >
                  {isHoldExpired ? "00:00 - Poltronas liberadas" : formattedCountdown}
                </span>
              </div>
            </div>

            {isHoldExpired ? (
              <button
                type="button"
                onClick={handleRestart}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Reiniciar Seleção
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                Poltronas bloqueadas com exclusividade
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
