"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Film,
  LayoutGrid,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  DollarSign,
  Ticket,
  ChevronRight,
} from "lucide-react";

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

  // Form states
  const [filmId, setFilmId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [price, setPrice] = useState("35.00");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resSessions, resFilms, resRooms] = await Promise.all([
        fetch("/api/sessoes"),
        fetch("/api/filmes"),
        fetch("/api/salas"),
      ]);

      if (resSessions.ok) {
        const data = await resSessions.json();
        setSessions(data);
      }
      if (resFilms.ok) {
        const data = await resFilms.json();
        setFilms(data);
      }
      if (resRooms.ok) {
        const data = await resRooms.json();
        setRooms(data);
      }
    } catch {
      setFormErrors({ general: "Falha na conexao com o servidor." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setFilmId(films[0]?.id || "");
    setRoomId(rooms[0]?.id || "");
    
    // Sugere horario de inicio para a proxima hora cheia
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 2);
    nextHour.setMinutes(0);
    const tzOffset = nextHour.getTimezoneOffset() * 60000;
    const localISOTime = new Date(nextHour.getTime() - tzOffset).toISOString().slice(0, 16);
    setStartsAt(localISOTime);
    
    setPrice("35.00");
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!filmId) {
      setFormErrors({ filmId: "Selecione um filme para a sessao." });
      return;
    }
    if (!roomId) {
      setFormErrors({ roomId: "Selecione uma sala para a sessao." });
      return;
    }
    if (!startsAt) {
      setFormErrors({ startsAt: "Informe a data e horario de inicio." });
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFormErrors({ price: "O valor do ingresso deve ser maior que zero." });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/sessoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filmId,
            roomId,
            startsAt: new Date(startsAt).toISOString(),
            price: numPrice,
          }),
        });

        const data = await res.json();

        if (res.status === 201) {
          setIsCreateModalOpen(false);
          setActionSuccess(
            `Sessao agendada com sucesso! ${data.seatsGeneratedCount ?? 0} assentos foram pre-populados.`
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
          setFormErrors({ general: data.error || "Erro ao agendar sessao." });
        }
      } catch {
        setFormErrors({ general: "Erro inesperado de conexao com a API." });
      }
    });
  };

  const handleDeleteSession = async (session: SessionItem) => {
    if (
      !confirm(
        `Deseja realmente cancelar/excluir a sessao do filme "${session.film.title}" na ${session.room.name}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/sessoes/${session.id}`, {
        method: "DELETE",
      });

      if (res.status === 204) {
        setActionSuccess("Sessao excluida com sucesso.");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Nao foi possivel excluir a sessao.");
      }
    } catch {
      alert("Erro ao tentar excluir a sessao.");
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A2E] text-[#F5F5F5] p-6 lg:p-10">
      {/* Header com Navegacao */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Link href="/gestao" className="hover:text-[#E94560] transition-colors">
                Gestão
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-[#E94560] font-medium">Sessoes Cinematograficas</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Calendar className="w-8 h-8 text-[#E94560]" />
              Agendamento de Sessoes
            </h1>
            <p className="text-gray-400 text-sm">
              Gestao de programacao cinematografica com pre-populacao atomica de assentos (ADR-007 / AC-8).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/gestao"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <button
              onClick={handleOpenCreateModal}
              disabled={films.length === 0 || rooms.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E94560] hover:bg-[#d63d56] text-white text-sm font-bold shadow-lg shadow-[#E94560]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Nova Sessao
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

        {/* Aviso se nao houver filmes ou salas cadastrados */}
        {!isLoading && (films.length === 0 || rooms.length === 0) && (
          <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              E necessario cadastrar ao menos um <strong>Filme</strong> e uma <strong>Sala</strong> antes de agendar sessoes.
            </span>
          </div>
        )}

        {/* Lista de Sessoes */}
        {isLoading ? (
          <div className="flex justify-center items-center py-24 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E94560] mr-3" />
            Carregando sessoes...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 liquid-glass-card rounded-3xl p-8 space-y-4">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto" />
            <h2 className="text-xl font-bold text-gray-300">Nenhuma sessao agendada</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Clique em &quot;Nova Sessao&quot; para programar um filme em uma de suas salas com pre-populacao automatica de assentos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((sess) => {
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
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0F3460] text-[#E94560] border border-[#E94560]/30">
                          {sess.status}
                        </span>
                        <h2 className="text-lg font-bold text-white line-clamp-1">
                          {sess.film.title}
                        </h2>
                      </div>
                      <button
                        onClick={() => handleDeleteSession(sess)}
                        title="Cancelar / Excluir Sessao"
                        className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Clock className="w-4 h-4 text-[#E94560]" />
                        <span>
                          {formattedDate} as {formattedTime} ({sess.film.durationMinutes} min)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <LayoutGrid className="w-4 h-4 text-[#E94560]" />
                        <span>{sess.room.name}</span>
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
      </div>

      {/* Modal de Agendamento de Sessao */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-card rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#E94560]" />
                Agendar Nova Sessao
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
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

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                  Filme
                </label>
                <select
                  value={filmId}
                  onChange={(e) => setFilmId(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-4 py-2.5 text-sm text-white"
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
                  Sala de Exibicao
                </label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full liquid-glass-input rounded-xl px-4 py-2.5 text-sm text-white"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Data e Horario de Inicio
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
                    Preco do Ingresso (R$)
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

              <div className="p-3 bg-[#0F3460]/40 border border-[#0F3460] rounded-xl text-xs text-gray-300">
                <span className="font-semibold text-[#E94560]">Nota de Engenharia (ADR-007):</span> Ao confirmar, o sistema validara conflitos de sala e gerara atomicamente todos os assentos com status <code>AVAILABLE</code>.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-[#E94560] hover:bg-[#d63d56] text-white text-sm font-bold shadow-lg shadow-[#E94560]/30 transition-all disabled:opacity-50"
                >
                  {isPending ? "Agendando..." : "Criar Sessao"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
