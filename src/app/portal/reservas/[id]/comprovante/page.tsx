"use client";

import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { getRoomWithExperience } from "@/shared/experiences";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Printer,
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
      <div className="min-h-screen bg-[#0E1322] text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold">Reserva Não Encontrada</h2>
          <p className="text-xs text-slate-400">{errorNotice || "Identificador inválido."}</p>
          <Link
            href="/portal/minhas-reservas"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Minhas Reservas
          </Link>
        </div>
      </div>
    );
  }

  const sessionStartsAt = new Date(voucher.session.startsAt);
  const expiresAt = new Date(voucher.expiresAt);

  const formattedSessionDate = sessionStartsAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
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
      <div className="flex-1 max-w-2xl mx-auto w-full space-y-5 sm:space-y-6 py-6 sm:py-8 px-3 sm:px-4">
        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Link
            href="/portal/minhas-reservas"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Minhas Reservas</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Imprimir Ingresso</span>
          </button>
        </div>

        {/* Ingresso Típico de Cinema (Cinema Ticket Stub) */}
        <div className="relative bg-[#121624] text-slate-200 rounded-3xl border border-white/15 shadow-2xl overflow-hidden font-sans">
          {/* Cabeçalho do Ingresso */}
          <div className="p-6 sm:p-7 bg-white/[0.03] border-b border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                  CineDoom • Ingresso de Reserva
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {voucher.film.title}
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  {getRoomWithExperience(voucher.room.name)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Código
                </span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">
                    {voucher.code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    title="Copiar Código"
                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Divisória com Picote de Ingresso (Dashed Perforation & Notches) */}
          <div className="relative py-2 bg-[#121624]">
            {/* Picote circular esquerdo */}
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0E1322] border-r border-white/15" />
            {/* Linha pontilhada de picote */}
            <div className="border-b-2 border-dashed border-white/15 mx-5" />
            {/* Picote circular direito */}
            <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0E1322] border-l border-white/15" />
          </div>

          {/* Corpo do Ingresso: Grid de Dados Essenciais */}
          <div className="p-6 sm:p-7 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Data
                </span>
                <p className="font-semibold text-white capitalize">{formattedSessionDate}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Horário
                </span>
                <p className="font-semibold text-white">{formattedSessionTime}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Assentos
                </span>
                <p className="font-mono font-bold text-white tracking-wide">
                  {voucher.seats.map((s) => s.seatCode).join(", ")}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Total
                </span>
                <p className="font-semibold text-white">R$ {voucher.totalPrice.toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Titular da Reserva
                </span>
                <p className="text-slate-300 font-medium">{voucher.buyer.name}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Prazo de Pagamento
                </span>
                <p className="text-slate-300 font-medium">
                  Até {formattedExpiresDate} às {formattedExpiresTime}
                </p>
              </div>
            </div>

            {/* Aviso Neutro e Conciso */}
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-400 leading-relaxed">
              Apresente o código <strong className="font-mono text-white">{voucher.code}</strong> na bilheteria física para pagamento e emissão dos ingressos antes do prazo limite.
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Oficial Padronizado (Versão simples) */}
      <CineDoomFooter simple />
    </div>
  );
}
