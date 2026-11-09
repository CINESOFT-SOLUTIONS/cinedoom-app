"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  LayoutGrid,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  DollarSign,
  Ticket,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";
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
  _count?: {
    sessionSeats: number;
    tickets: number;
    reservations: number;
  };
}

interface FormErrors {
  filmId?: string;
  roomId?: string;
  startsAt?: string;
  price?: string;
  general?: string;
}

export default function SessoesGestãoPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [films, setFilms] = useState<FilmItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("SCHEDULED");
  const [dateFilter, setDateFilter] = useState<"TODAY" | "TOMORROW" | "UPCOMING" | "ALL">("TODAY");

  // Form states
  const [filmId, setFilmId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [price, setPrice] = useState("30.00");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
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

  // Load initial data
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
              }))
        );
        setRooms((prev) => (prev.length > 0 ? prev : FALLBACK_ROOMS_LIST));
      }
    } catch {
      // Silencioso no fallback
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSession(null);
    setFilmId(films[0]?.id || "");
    setRoomId(rooms[0]?.id || "");
    setSessionStatus("SCHEDULED");
    
    // Sugere horario de inicio para a proxima hora cheia
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 2);
    nextHour.setMinutes(0);
    const tzOffset = nextHour.getTimezoneOffset() * 60000;
    const localISOTime = new Date(nextHour.getTime() - tzOffset).toISOString().slice(0, 16);
    setStartsAt(localISOTime);
    
    setPrice("30.00");
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (session: SessionItem) => {
    setEditingSession(session);
    setFilmId(session.film.id || session.filmId || "");
    setRoomId(session.room.id || session.roomId || "");
    setSessionStatus(session.status || "OPEN");

    // Formata startsAt local para input datetime-local
    const d = new Date(session.startsAt);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setStartsAt(localISOTime);

    setPrice(Number(session.price).toFixed(2));
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!filmId) {
      setFormErrors({ filmId: "Selecione um filme para a sessão." });
      return;
    }
    if (!roomId) {
      setFormErrors({ roomId: "Selecione uma sala para a sessão." });
      return;
    }
    if (!startsAt) {
      setFormErrors({ startsAt: "Informe a data e horário de início." });
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFormErrors({ price: "O valor do ingresso deve ser maior que zero." });
      return;
    }

    const isEditing = Boolean(editingSession);

    startTransition(async () => {
      try {
        const endpoint = isEditing ? `/api/sessoes/${editingSession?.id}` : "/api/sessoes";
        const method = isEditing ? "PUT" : "POST";

        const payload: any = {
          startsAt: new Date(startsAt).toISOString(),
          price: numPrice,
        };

        if (!isEditing) {
          payload.filmId = filmId;
          payload.roomId = roomId;
        } else {
          payload.status = sessionStatus;
        }

        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.status === 200 || res.status === 201) {
          setIsCreateModalOpen(false);
          setEditingSession(null);
          setActionSuccess(
            isEditing
              ? "Sessão atualizada com sucesso!"
              : `Sessão agendada com sucesso! Mapa com ${data.seatsGeneratedCount ?? 0} poltronas liberado para venda.`
          );
          fetchData();
        } else if (res.status === 409) {
          setFormErrors({ general: data.error || "Conflito de horario na sala selecionada." });
        } else if (res.status === 422) {
          const errorsObj: FormErrors = {};
          if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach((err: { field: string; message: string }) => {
              if (err.field.includes("startsAt")) errorsObj.startsAt = err.message;
              else if (err.field.includes("price")) errorsObj.price = err.message;
              else if (err.field.includes("filmId")) errorsObj.filmId = err.message;
              else if (err.field.includes("roomId")) errorsObj.roomId = err.message;
            });
          }
          setFormErrors(errorsObj);
        } else {
          setFormErrors({ general: data.error || (isEditing ? "Erro ao editar sessão." : "Erro ao agendar sessão.") });
        }
      } catch {
        setFormErrors({ general: "Erro inesperado de conexão com o servidor." });
      }
    });
  };

  const handleDeleteSession = async (session: SessionItem) => {
    if (
      !confirm(
        `Deseja realmente cancelar/excluir a sessão do filme "${session.film.title}" na ${session.room.name}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/sessoes/${session.id}`, {
        method: "DELETE",
      });

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

  const filteredSessions = sessions.filter((sess) => {
    if (dateFilter === "ALL") return true;
    const sDate = new Date(sess.startsAt);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const dayAfterTomorrowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2,
      0,
      0,
      0,
      0
    );

    if (dateFilter === "TODAY") {
      return sDate >= todayStart && sDate < tomorrowStart;
    }
    if (dateFilter === "TOMORROW") {
      return sDate >= tomorrowStart && sDate < dayAfterTomorrowStart;
    }
    return sDate >= dayAfterTomorrowStart;
  });

  const displayedSessions = filteredSessions.length > 0 ? filteredSessions : sessions;

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Header Oficial CineDoom */}
      <CineDoomHeader activePage="gestao" />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        {/* Barra de Ações & Título */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
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
              <h1 className="text-xl font-bold tracking-tight text-white">Programação & Sessões</h1>
              <p className="text-xs text-slate-400">
                Agendamento e gerenciamento de sessões e horários das salas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Período */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0A0E1A] border border-borderDark/60 text-xs">
              <button
                type="button"
                onClick={() => setDateFilter("TODAY")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  dateFilter === "TODAY"
                    ? "bg-cta text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("TOMORROW")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  dateFilter === "TOMORROW"
                    ? "bg-cta text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("UPCOMING")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  dateFilter === "UPCOMING"
                    ? "bg-cta text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Próximos dias
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  dateFilter === "ALL"
                    ? "bg-white/15 text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Todas
              </button>
            </div>

            <button
              onClick={handleOpenCreateModal}
              disabled={films.length === 0 || rooms.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cta hover:bg-cta-hover text-white text-sm font-semibold shadow-lg shadow-cta/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Sessão</span>
            </button>
          </div>
        </div>

        {/* Alerta de Sucesso */}
        {actionSuccess && (
          <div className="flex items-center justify-between p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-medium">{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Aviso se não houver filmes ou salas cadastrados */}
        {!isLoading && (films.length === 0 || rooms.length === 0) && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              É necessário cadastrar ao menos um <strong>Filme</strong> e uma <strong>Sala</strong> antes de agendar sessões.
            </span>
          </div>
        )}

        {/* Lista de Sessões */}
        {isLoading ? (
          <div className="flex justify-center items-center py-24 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E94560] mr-3" />
            Carregando sessões...
          </div>
        ) : displayedSessions.length === 0 ? (
          <div className="text-center py-20 liquid-glass-card rounded-3xl p-8 space-y-4">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto" />
            <h2 className="text-xl font-bold text-gray-300">Nenhuma sessão agendada</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Clique em &quot;Nova Sessão&quot; para programar um filme em uma de suas salas e disponibilizar as poltronas para venda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedSessions.map((sess) => {
              const startDate = new Date(sess.startsAt);
              const formattedDate = startDate.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const formattedTime = startDate.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={sess.id}
                  className="liquid-glass-card hover:border-white/25 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          {formatSessionStatusLabel(sess.status)}
                        </span>
                        <h2 className="text-lg font-bold text-white line-clamp-1">
                          {sess.film.title}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(sess)}
                          title="Editar Sessão"
                          className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(sess)}
                          title="Cancelar / Excluir Sessão"
                          className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4 text-[#E94560]" />
                        <span>
                          {formattedDate} às <strong className="text-white font-semibold">{formattedTime}</strong> ({sess.film.durationMinutes} min)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <LayoutGrid className="w-4 h-4 text-[#E94560]" />
                        <span>{getCanonicalRoomName(sess.room.name)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold text-emerald-300">
                          R$ {Number(sess.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Ticket className="w-4 h-4 text-gray-500" />
                      {sess._count?.sessionSeats ?? sess.room.capacity} assentos pré-inseridos
                    </span>
                    <span className="text-gray-500">ID: {sess.id.slice(0, 8)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Agendamento de Sessao */}
      {isCreateModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="liquid-glass-card bg-[#161F36] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative border border-borderDark cursor-default"
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#E94560]" />
                {editingSession ? "Editar Sessão" : "Agendar Nova Sessão"}
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingSession(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formErrors.general && (
              <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl text-red-200 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{formErrors.general}</span>
              </div>
            )}

            <form onSubmit={handleSaveSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                  Filme
                </label>
                <select
                  value={filmId}
                  disabled={Boolean(editingSession)}
                  onChange={(e) => setFilmId(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {films.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({f.durationMinutes} min)
                    </option>
                  ))}
                </select>
                {formErrors.filmId && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.filmId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                  Sala de Exibição
                </label>
                <select
                  value={roomId}
                  disabled={Boolean(editingSession)}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-4 py-2.5 text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity} assentos)
                    </option>
                  ))}
                </select>
                {formErrors.roomId && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.roomId}</p>
                )}
              </div>

              {editingSession && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Status da Sessão
                  </label>
                  <select
                    value={sessionStatus}
                    onChange={(e) => setSessionStatus(e.target.value)}
                    className="w-full liquid-glass-input rounded-xl px-4 py-2.5 text-sm text-white"
                  >
                    <option value="OPEN">Aberta</option>
                    <option value="SCHEDULED">Agendada</option>
                    <option value="CLOSED">Encerrada</option>
                    <option value="CANCELLED">Cancelada</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Data e Horário de Início
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full liquid-glass-input rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                  {formErrors.startsAt && (
                    <p className="text-xs text-red-400 mt-1">{formErrors.startsAt}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Preço do Ingresso (R$)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="1.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full liquid-glass-input rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                  {formErrors.price && (
                    <p className="text-xs text-red-400 mt-1">{formErrors.price}</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-sky-950/30 border border-sky-500/20 rounded-xl text-xs text-slate-300">
                <span className="font-semibold text-sky-400">Aviso:</span> Ao confirmar as alterações, o sistema valida a disponibilidade de horários da sala para evitar sobreposição.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingSession(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[#E94560] hover:bg-[#d63d56] text-white text-sm font-bold shadow-lg shadow-[#E94560]/30 transition-all disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : editingSession ? "Salvar Alterações" : "Criar Sessão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
