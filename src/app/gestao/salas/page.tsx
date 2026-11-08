"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  Users,
  Eye,
} from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";

interface SeatItem {
  id: string;
  rowLabel: string;
  columnNumber: number;
  seatCode: string;
}

interface RoomItem {
  id: string;
  name: string;
  capacity: number;
  layoutMetadata?: {
    rows: number;
    columns: number;
    totalSeats: number;
  } | null;
  seats?: SeatItem[];
  _count?: {
    seats: number;
    sessions: number;
  };
}

interface FormErrors {
  name?: string;
  rows?: string;
  columns?: string;
  general?: string;
}

export default function SalasGestãoPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRoomPreview, setSelectedRoomPreview] = useState<RoomItem | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [rows, setRows] = useState(8);
  const [columns, setColumns] = useState(10);
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/salas");
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Falha ao carregar lista de salas.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const openCreateModal = () => {
    setName("");
    setRows(8);
    setColumns(10);
    setErrors({});
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setErrors({});
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      name: name.trim(),
      rows: Number(rows),
      columns: Number(columns),
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/salas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.status === 201) {
          setStatusMessage({
            type: "success",
            text: `Sala "${payload.name}" criada com sucesso! ${payload.rows * payload.columns} assentos gerados.`,
          });
          closeCreateModal();
          fetchRooms();
          return;
        }

        if (res.status === 422) {
          const errData = await res.json();
          const fieldErrors: FormErrors = {};
          if (Array.isArray(errData.errors)) {
            errData.errors.forEach((err: { field: string; message: string }) => {
              if (err.field === "name") fieldErrors.name = err.message;
              else if (err.field === "rows") fieldErrors.rows = err.message;
              else if (err.field === "columns") fieldErrors.columns = err.message;
              else fieldErrors.general = err.message;
            });
          }
          setErrors(fieldErrors);
          return;
        }

        const errJson = await res.json().catch(() => null);
        setErrors({ general: errJson?.error || "Erro ao cadastrar sala." });
      } catch {
        setErrors({ general: "Erro de conexão com o servidor." });
      }
    });
  };

  const handleDeleteRoom = async (room: RoomItem) => {
    if (
      !confirm(
        `Deseja realmente excluir a sala "${room.name}" e todas as suas poltronas? Esta operação é irreversível.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/salas/${room.id}`, {
        method: "DELETE",
      });

      if (res.status === 204) {
        setStatusMessage({
          type: "success",
          text: `Sala "${room.name}" excluída com sucesso.`,
        });
        fetchRooms();
      } else {
        const errJson = await res.json().catch(() => null);
        setStatusMessage({
          type: "error",
          text: errJson?.error || "Não foi possível excluir a sala.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Erro ao comunicar com o servidor.",
      });
    }
  };

  const handleViewLayout = async (room: RoomItem) => {
    try {
      const res = await fetch(`/api/salas/${room.id}`);
      if (res.ok) {
        const roomData = await res.json();
        setSelectedRoomPreview(roomData);
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Erro ao carregar mapa de assentos da sala.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Header Oficial CineDoom */}
      <CineDoomHeader activePage="gestao" />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
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
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Salas e Disposição de Assentos</h1>
              <p className="text-xs text-slate-400">
                Gerenciamento físico das salas e geração automática da matriz de poltronas
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-cta hover:bg-cta-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-cta/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Sala</span>
          </button>
        </div>
        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl border text-sm shadow-md ${
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-cta border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Carregando salas do cinema...
            </div>
          ) : rooms.length === 0 ? (
            <div className="col-span-full liquid-glass-card p-12 rounded-3xl text-center border border-white/10">
              <LayoutGrid className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <p className="font-semibold text-base text-white">
                Nenhuma sala cadastrada no sistema.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Clique no botão &ldquo;Nova Sala&rdquo; acima para configurar o layout da primeira sala.
              </p>
            </div>
          ) : (
            rooms.map((room) => {
              const rowsCount = room.layoutMetadata?.rows || Math.ceil(room.capacity / 10);
              const colsCount = room.layoutMetadata?.columns || 10;

              return (
                <div
                  key={room.id}
                  className="liquid-glass-card rounded-3xl shadow-xl hover:shadow-2xl hover:border-cta/50 transition-all p-6 flex flex-col justify-between border border-white/10 group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="font-bold text-white text-lg group-hover:text-cta transition-colors">{room.name}</h2>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                          <Users className="w-3.5 h-3.5 text-cta" />
                          <span>Capacidade: <strong className="text-white">{room.capacity} poltronas</strong></span>
                        </div>
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/5 text-slate-300 border border-white/10">
                        {rowsCount} × {colsCount}
                      </span>
                    </div>

                    {/* Mini layout preview diagram */}
                    <div className="my-5 p-4 bg-[#0A0E1A]/80 rounded-2xl border border-borderDark/60">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-center text-slate-400 mb-2.5 border-b border-borderDark/60 pb-1.5">
                        Tela de Projeção
                      </div>
                      <div className="grid gap-1 justify-center" style={{ gridTemplateColumns: `repeat(${Math.min(colsCount, 12)}, minmax(0, 1fr))` }}>
                        {Array.from({ length: Math.min(room.capacity, 36) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 rounded-xs bg-[#22C55E]/80 border border-[#22C55E]"
                          />
                        ))}
                      </div>
                      {room.capacity > 36 && (
                        <p className="text-[10px] text-center text-slate-400 mt-2.5">
                          + {room.capacity - 36} assentos configurados
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-borderDark/60 flex items-center justify-between">
                    <button
                      onClick={() => handleViewLayout(room)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Mapa Completo</span>
                    </button>

                    <button
                      onClick={() => handleDeleteRoom(room)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Modal: Nova Sala com Visual Seating Matrix Preview */}
      {isCreateModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="liquid-glass-card bg-[#161F36] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-borderDark animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="px-6 py-4.5 flex items-center justify-between border-b border-borderDark/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cta/15 text-cta flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base text-white">Cadastrar Nova Sala</h2>
              </div>
              <button
                onClick={closeCreateModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-6 space-y-6">
              {errors.general && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Informações Básicas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome da Sala <span className="text-cta">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Sala 1 VIP"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none"
                  />
                  {errors.name && (
                    <p className="text-rose-400 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Fileiras (Letras A-Z) <span className="text-cta">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={26}
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none"
                  />
                  {errors.rows && (
                    <p className="text-rose-400 text-xs mt-1">{errors.rows}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Poltronas por Fileira <span className="text-cta">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={30}
                    value={columns}
                    onChange={(e) => setColumns(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none"
                  />
                  {errors.columns && (
                    <p className="text-rose-400 text-xs mt-1">{errors.columns}</p>
                  )}
                </div>
              </div>

              {/* Live Interactive Preview */}
              <div className="bg-[#0A0E1A] p-5 rounded-2xl border border-borderDark text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pré-visualização da Planta Física
                  </span>
                  <span className="text-xs font-semibold bg-cta/15 text-cta px-3 py-1 rounded-full border border-cta/30">
                    Total: {rows * columns} assentos
                  </span>
                </div>

                {/* Projection Screen */}
                <div className="w-3/4 mx-auto py-1.5 mb-6 text-center text-[10px] font-bold tracking-widest bg-[#12182B] border-b-2 border-cta text-slate-300 rounded-t-lg shadow-md">
                  TELA DE PROJEÇÃO
                </div>

                {/* Seat Matrix Grid */}
                <div className="overflow-x-auto max-h-64 py-2">
                  <div className="flex flex-col gap-1.5 items-center min-w-max">
                    {Array.from({ length: Math.min(rows, 26) }).map((_, rIdx) => {
                      const rowLetter = String.fromCharCode(65 + rIdx);
                      return (
                        <div key={rowLetter} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 w-4 text-center">
                            {rowLetter}
                          </span>
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(columns, 30) }).map((_, cIdx) => (
                              <div
                                key={cIdx}
                                className="w-5 h-5 rounded-xs bg-[#22C55E]/80 border border-[#22C55E] flex items-center justify-center text-[8px] font-semibold text-gray-900 shadow-xs"
                                title={`${rowLetter}${cIdx + 1}`}
                              >
                                {cIdx + 1}
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 w-4 text-center">
                            {rowLetter}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-borderDark/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-cta hover:bg-cta-hover rounded-xl shadow-lg shadow-cta/25 disabled:opacity-50 transition-all"
                >
                  {isPending ? "Criando Sala..." : "Criar Sala & Gerar Assentos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Layout Completo */}
      {selectedRoomPreview && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRoomPreview(null);
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="liquid-glass-card bg-[#161F36] rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-borderDark animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="px-6 py-4.5 flex items-center justify-between border-b border-borderDark/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cta/15 text-cta flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base text-white">
                  Planta Física: {selectedRoomPreview.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRoomPreview(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-300 bg-[#0A0E1A] p-4 rounded-xl border border-borderDark/60 gap-2">
                <span>Capacidade total da sala: <strong className="text-white font-bold">{selectedRoomPreview.seats?.length || selectedRoomPreview.capacity} poltronas</strong></span>
                <span>Status das poltronas: <strong className="text-emerald-400 font-bold">Disponíveis para sessões</strong></span>
              </div>

              <div className="bg-[#0A0E1A] p-6 rounded-2xl border border-borderDark/60 text-white">
                <div className="w-3/4 mx-auto py-2 mb-8 text-center text-xs font-bold tracking-widest bg-[#12182B] border-b-2 border-cta text-slate-300 rounded-t-lg shadow-md">
                  TELA DE PROJEÇÃO
                </div>

                <div className="overflow-x-auto max-h-96 py-2">
                  <div className="flex flex-col gap-2 items-center min-w-max">
                    {/* Renderiza assentos agrupados por rowLabel */}
                    {Object.entries(
                      (selectedRoomPreview.seats || []).reduce<Record<string, SeatItem[]>>(
                        (acc, seat) => {
                          acc[seat.rowLabel] = acc[seat.rowLabel] || [];
                          acc[seat.rowLabel].push(seat);
                          return acc;
                        },
                        {}
                      )
                    ).map(([row, rowSeats]) => (
                      <div key={row} className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-500 w-4 text-center">
                          {row}
                        </span>
                        <div className="flex gap-1.5">
                          {rowSeats
                            .sort((a, b) => a.columnNumber - b.columnNumber)
                            .map((seat) => (
                              <div
                                key={seat.id}
                                className="w-7 h-7 rounded-lg bg-[#22C55E]/90 text-gray-900 font-bold text-[10px] flex items-center justify-center shadow-xs"
                                title={`Assento ${seat.seatCode}`}
                              >
                                {seat.columnNumber}
                              </div>
                            ))}
                        </div>
                        <span className="text-xs font-bold text-slate-500 w-4 text-center">
                          {row}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedRoomPreview(null)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
