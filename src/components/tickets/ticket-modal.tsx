"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Printer,
  Copy,
  Check,
  Ticket,
} from "lucide-react";
import { getCanonicalRoomName } from "@/shared/experiences";

export interface TicketVoucherData {
  id?: string;
  code: string;
  status: string;
  totalPrice?: number;
  totalAmount?: number;
  expiresAt?: string | Date | null;
  film?: {
    title: string;
    duration?: number;
    classification?: string;
    posterUrl?: string;
  };
  room?: {
    name: string;
  };
  session?: {
    startsAt: string | Date;
    price?: number;
  };
  seats?: Array<{
    id?: string;
    seatCode: string;
    row?: string;
    number?: number;
  }>;
  buyer?: {
    name: string;
    email?: string;
    cpfMasked?: string;
  };
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TicketVoucherData | null;
  /**
   * Se true, exibe modelo de ingresso final (emitido na bilheteria física / ingressos confirmados).
   * Se false, exibe comprovante/ingresso de reserva com prazo de retirada.
   */
  isFinalTicket?: boolean;
}

export function TicketModal({
  isOpen,
  onClose,
  data,
  isFinalTicket = false,
}: TicketModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fechar ao pressionar ESC e travar scroll do body
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const handleCopyCode = () => {
    if (!data.code) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sessionStartsAt = data.session?.startsAt ? new Date(data.session.startsAt) : null;
  const formattedSessionDate = sessionStartsAt
    ? sessionStartsAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : "Hoje";
  const formattedSessionTime = sessionStartsAt
    ? sessionStartsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "—";

  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  const formattedExpiresDate = expiresAt
    ? expiresAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : "";
  const formattedExpiresTime = expiresAt
    ? expiresAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "";

  const total = Number(data.totalPrice ?? data.totalAmount ?? 0);
  const seatsList = (data.seats || []).map((s) => s.seatCode).join(", ") || "—";
  const isConfirmed = data.status === "CONFIRMED";

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="liquid-glass-scrim z-[100] p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121624] text-slate-200 border border-white/15 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden font-sans my-auto cursor-default animate-in zoom-in-95 duration-150"
      >
        {/* Barra superior de controle */}
        <div className="p-4 sm:p-5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-cta" />
            <span className="font-bold text-white text-sm">
              {isFinalTicket ? "Ingresso CineDoom" : "Comprovante de Reserva"} • {data.code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Imprimir</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cabeçalho do Ingresso */}
        <div className="p-6 sm:p-7 bg-white/[0.02]">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                {isFinalTicket ? "CineDoom • Ingresso Oficial" : "CineDoom • Ingresso de Reserva"}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {data.film?.title || "Filme em Cartaz"}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {getCanonicalRoomName(data.room?.name || "Sala 01")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                {isFinalTicket ? "Status" : "Código"}
              </span>
              {isFinalTicket ? (
                <span
                  className={`inline-block mt-0.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isConfirmed
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {isConfirmed ? "Emitido" : "Aguardando Baixa"}
                </span>
              ) : (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">
                    {data.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    title="Copiar Código"
                    className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divisória com Picote de Ingresso */}
        <div className="relative py-2 bg-[#121624]">
          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0E1322] border-r border-white/15" />
          <div className="border-b-2 border-dashed border-white/15 mx-5" />
          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#0E1322] border-l border-white/15" />
        </div>

        {/* Corpo do Ingresso: Grid de Dados */}
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
                Assentos ({data.seats?.length || 0})
              </span>
              <p className="font-mono font-bold text-white tracking-wide">{seatsList}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Total
              </span>
              <p className="font-bold text-white text-sm">R$ {total.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                {isFinalTicket ? "Titular do Ingresso" : "Titular da Reserva"}
              </span>
              <p className="text-slate-200 font-medium">
                {data.buyer?.name || "Cliente CineDoom"}
                {data.buyer?.cpfMasked && (
                  <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                    ({data.buyer.cpfMasked})
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-0.5">
              {isFinalTicket ? (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Código de Validação
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-white">{data.code}</span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      title="Copiar Código"
                      className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Prazo de Pagamento
                  </span>
                  <p className="text-slate-300 font-medium">
                    {formattedExpiresDate
                      ? `Até ${formattedExpiresDate} às ${formattedExpiresTime}`
                      : "Até 1h antes da sessão"}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Mensagem / Instruções */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-400 leading-relaxed">
            {isFinalTicket ? (
              <span>
                Ingresso final emitido na bilheteria CineDoom. Apresente este bilhete impresso ou no celular na entrada da sala para validação do leitor.
              </span>
            ) : (
              <span>
                Apresente o código <strong className="font-mono text-white">{data.code}</strong> na bilheteria física para pagamento presencial e emissão dos ingressos antes do prazo limite.
              </span>
            )}
          </div>
        </div>

        {/* Rodapé com Fechamento */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modalContent, document.body) : modalContent;
}

