"use client";

import { CineDoomHeader } from "@/components/cinedoom-header";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Printer,
  Film,
  User,
  ShieldCheck,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";

interface ReservationVoucher {
  id: string;
  code: string;
  status: string;
  totalPrice: number;
  expiresAt: string;
  film: {
    title: string;
    duration: number;
    classification?: string;
    posterUrl?: string;
  };
  room: {
    name: string;
  };
  session: {
    startsAt: string;
    price: number;
  };
  seats: Array<{
    id: string;
    seatCode: string;
    row: string;
    number: number;
  }>;
  buyer: {
    name: string;
    email: string;
    cpfMasked?: string;
  };
  instructions: string;
}

export default function ReservationComprovantePage() {
  const params = useParams();
  const router = useRouter();
  const reservationId = params.id as string;

  const [voucher, setVoucher] = useState<ReservationVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVoucher() {
      try {
        const res = await fetch(`/api/portal/reservas/${reservationId}`);
        if (res.ok) {
          const data: ReservationVoucher = await res.json();
          setVoucher(data);
        } else {
          setErrorNotice("Comprovante de reserva não encontrado.");
        }
      } catch (err) {
        console.error("Erro ao carregar voucher:", err);
        setErrorNotice("Erro ao conectar ao servidor.");
      } finally {
        setLoading(false);
      }
    }
    if (reservationId) {
      fetchVoucher();
    }
  }, [reservationId]);

  const handleCopyCode = () => {
    if (!voucher) return;
    navigator.clipboard.writeText(voucher.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F1B] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400">Carregando voucher da reserva...</p>
        </div>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="min-h-screen bg-[#0F0F1B] text-white flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 text-[#E94560] mx-auto" />
          <h2 className="text-2xl font-black">Reserva Não Encontrada</h2>
          <p className="text-xs text-gray-400">{errorNotice || "Identificador inválido."}</p>
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E94560] text-white font-bold text-xs shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Portal
          </Link>
        </div>
      </div>
    );
  }

  const sessionStartsAt = new Date(voucher.session.startsAt);
  const expiresAt = new Date(voucher.expiresAt);

  const formattedSessionDate = sessionStartsAt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const formattedSessionTime = sessionStartsAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedExpiresTime = expiresAt.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const formattedExpiresDate = expiresAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      <CineDoomHeader activePage="nenhum" />
      <div className="flex-1 max-w-2xl mx-auto w-full space-y-6 py-8 px-4">
        {/* Top Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/portal"
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à Programação
          </Link>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1A1A32] hover:bg-[#252548] text-xs font-semibold text-gray-200 border border-gray-700/60 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-gray-400" />
            Imprimir Comprovante
          </button>
        </div>

        {/* Success Card */}
        <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#E94560] to-[#533483]" />

          {/* Header Status */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white">Reserva Confirmada com Sucesso!</h1>
            <p className="text-xs text-gray-400">
              Seus assentos estão garantidos até 1 hora antes do início da sessão.
            </p>
          </div>

          {/* Prominent Reservation Code Box */}
          <div className="bg-white/[0.04] backdrop-blur-md border-2 border-dashed border-[#E94560]/60 rounded-2xl p-5 text-center space-y-2 shadow-inner">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
              Código Identificador da Reserva
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl sm:text-4xl font-mono font-black text-white tracking-widest">
                {voucher.code}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copiar Código"
                className="p-2 rounded-xl bg-[#28284A] hover:bg-[#343460] text-gray-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-amber-300 font-medium">
              Apresente este código na bilheteria física para efetuar o pagamento.
            </p>
          </div>

          {/* Critical Payment Deadline Warning */}
          <div className="bg-amber-950/50 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-300 block">
                Prazo Limite para Pagamento Presencial:
              </span>
              <p className="leading-relaxed">
                Você deve comparecer à bilheteria e quitar a reserva até{" "}
                <strong>{formattedExpiresDate} às {formattedExpiresTime}</strong> (1 hora antes do início do filme). Após esse horário, os assentos serão liberados automaticamente para o balcão (Critério AC-14).
              </p>
            </div>
          </div>

          {/* Session & Seats Details */}
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
              <Film className="w-4 h-4 text-[#E94560]" />
              <div className="flex-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Filme</span>
                <span className="font-bold text-white text-sm">{voucher.film.title}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Sessão</span>
                <span className="font-medium text-gray-200">
                  {formattedSessionDate} às {formattedSessionTime}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Sala</span>
                <span className="font-bold text-white">Sala {voucher.room.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Assentos</span>
                <span className="font-black text-[#E94560] text-sm">
                  {voucher.seats.map((s) => s.seatCode).join(", ")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Titular</span>
                <span className="font-medium text-gray-200">{voucher.buyer.name}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 text-sm font-black">
              <span className="text-gray-300">Total a Pagar no Balcão:</span>
              <span className="text-xl text-emerald-400">R$ {voucher.totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/portal/minhas-reservas"
              className="flex-1 py-3 rounded-xl bg-[#22223D] hover:bg-[#2C2C4E] border border-gray-700 text-center text-xs font-bold text-gray-200 transition-colors"
            >
              Acessar Minhas Reservas
            </Link>
            <Link
              href="/portal"
              className="flex-1 py-3 rounded-xl bg-[#E94560] hover:bg-[#d63d56] text-center text-xs font-black text-white shadow-lg shadow-[#E94560]/30 transition-all"
            >
              Voltar ao Catálogo de Filmes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
