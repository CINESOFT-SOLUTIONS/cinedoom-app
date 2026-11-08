"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Ticket, Search, CheckCircle, ShieldAlert } from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";

export default function BaixaReservaPage() {
  const [code, setCode] = useState("");
  const [reservation, setReservation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function buscar() {
    setError(null);
    setSuccess(null);
    setReservation(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/bilheteria/reservas/buscar?codigo=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reserva nao encontrada");
      } else {
        setReservation(data);
      }
    } catch {
      setError("Falha ao buscar reserva");
    } finally {
      setLoading(false);
    }
  }

  async function confirmar() {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/bilheteria/reservas/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao confirmar pagamento");
      } else {
        setSuccess(data.message);
        setReservation((r: any) => ({ ...r, status: "CONFIRMED" }));
      }
    } catch {
      setError("Falha ao confirmar pagamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Header Oficial CineDoom */}
      <CineDoomHeader activePage="baixa-reserva" />

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6 flex-1 w-full">
        {/* Barra de Título */}
        <div className="flex items-center gap-3 pb-2">
          <Link
            href="/bilheteria"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Voltar à Bilheteria"
          >
            <Ticket className="w-5 h-5 text-cta" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Baixa Presencial de Reserva</h1>
            <p className="text-xs text-slate-400">Bilheteria · Confirmação presencial e emissão de ingressos</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <input
            type="text"
            placeholder="Informe o código da reserva (ex: RES-12345)..."
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-3 rounded-xl liquid-glass-input text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none text-sm"
          />
          <button
            onClick={buscar}
            disabled={loading || !code}
            className="px-6 py-3 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold shadow-lg shadow-cta/25 disabled:opacity-50 flex items-center gap-2 transition-all shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>Buscar Reserva</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2.5 shadow-md">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2.5 shadow-md">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {reservation && (
          <div className="rounded-3xl liquid-glass-card p-6 sm:p-8 space-y-6 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between border-b border-borderDark/60 pb-4">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-5 h-5 text-cta" />
                <h2 className="text-lg font-bold text-white">Reserva {reservation.code}</h2>
              </div>
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                  reservation.status === "CONFIRMED"
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-950/60 text-amber-300 border-amber-500/30"
                }`}
              >
                {reservation.status === "CONFIRMED" ? "PAGA / CONFIRMADA" : reservation.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Filme</p>
                <p className="font-bold text-white">{reservation.session?.film?.title}</p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Sala</p>
                <p className="font-bold text-white">{reservation.session?.room?.name}</p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Horário da Sessão</p>
                <p className="font-bold text-white">
                  {new Date(reservation.session?.startsAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Comprador</p>
                <p className="font-bold text-white">{reservation.buyerName}</p>
                <p className="text-xs text-slate-400">{reservation.buyerEmail}</p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Poltronas</p>
                <p className="font-bold text-cta">
                  {reservation.sessionSeats?.map((s: any) => s.seat?.seatCode).join(", ")}
                </p>
              </div>
              <div className="p-3.5 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                <p className="text-xs font-medium text-slate-400 mb-1">Valor Total</p>
                <p className="text-lg font-black text-emerald-400">
                  R$ {Number(reservation.totalPrice).toFixed(2)}
                </p>
              </div>
            </div>

            {reservation.status === "PENDING" && (
              <button
                onClick={confirmar}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all text-white flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Confirmar Pagamento Presencial (Emitir Ingressos)</span>
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
