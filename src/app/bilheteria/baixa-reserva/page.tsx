"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Ticket, Search, CheckCircle, ShieldAlert } from "lucide-react";

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
    <main className="min-h-screen bg-gradient-to-b from-primary via-darkBg to-primary text-white">
      <header className="border-b border-borderDark/40 liquid-glass-card">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cta flex items-center justify-center font-bold shadow-lg shadow-cta/20">
              CD
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider">BAIXA PRESENCIAL DE RESERVA</h1>
              <p className="text-xs text-slate-400">Bilheteria - Atendente/Gerente</p>
            </div>
          </div>
          <Link href="/" className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-colors">
            Início
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Código da reserva"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="flex-1 px-4 py-2.5 rounded-xl liquid-glass-input text-white placeholder-slate-500"
          />
          <button
            onClick={buscar}
            disabled={loading || !code}
            className="px-5 py-2.5 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold shadow-lg shadow-cta/25 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            <Search className="w-4 h-4" />
            Buscar
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        {reservation && (
          <div className="rounded-2xl liquid-glass-card p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-cta" />
              <h2 className="text-lg font-bold">Reserva {reservation.code}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/40 border border-secondary">
                {reservation.status}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
              <div>
                <p className="text-slate-400">Filme</p>
                <p>{reservation.session?.film?.title}</p>
              </div>
              <div>
                <p className="text-slate-400">Sala</p>
                <p>{reservation.session?.room?.name}</p>
              </div>
              <div>
                <p className="text-slate-400">Sessão</p>
                <p>{new Date(reservation.session?.startsAt).toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-slate-400">Comprador</p>
                <p>{reservation.buyerName}</p>
                <p className="text-xs text-slate-500">{reservation.buyerEmail}</p>
              </div>
              <div>
                <p className="text-slate-400">Assentos</p>
                <p>{reservation.sessionSeats?.map((s: any) => s.seat?.seatCode).join(", ")}</p>
              </div>
              <div>
                <p className="text-slate-400">Valor Total</p>
                <p>R$ {Number(reservation.totalPrice).toFixed(2)}</p>
              </div>
            </div>
            {reservation.status === "PENDING" && (
              <button
                onClick={confirmar}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all"
              >
                Confirmar Pagamento Presencial (Gerar Ingressos)
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
