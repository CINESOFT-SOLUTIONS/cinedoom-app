"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Film as FilmIcon,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sparkles,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { getCanonicalRoomName } from "@/shared/experiences";
import { Pagination } from "@/components/ui/pagination";

const OFFICIAL_CATALOG_FILM_IDS = new Set([
  "00000000-0000-4000-a000-000000000101",
  "00000000-0000-4000-a000-000000000102",
  "00000000-0000-4000-a000-000000000103",
  "00000000-0000-4000-a000-000000000104",
]);

const FALLBACK_ROOMS_LIST: RoomItem[] = [
  { id: "00000000-0000-4000-a000-000000000011", name: "Sala 01", capacity: 80 },
  { id: "00000000-0000-4000-a000-000000000012", name: "Sala 02", capacity: 80 },
  { id: "00000000-0000-4000-a000-000000000013", name: "Sala 03", capacity: 120 },
  { id: "00000000-0000-4000-a000-000000000014", name: "Sala 04", capacity: 40 },
];

interface FilmItem {
  id: string;
  title: string;
  durationMinutes: number;
  posterUrl?: string | null;
}

interface RoomItem {
  id: string;
  name: string;
  capacity: number;
}

interface SessionItem {
  id: string;
  filmId: string;
  roomId: string;
  startsAt: string;
  price: string | number;
  status: "SCHEDULED" | "OPEN" | "CLOSED" | "CANCELLED";
  film: {
    id: string;
    title: string;
    durationMinutes: number;
    posterUrl?: string | null;
  };
  room: {
    id: string;
    name: string;
    capacity: number;
  };
}

export default function ProgramacaoSessoesPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [films, setFilms] = useState<FilmItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mês e Ano de navegação do calendário
  const [viewDate, setViewDate] = useState(() => new Date());

  // Filme atualmente selecionado para gerenciar programação (null = visão geral)
  const [selectedFilmForSchedule, setSelectedFilmForSchedule] = useState<FilmItem | null>(null);
  const [filmsPage, setFilmsPage] = useState<number>(1);

  // Dias selecionados no calendário para lote
  const [batchSelectedDays, setBatchSelectedDays] = useState<number[]>([]);

  // Configuração da programação para aplicar aos dias selecionados
  const [batchRoomId, setBatchRoomId] = useState<string>("");
  const [batchTimes, setBatchTimes] = useState<string[]>(["14:00", "17:30", "20:30"]);
  const [newTimeInput, setNewTimeInput] = useState("");
  const [batchPrice, setBatchPrice] = useState("30.00");

  // Dia ativo para inspeção detalhada
  const [activeDayDetail, setActiveDayDetail] = useState<number | null>(null);

  // Notificações e feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalizeSessionItem = (s: any): SessionItem => {
    const fId = s.filmId || s.film?.id || "";
    const canonicalPrice = OFFICIAL_CATALOG_FILM_IDS.has(fId)
      ? 30.0
      : Number(s.price || 30.0);
    return {
      ...s,
      price: canonicalPrice,
      room: {
        ...s.room,
        name: getCanonicalRoomName(s.room?.name),
      },
    };
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resSessions, resFilms, resRooms] = await Promise.all([
        fetch("/api/sessoes"),
        fetch("/api/filmes"),
        fetch("/api/salas"),
      ]);

      let loadedRooms: RoomItem[] = [];
      if (resRooms.ok) {
        const data = await resRooms.json();
        if (Array.isArray(data) && data.length > 0) {
          loadedRooms = data.map((r: RoomItem) => ({
            ...r,
            name: getCanonicalRoomName(r.name),
          }));
          setRooms(loadedRooms);
        }
      }
      if (loadedRooms.length === 0) {
        setRooms(FALLBACK_ROOMS_LIST);
      }

      if (resFilms.ok) {
        const data = await resFilms.json();
        if (Array.isArray(data) && data.length > 0) {
          setFilms(data);
        }
      }

      if (resSessions.ok) {
        const data = await resSessions.json();
        if (Array.isArray(data) && data.length > 0) {
          setSessions(data.map(normalizeSessionItem));
        } else {
          await loadPortalSessionsFallback();
        }
      } else {
        await loadPortalSessionsFallback();
      }
    } catch {
      await loadPortalSessionsFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const loadPortalSessionsFallback = async () => {
    try {
      const portalRes = await fetch("/api/portal/filmes");
      if (portalRes.ok) {
        const filmsData = await portalRes.json();
        const flattened: SessionItem[] = (filmsData || []).flatMap((f: any) =>
          (f.sessions || []).map((s: any) =>
            normalizeSessionItem({
              id: s.id,
              filmId: f.id,
              roomId: s.room.id,
              startsAt: s.startsAt,
              price: s.price,
              status: s.status || "OPEN",
              film: {
                id: f.id,
                title: f.title,
                durationMinutes: f.duration || f.durationMinutes || 120,
                posterUrl: f.posterUrl,
              },
              room: s.room,
            })
          )
        );

        if (flattened.length > 0) {
          setSessions(flattened);
        }
        setFilms((prev) =>
          prev.length > 0
            ? prev
            : (filmsData || []).map((f: any) => ({
                id: f.id,
                title: f.title,
                durationMinutes: f.duration || f.durationMinutes || 120,
                posterUrl: f.posterUrl,
              }))
        );
        setRooms((prev) => (prev.length > 0 ? prev : FALLBACK_ROOMS_LIST));
      }
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Define sala padrão se não houver selecionada
  useEffect(() => {
    if (rooms.length > 0 && !batchRoomId) {
      setBatchRoomId(rooms[0].id);
    }
  }, [rooms, batchRoomId]);

  // Constantes de data para o calendário
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0 a 11

  const monthName = viewDate.toLocaleDateString("pt-BR", { month: "long" });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Primeiro dia da semana do mês e total de dias
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Domingo
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Navegar meses
  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
    setBatchSelectedDays([]);
    setActiveDayDetail(null);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
    setBatchSelectedDays([]);
    setActiveDayDetail(null);
  };

  // Mapa de sessões do filme selecionado agrupadas por dia do mês
  const filmSessionsByDay = useMemo(() => {
    if (!selectedFilmForSchedule) return new Map<number, SessionItem[]>();

    const map = new Map<number, SessionItem[]>();
    sessions.forEach((s) => {
      const matchFilm = s.filmId === selectedFilmForSchedule.id || s.film?.id === selectedFilmForSchedule.id;
      if (!matchFilm) return;

      const d = new Date(s.startsAt);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const dayNumber = d.getDate();
        const currentList = map.get(dayNumber) || [];
        map.set(dayNumber, [...currentList, s]);
      }
    });

    return map;
  }, [sessions, selectedFilmForSchedule, currentYear, currentMonth]);

  // Estatísticas resumidas de cada filme
  const filmSummaries = useMemo(() => {
    return films.map((film) => {
      const filmSessions = sessions.filter(
        (s) => s.filmId === film.id || s.film?.id === film.id
      );

      // Quantidade de dias distintos com sessões
      const distinctDaysSet = new Set(
        filmSessions.map((s) => {
          const d = new Date(s.startsAt);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
      );

      return {
        film,
        distinctDaysCount: distinctDaysSet.size,
        totalSessionsCount: filmSessions.length,
      };
    });
  }, [films, sessions]);

  // Seleção e alternância de dias
  const toggleDaySelection = (day: number) => {
    setBatchSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
    setActiveDayDetail(day);
  };

  const selectAllDaysInMonth = () => {
    if (batchSelectedDays.length === totalDaysInMonth) {
      setBatchSelectedDays([]);
    } else {
      setBatchSelectedDays(Array.from({ length: totalDaysInMonth }, (_, i) => i + 1));
    }
  };

  const handleAddTime = () => {
    if (!newTimeInput) return;
    if (!batchTimes.includes(newTimeInput)) {
      setBatchTimes((prev) => [...prev, newTimeInput].sort());
    }
    setNewTimeInput("");
  };

  const handleRemoveTime = (timeToRemove: string) => {
    setBatchTimes((prev) => prev.filter((t) => t !== timeToRemove));
  };

  // Salvar programação em lote para o filme
  const handleApplyScheduleToSelectedDays = async () => {
    if (!selectedFilmForSchedule) return;
    if (batchSelectedDays.length === 0) {
      setActionError("Selecione ao menos um dia no calendário para aplicar a programação.");
      return;
    }
    if (batchTimes.length === 0) {
      setActionError("Defina ao menos um horário para as sessões.");
      return;
    }
    if (!batchRoomId) {
      setActionError("Selecione a sala de exibição.");
      return;
    }

    startTransition(async () => {
      setActionError(null);
      setActionSuccess(null);
      let successCount = 0;
      let conflictCount = 0;

      for (const day of batchSelectedDays) {
        for (const time of batchTimes) {
          const [hours, minutes] = time.split(":").map(Number);
          const dateObj = new Date(currentYear, currentMonth, day, hours, minutes, 0, 0);

          const payload = {
            filmId: selectedFilmForSchedule.id,
            roomId: batchRoomId,
            startsAt: dateObj.toISOString(),
            price: Number(batchPrice) || 30.0,
          };

          try {
            const res = await fetch("/api/sessoes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (res.status === 200 || res.status === 201) {
              successCount++;
            } else if (res.status === 409) {
              conflictCount++;
            }
          } catch {
            // Continua lote
          }
        }
      }

      setActionSuccess(
        `Programação aplicada: ${successCount} sessões criadas com sucesso.` +
          (conflictCount > 0 ? ` (${conflictCount} ignoradas por conflito de horário/sala).` : "")
      );
      setBatchSelectedDays([]);
      await fetchData();
    });
  };

  // Remover todas as sessões de um dia específico
  const handleRemoveAllSessionsOfDay = async (dayNumber: number) => {
    const sessionsOfDay = filmSessionsByDay.get(dayNumber) || [];
    if (sessionsOfDay.length === 0) return;

    if (!confirm(`Remover as ${sessionsOfDay.length} sessões programadas para o dia ${dayNumber}?`)) {
      return;
    }

    startTransition(async () => {
      let removed = 0;
      for (const sess of sessionsOfDay) {
        try {
          const res = await fetch(`/api/sessoes/${sess.id}`, { method: "DELETE" });
          if (res.status === 204) removed++;
        } catch {
          // Continua
        }
      }
      setActionSuccess(`${removed} sessões removidas do dia ${dayNumber}.`);
      await fetchData();
    });
  };

  // Excluir sessão pontual
  const handleDeleteSingleSession = async (session: SessionItem) => {
    if (!confirm(`Excluir esta sessão?`)) return;

    try {
      const res = await fetch(`/api/sessoes/${session.id}`, { method: "DELETE" });
      if (res.status === 204) {
        setActionSuccess("Sessão excluída com sucesso.");
        fetchData();
      } else {
        const data = await res.json();
        setActionError(data.error || "Não foi possível excluir a sessão.");
      }
    } catch {
      setActionError("Erro de comunicação ao excluir sessão.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      <CineDoomHeader activePage="gestao" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1 w-full">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-borderDark/60">
          <div className="flex items-center gap-3">
            <Link
              href="/gestao"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Voltar ao Painel Geral"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-cta/15 text-cta border border-cta/30 flex items-center justify-center shadow-lg shadow-cta/10">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Programação de Sessões
              </h1>
              <p className="text-xs text-slate-400">
                Gerencie os dias e horários de exibição mensal organizados por filme
              </p>
            </div>
          </div>
        </div>

        {/* Feedbacks de Alerta */}
        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-24 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-cta border-t-transparent rounded-full animate-spin" />
            <span>Carregando programação de cinema...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ========================================================================= */}
            {/* 1. SELEÇÃO / LISTA DE FILMES (Área Própria e Resumida por Filme)          */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Filmes em Cartaz ({films.length})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {filmSummaries
                  .slice((filmsPage - 1) * 20, filmsPage * 20)
                  .map(({ film, distinctDaysCount, totalSessionsCount }) => {
                  const isSelected = selectedFilmForSchedule?.id === film.id;

                  return (
                    <button
                      key={film.id}
                      type="button"
                      onClick={() => {
                        setSelectedFilmForSchedule(film);
                        setBatchSelectedDays([]);
                        setActiveDayDetail(null);
                        setActionError(null);
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                        isSelected
                          ? "bg-[#182038] border-cta ring-2 ring-cta/40 shadow-lg shadow-cta/15"
                          : "bg-[#0A0E1A]/90 hover:bg-[#12182B] border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="relative aspect-[2/3] w-12 rounded-lg overflow-hidden bg-[#0A0E1A] border border-white/10 shrink-0">
                        {film.posterUrl ? (
                          <Image
                            src={film.posterUrl}
                            alt={film.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <FilmIcon className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h2 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                          {film.title}
                        </h2>
                        <span className="text-[11px] text-slate-400 block">
                          {film.durationMinutes} min
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="font-semibold text-white">{distinctDaysCount} dias</span>
                          <span>•</span>
                          <span className="text-slate-300 font-semibold">{totalSessionsCount} sessões</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <Pagination
                currentPage={filmsPage}
                totalItems={filmSummaries.length}
                pageSize={20}
                onPageChange={setFilmsPage}
                itemLabel="filmes"
              />
            </div>

            {/* ========================================================================= */}
            {/* 2. CONFIGURADOR DA PROGRAMAÇÃO MENSAL DO FILME SELECIONADO                 */}
            {/* ========================================================================= */}
            {selectedFilmForSchedule ? (
              <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 border border-white/10 shadow-2xl space-y-6 animate-in fade-in duration-200">
                {/* Header do Gerenciador do Filme */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative aspect-[2/3] w-10 rounded-md overflow-hidden bg-[#0A0E1A] border border-white/10 shrink-0">
                      {selectedFilmForSchedule.posterUrl ? (
                        <Image
                          src={selectedFilmForSchedule.posterUrl}
                          alt={selectedFilmForSchedule.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <FilmIcon className="w-4 h-4 opacity-40" />
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-cta uppercase tracking-widest block leading-none">
                        Programação do Mês
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                        {selectedFilmForSchedule.title}
                      </h2>
                    </div>
                  </div>

                  {/* Controles de Mês do Calendário */}
                  <div className="flex items-center gap-2 bg-[#0A0E1A] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                      title="Mês anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-white px-2">
                      {capitalizedMonthName} {currentYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                      title="Próximo mês"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Coluna Esquerda: Calendário Interativo do Mês */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-cta" />
                        <span>Selecione os dias no calendário:</span>
                      </span>

                      <button
                        type="button"
                        onClick={selectAllDaysInMonth}
                        className="text-[11px] font-bold text-cta hover:text-white uppercase transition-colors cursor-pointer"
                      >
                        {batchSelectedDays.length === totalDaysInMonth ? "Desmarcar todos" : "Marcar todo o mês"}
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0A0E1A]/90 border border-white/10 space-y-2">
                      {/* Dias da Semana (D S T Q Q S S) */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                        <span>Dom</span>
                        <span>Seg</span>
                        <span>Ter</span>
                        <span>Qua</span>
                        <span>Qui</span>
                        <span>Sex</span>
                        <span>Sáb</span>
                      </div>

                      {/* Grade dos Dias do Mês */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {/* Espaços vazios do início do mês */}
                        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-10 sm:h-12 rounded-xl bg-transparent" />
                        ))}

                        {/* Dias reais */}
                        {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const isSelectedForBatch = batchSelectedDays.includes(day);
                          const daySessions = filmSessionsByDay.get(day) || [];
                          const hasSessions = daySessions.length > 0;
                          const isInspecting = activeDayDetail === day;

                          return (
                            <button
                              key={`day-${day}`}
                              type="button"
                              onClick={() => toggleDaySelection(day)}
                              className={`h-10 sm:h-12 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center relative p-1 leading-none ${
                                isSelectedForBatch
                                  ? "bg-cta text-white ring-2 ring-white shadow-md shadow-cta/30 font-bold"
                                  : hasSessions
                                  ? "bg-slate-800 text-white border border-white/20 hover:border-cta"
                                  : "bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                              } ${isInspecting && !isSelectedForBatch ? "ring-1 ring-white/50" : ""}`}
                            >
                              <span className="text-xs sm:text-sm font-bold">{day}</span>
                              {hasSessions && (
                                <span className={`text-[9px] mt-0.5 font-bold ${isSelectedForBatch ? "text-white" : "text-cta"}`}>
                                  {daySessions.length} sess.
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 px-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-white/20" />
                        <span>Dia com sessões já programadas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cta" />
                        <span>Dia selecionado para aplicar</span>
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita: Configuração dos Horários e Salas em Lote */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-4 rounded-2xl bg-[#0A0E1A]/90 border border-white/10 space-y-3.5 text-xs">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-cta" />
                          <span>Configurar Programação</span>
                        </span>
                        <span className="text-[11px] font-bold text-cta">
                          {batchSelectedDays.length} {batchSelectedDays.length === 1 ? "dia marcado" : "dias marcados"}
                        </span>
                      </div>

                      {/* 1. Escolha de Sala */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Sala de Exibição
                        </label>
                        <select
                          value={batchRoomId}
                          onChange={(e) => setBatchRoomId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#12182B] border border-white/10 text-white font-medium outline-none focus:border-cta"
                        >
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.capacity} assentos)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Horários das Sessões */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Horários das Sessões
                        </label>

                        <div className="flex flex-wrap gap-1.5">
                          {batchTimes.map((timeStr) => (
                            <span
                              key={timeStr}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold text-xs border border-white/15"
                            >
                              <span>{timeStr}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTime(timeStr)}
                                className="text-slate-400 hover:text-rose-400 cursor-pointer"
                                title="Remover este horário"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="time"
                            value={newTimeInput}
                            onChange={(e) => setNewTimeInput(e.target.value)}
                            className="px-2.5 py-1 rounded-lg bg-[#12182B] border border-white/10 text-white text-xs outline-none focus:border-cta"
                          />
                          <button
                            type="button"
                            onClick={handleAddTime}
                            disabled={!newTimeInput}
                            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            + Adicionar
                          </button>
                        </div>
                      </div>

                      {/* 3. Preço Base */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-300 block">
                          Preço do Ingresso (R$)
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          min="1.00"
                          value={batchPrice}
                          onChange={(e) => setBatchPrice(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#12182B] border border-white/10 text-white font-medium outline-none focus:border-cta"
                        />
                      </div>

                      {/* Resumo da Operação */}
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-300 leading-snug">
                        Serão criadas:{" "}
                        <strong className="text-white">
                          {batchSelectedDays.length * batchTimes.length} sessões
                        </strong>{" "}
                        ({batchSelectedDays.length} dias × {batchTimes.length} horários) com poltronas geradas automaticamente.
                      </div>

                      {/* Botão de Aplicação em Lote */}
                      <button
                        type="button"
                        disabled={isPending || batchSelectedDays.length === 0 || batchTimes.length === 0}
                        onClick={handleApplyScheduleToSelectedDays}
                        className="w-full py-2.5 px-4 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold shadow-md shadow-cta/25 transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {isPending ? "Aplicando..." : "Aplicar Programação aos Dias"}
                        </span>
                      </button>
                    </div>

                    {/* Inspeção e Ajuste de um Dia Específico */}
                    {activeDayDetail && (
                      <div className="p-4 rounded-2xl bg-[#0A0E1A]/90 border border-white/10 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="font-bold text-white">
                            Dia {activeDayDetail} de {capitalizedMonthName}
                          </span>
                          {(filmSessionsByDay.get(activeDayDetail)?.length || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAllSessionsOfDay(activeDayDetail)}
                              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                            >
                              Remover do dia
                            </button>
                          )}
                        </div>

                        {(filmSessionsByDay.get(activeDayDetail)?.length || 0) === 0 ? (
                          <p className="text-[11px] text-slate-500 py-1">
                            Nenhuma sessão programada para este dia.
                          </p>
                        ) : (
                          <div className="space-y-1.5 pt-1">
                            {filmSessionsByDay.get(activeDayDetail)?.map((sess) => (
                              <div
                                key={sess.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.04] border border-white/5"
                              >
                                <span className="font-bold text-white">
                                  {new Date(sess.startsAt).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="text-slate-400 text-[11px]">
                                  {sess.room.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSingleSession(sess)}
                                  className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                                  title="Excluir sessão"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 px-6 rounded-3xl liquid-glass-card text-center space-y-2">
                <FilmIcon className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-white">Selecione um filme acima</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Clique em um dos filmes em cartaz para abrir o gerenciador mensal e programar os dias, salas e horários.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <CineDoomFooter simple className="mt-8" />
    </div>
  );
}
