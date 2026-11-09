"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Film as FilmIcon,
  Sparkles,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { getCanonicalRoomName } from "@/shared/experiences";

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

function formatSessionStatusLabel(status: SessionItem["status"]): string {
  switch (status) {
    case "OPEN":
      return "Aberta";
    case "SCHEDULED":
      return "Agendada";
    case "CLOSED":
      return "Encerrada";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}

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

interface FormErrors {
  filmId?: string;
  roomId?: string;
  startsAt?: string;
  price?: string;
  general?: string;
}

export default function SessoesGestaoInteligentePage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [films, setFilms] = useState<FilmItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtro inteligente de filme selecionado
  const [selectedFilmId, setSelectedFilmId] = useState<string>("ALL");

  // Filtro de mês / período
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Modal de edição pontual
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("SCHEDULED");
  const [singleStartsAt, setSingleStartsAt] = useState("");
  const [singlePrice, setSinglePrice] = useState("30.00");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Modal inteligente de programação de sessões para o filme (Multi-dias & horários)
  const [isSmartSchedulerOpen, setIsSmartSchedulerOpen] = useState(false);
  const [targetFilm, setTargetFilm] = useState<FilmItem | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["14:00", "17:30", "20:30"]);
  const [newTimeInput, setNewTimeInput] = useState("");
  const [smartPrice, setSmartPrice] = useState("30.00");

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
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

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      if (resSessions.ok) {
        const data = await resSessions.json();
        if (Array.isArray(data) && data.length > 0) {
          const validSessions = data
            .map(normalizeSessionItem)
            .filter((s: SessionItem) => new Date(s.startsAt) >= startOfToday)
            .sort(
              (a: SessionItem, b: SessionItem) =>
                new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
            );

          if (validSessions.length > 0) {
            setSessions(validSessions);
          } else {
            await loadPortalSessionsFallback();
          }
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
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        const flattened: SessionItem[] = (filmsData || [])
          .flatMap((f: any) =>
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
          )
          .filter((s: SessionItem) => new Date(s.startsAt) >= startOfToday)
          .sort(
            (a: SessionItem, b: SessionItem) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
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

  // Dias do mês atual para o seletor inteligente
  const [selectedYear, selectedMonth] = currentYearMonth.split("-").map(Number);
  const daysInCurrentMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysList = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  // Abre agendamento inteligente por filme
  const handleOpenSmartScheduler = (film: FilmItem) => {
    setTargetFilm(film);
    setSelectedDays([]);
    setSelectedRoomId(rooms[0]?.id || "");
    setScheduleTimes(["14:00", "17:30", "20:30"]);
    setSmartPrice(OFFICIAL_CATALOG_FILM_IDS.has(film.id) ? "30.00" : "30.00");
    setFormErrors({});
    setIsSmartSchedulerOpen(true);
  };

  const handleToggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSelectAllDays = () => {
    if (selectedDays.length === daysList.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays(daysList);
    }
  };

  const handleAddTime = () => {
    if (!newTimeInput) return;
    if (!scheduleTimes.includes(newTimeInput)) {
      setScheduleTimes((prev) => [...prev, newTimeInput].sort());
    }
    setNewTimeInput("");
  };

  const handleRemoveTime = (timeToRemove: string) => {
    setScheduleTimes((prev) => prev.filter((t) => t !== timeToRemove));
  };

  // Salvar sessões em lote criadas pelo agendador inteligente
  const handleSaveSmartBatch = async () => {
    if (!targetFilm) return;
    if (selectedDays.length === 0) {
      setFormErrors({ general: "Selecione ao menos um dia do mês para programar as sessões." });
      return;
    }
    if (scheduleTimes.length === 0) {
      setFormErrors({ general: "Adicione ao menos um horário para as sessões." });
      return;
    }
    if (!selectedRoomId) {
      setFormErrors({ general: "Selecione uma sala de exibição." });
      return;
    }

    startTransition(async () => {
      setFormErrors({});
      let successCount = 0;
      let conflictCount = 0;

      for (const day of selectedDays) {
        for (const time of scheduleTimes) {
          const [hours, minutes] = time.split(":").map(Number);
          const dateObj = new Date(selectedYear, selectedMonth - 1, day, hours, minutes, 0, 0);

          const payload = {
            filmId: targetFilm.id,
            roomId: selectedRoomId,
            startsAt: dateObj.toISOString(),
            price: Number(smartPrice) || 30.0,
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

      setIsSmartSchedulerOpen(false);
      setActionSuccess(
        `Programação concluída: ${successCount} sessões criadas com sucesso para "${targetFilm.title}".` +
          (conflictCount > 0 ? ` (${conflictCount} ignoradas por conflito de horário na sala)` : "")
      );
      fetchData();
    });
  };

  // Excluir sessão individual
  const handleDeleteSession = async (session: SessionItem) => {
    if (
      !confirm(
        `Deseja realmente cancelar/excluir a sessão do filme "${session.film.title}" às ${new Date(
          session.startsAt
        ).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/sessoes/${session.id}`, { method: "DELETE" });
      if (res.status === 204) {
        setActionSuccess("Sessão excluída com sucesso.");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Não foi possível excluir a sessão.");
      }
    } catch {
      alert("Erro ao tentar excluir a sessão.");
    }
  };

  // Edição pontual
  const handleOpenEditModal = (sess: SessionItem) => {
    setEditingSession(sess);
    setSessionStatus(sess.status);
    const d = new Date(sess.startsAt);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setSingleStartsAt(localISOTime);
    setSinglePrice(String(sess.price));
    setFormErrors({});
  };

  const handleSaveEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/sessoes/${editingSession.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: sessionStatus,
            startsAt: new Date(singleStartsAt).toISOString(),
            price: Number(singlePrice),
          }),
        });

        if (res.ok) {
          setEditingSession(null);
          setActionSuccess("Sessão atualizada com sucesso!");
          fetchData();
        } else {
          const data = await res.json();
          setFormErrors({ general: data.error || "Erro ao editar sessão." });
        }
      } catch {
        setFormErrors({ general: "Erro de conexão ao salvar sessão." });
      }
    });
  };

  // Agrupamento inteligente das sessões por filme
  const filteredFilmsList =
    selectedFilmId === "ALL" ? films : films.filter((f) => f.id === selectedFilmId);

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      <CineDoomHeader activePage="gestao" />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        {/* Barra de Ações & Título */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-borderDark/60">
          <div className="flex items-center gap-3">
            <Link
              href="/gestao"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-cta/15 text-cta border border-cta/30 flex items-center justify-center shadow-lg shadow-cta/10">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Programação de Sessões</h1>
              <p className="text-xs text-slate-400">
                Configure os dias do mês, salas e horários agrupados de forma inteligente por filme
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Filme Filtro */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">Filtrar:</span>
              <select
                value={selectedFilmId}
                onChange={(e) => setSelectedFilmId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#0A0E1A] border border-borderDark text-xs text-white focus:border-cta outline-none"
              >
                <option value="ALL">Todos os filmes ({films.length})</option>
                {films.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notificação de Sucesso */}
        {actionSuccess && (
          <div className="flex items-center justify-between p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium">{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Listagem Inteligente Separada por Filme */}
        {isLoading ? (
          <div className="flex justify-center items-center py-24 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cta mr-3" />
            Carregando catálogo e programação de sessões...
          </div>
        ) : filteredFilmsList.length === 0 ? (
          <div className="text-center py-20 liquid-glass-card rounded-3xl p-8 space-y-4">
            <FilmIcon className="w-16 h-16 text-gray-600 mx-auto" />
            <h2 className="text-xl font-bold text-gray-300">Nenhum filme cadastrado</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Cadastre filmes no catálogo para poder configurar as sessões e horários das salas.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFilmsList.map((film) => {
              const filmSessions = sessions.filter((s) => s.filmId === film.id || s.film.id === film.id);

              return (
                <div
                  key={film.id}
                  className="liquid-glass-card rounded-2xl p-5 sm:p-6 border border-white/10 shadow-xl space-y-5"
                >
                  {/* Cabeçalho do Filme + Botão Programar Sessões */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="relative aspect-[2/3] w-12 sm:w-14 rounded-lg overflow-hidden bg-[#0A0E1A] border border-white/10 shrink-0">
                        {film.posterUrl ? (
                          <Image
                            src={film.posterUrl}
                            alt={film.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <FilmIcon className="w-6 h-6 opacity-40" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                          {film.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{film.durationMinutes} min</span>
                          <span>•</span>
                          <span className="text-slate-300 font-medium">
                            {filmSessions.length} {filmSessions.length === 1 ? "sessão programada" : "sessões programadas"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenSmartScheduler(film)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold shadow-md shadow-cta/20 transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Programar Sessões (Dias & Horários)</span>
                    </button>
                  </div>

                  {/* Sessões Existentes do Filme em Grade Limpa */}
                  {filmSessions.length === 0 ? (
                    <div className="py-6 px-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-xs text-slate-400">
                        Nenhuma sessão cadastrada para este filme. Clique em{" "}
                        <strong className="text-white">&quot;Programar Sessões&quot;</strong> para definir os dias e horários no mês.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filmSessions.map((sess) => {
                        const startDate = new Date(sess.startsAt);
                        const dateFormatted = startDate.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        });
                        const timeFormatted = startDate.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={sess.id}
                            className="p-3.5 rounded-xl bg-[#0A0E1A]/90 border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-3 shadow-sm"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white capitalize flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-cta" />
                                  <span>{dateFormatted}</span>
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                                  {formatSessionStatusLabel(sess.status)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <span className="text-sm font-extrabold text-white flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-cta" />
                                  <span>{timeFormatted}</span>
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  {sess.room.name}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                              <span className="text-xs font-bold text-slate-300">
                                R$ {Number(sess.price).toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(sess)}
                                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  title="Editar Sessão"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSession(sess)}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                                  title="Excluir Sessão"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CineDoomFooter simple className="mt-8" />

      {/* Modal Inteligente: Programação de Sessões em Lote para o Filme */}
      {isSmartSchedulerOpen && targetFilm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#12182B] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold text-cta uppercase tracking-wider block">
                  Agendamento Inteligente
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Programar Sessões: {targetFilm.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSmartSchedulerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formErrors.general && (
              <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formErrors.general}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* 1. Mês de Referência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Mês de Programação
                  </label>
                  <input
                    type="month"
                    value={currentYearMonth}
                    onChange={(e) => {
                      setCurrentYearMonth(e.target.value);
                      setSelectedDays([]);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white font-medium outline-none focus:border-cta"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Sala de Exibição
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white font-medium outline-none focus:border-cta"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.capacity} assentos)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Seleção de Dias do Mês */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[#0A0E1A]/80 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cta" />
                    <span>Selecione os dias do mês:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllDays}
                    className="text-[10px] text-cta hover:text-white font-bold uppercase transition-colors cursor-pointer"
                  >
                    {selectedDays.length === daysList.length ? "Desmarcar todos" : "Selecionar todos"}
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-2">
                  {daysList.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          isSelected
                            ? "bg-cta text-white shadow-sm shadow-cta/30"
                            : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-500 block pt-1">
                  {selectedDays.length} {selectedDays.length === 1 ? "dia selecionado" : "dias selecionados"}
                </span>
              </div>

              {/* 3. Horários das Sessões */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#0A0E1A]/80 border border-white/10">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cta" />
                  <span>Horários das sessões nos dias escolhidos:</span>
                </span>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {scheduleTimes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-white font-bold text-xs border border-white/15"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(t)}
                        className="text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Remover horário"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="time"
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#12182B] border border-white/10 text-white text-xs outline-none focus:border-cta"
                  />
                  <button
                    type="button"
                    onClick={handleAddTime}
                    disabled={!newTimeInput}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    + Adicionar Horário
                  </button>
                </div>
              </div>

              {/* 4. Preço dos Ingressos */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Preço Base do Ingresso (R$)
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="1.00"
                  value={smartPrice}
                  onChange={(e) => setSmartPrice(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white font-medium outline-none focus:border-cta"
                />
              </div>

              {/* Resumo da Operação */}
              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl text-slate-300">
                Total a ser criado:{" "}
                <strong className="text-white">
                  {selectedDays.length * scheduleTimes.length} sessões
                </strong>{" "}
                ({selectedDays.length} dias × {scheduleTimes.length} horários) com assentos gerados automaticamente.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsSmartSchedulerOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || selectedDays.length === 0 || scheduleTimes.length === 0}
                onClick={handleSaveSmartBatch}
                className="px-5 py-2 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold shadow-md shadow-cta/25 transition-all disabled:opacity-40 cursor-pointer"
              >
                {isPending ? "Criando Sessões..." : "Confirmar e Criar Sessões"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição Pontual de Sessão */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12182B] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Editar Sessão</h2>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formErrors.general && (
              <div className="p-2.5 bg-rose-950/50 border border-rose-500/50 rounded-xl text-rose-200 text-xs">
                {formErrors.general}
              </div>
            )}

            <form onSubmit={handleSaveEditSession} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Filme</label>
                <p className="font-bold text-white text-sm">{editingSession.film.title}</p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Sala</label>
                <p className="font-semibold text-slate-300">{editingSession.room.name}</p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Data e Horário</label>
                <input
                  type="datetime-local"
                  value={singleStartsAt}
                  onChange={(e) => setSingleStartsAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white outline-none focus:border-cta"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Status</label>
                <select
                  value={sessionStatus}
                  onChange={(e) => setSessionStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white outline-none focus:border-cta"
                >
                  <option value="OPEN">Aberta</option>
                  <option value="SCHEDULED">Agendada</option>
                  <option value="CLOSED">Encerrada</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Preço (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  min="1.00"
                  value={singlePrice}
                  onChange={(e) => setSinglePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0E1A] border border-white/10 text-white outline-none focus:border-cta"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-cta hover:bg-cta-hover text-white font-bold"
                >
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
