"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  UserX,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  FileText,
  Lock,
  Ticket,
  AlertTriangle,
} from "lucide-react";
import { AuthProfileMenu } from "@/components/auth-profile-menu";

interface TitularData {
  id: string;
  name: string;
  email: string;
  cpfMasked: string;
  isAnonymized: boolean;
  anonymizedAt: string | null;
  lgpdConsentAt: string;
  ticketsCount: number;
}

export default function ComplianceTitularesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [titular, setTitular] = useState<TitularData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState(
    "Solicitação de anonimização e exclusão de dados pessoais com base no Art. 18 da LGPD."
  );

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setStatusMessage(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/titulares?cpf=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTitular(data);
      } else {
        const err = await res.json().catch(() => null);
        setTitular(null);
        setStatusMessage({
          type: "error",
          text: err?.error || "Comprador nao localizado para o CPF informado.",
        });
      }
    } catch {
      setTitular(null);
      setStatusMessage({
        type: "error",
        text: "Erro de comunicacao ao buscar titular de dados.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymize = async () => {
    if (!titular) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/titulares/anonimizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerId: titular.id,
            reason: reason.trim(),
          }),
        });

        if (res.ok) {
          const result = await res.json();
          setStatusMessage({
            type: "success",
            text: `Dados do titular anonimizados com sucesso! ${result.ticketsPreserved} ingresso(s) preservados para cumprimento das obrigações fiscais do CDC.`,
          });
          setIsModalOpen(false);

          // Atualiza dados na tela
          setTitular((prev) =>
            prev
              ? {
                  ...prev,
                  name: "[DADO PESSOAL ANONIMIZADO - LGPD ART. 18]",
                  email: "anonimizado@lgpd.cinedoom.local",
                  cpfMasked: "***.***.***-**",
                  isAnonymized: true,
                  anonymizedAt: new Date().toISOString(),
                }
              : null
          );
        } else {
          const err = await res.json().catch(() => null);
          setStatusMessage({
            type: "error",
            text: err?.error || "Falha ao processar anonimizacao do titular.",
          });
        }
      } catch {
        setStatusMessage({
          type: "error",
          text: "Erro de conexao ao solicitar anonimizacao.",
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 liquid-glass-card border-x-0 border-t-0 rounded-none text-white shadow-2xl">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/gestao"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-cta/15 text-cta border border-cta/30 flex items-center justify-center shadow-lg shadow-cta/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Compliance LGPD — Art. 18</h1>
              <p className="text-xs text-slate-400">
                Atendimento aos direitos dos titulares e anonimização de dados pessoais
              </p>
            </div>
          </div>

          <AuthProfileMenu />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        {/* Banner de Feedback */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm shadow-md border ${
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Card Informativo ADR-009 */}
        <div className="liquid-glass-card p-6 rounded-2xl shadow-xl flex items-start gap-4 border border-sky-500/20 bg-sky-950/20">
          <div className="p-2.5 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-xl shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-xs leading-relaxed text-slate-300 space-y-1.5">
            <p className="font-bold text-white text-sm">
              Direito de Eliminação e Anonimização (Art. 18, Inciso VI da LGPD)
            </p>
            <p className="text-slate-400">
              Ao receber uma solicitação do titular, a anonimização substitui o nome,
              e-mail e dados do CPF por valores anônimos irreversíveis. O registro da compra
              é mantido de forma desidentificada para atender às exigências fiscais e contábeis
              do Código de Defesa do Consumidor (Art. 27 — guarda contábil por 5 anos).
            </p>
          </div>
        </div>

        {/* Barra de Busca de Titular */}
        <div className="liquid-glass-card p-6 rounded-2xl shadow-xl space-y-4 border border-white/10">
          <h2 className="text-sm font-bold text-white">
            Localizar Titular para Atendimento de Direitos
          </h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Informe o CPF do titular (ex: 123.456.789-00 ou 12345678900)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none border-borderDark focus:border-cta"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="bg-cta hover:bg-cta-hover text-white px-5 py-2.5 text-sm font-bold rounded-xl shadow-lg shadow-cta/25 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isLoading ? "Buscando..." : "Buscar Titular"}
            </button>
          </form>
        </div>

        {/* Resultado da Busca */}
        {titular && (
          <div className="liquid-glass-card rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-in fade-in duration-150">
            <div className="bg-[#12182B] border-b border-borderDark px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Registro Cadastral do Titular</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {titular.id}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                  titular.isAnonymized
                    ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                    : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    titular.isAnonymized ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
                  }`}
                />
                {titular.isAnonymized ? "Anonimizado (LGPD Art. 18)" : "Ativo no Sistema"}
              </span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    Nome Completo
                  </span>
                  <span className="font-semibold text-white">{titular.name}</span>
                </div>

                <div className="p-4 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    E-mail Cadastrado
                  </span>
                  <span className="font-mono text-slate-300 text-xs">{titular.email}</span>
                </div>

                <div className="p-4 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    CPF (Exibição Mascarada)
                  </span>
                  <span className="font-mono font-bold text-white">{titular.cpfMasked}</span>
                </div>

                <div className="p-4 bg-[#0A0E1A] rounded-xl border border-borderDark/60">
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    Data do Consentimento LGPD
                  </span>
                  <span className="text-slate-300">
                    {new Date(titular.lgpdConsentAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Informações Fiscais do CDC */}
              <div className="p-4 bg-sky-950/20 border border-sky-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-lg">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {titular.ticketsCount} Ingressos Vinculados
                    </span>
                    <p className="text-xs text-slate-400">
                      Preservados para cumprimento de auditoria contábil e fiscal de 5 anos (CDC Art. 27).
                    </p>
                  </div>
                </div>
              </div>

              {/* Ação de Anonimização */}
              <div className="pt-4 border-t border-borderDark/60 flex items-center justify-end">
                {titular.isAnonymized ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/60 px-4 py-2.5 rounded-xl border border-amber-500/30">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>
                      Dados já anonimizados em{" "}
                      {titular.anonymizedAt
                        ? new Date(titular.anonymizedAt).toLocaleString("pt-BR")
                        : "data anterior"}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-cta hover:bg-cta-hover text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cta/25 transition-all"
                  >
                    <UserX className="w-4 h-4" />
                    <span>Anonimizar Dados Pessoais (Art. 18)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {hasSearched && !isLoading && !titular && (
          <div className="liquid-glass-card p-12 text-center rounded-2xl border border-white/10 text-slate-400 text-sm">
            Nenhum comprador encontrado com os dados informados para este cinema.
          </div>
        )}
      </main>

      {/* Modal de Confirmação de Anonimização */}
      {isModalOpen && titular && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-card bg-[#161F36] rounded-3xl shadow-2xl w-full max-w-md border border-borderDark overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4.5 flex items-center justify-between border-b border-borderDark/60">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-base text-white">Confirmar Anonimização LGPD</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-950/50 border border-amber-500/30 rounded-xl text-amber-200 text-xs leading-relaxed space-y-1">
                <p className="font-bold text-amber-300">Ação Irreversível (Art. 18 da LGPD):</p>
                <p>
                  O nome, e-mail e dados de identificação do titular{" "}
                  <span className="font-bold text-white">{titular.name}</span> serão substituídos por valores
                  anônimos irreversíveis. O histórico de ingressos e registros fiscais permanecerá preservado para fins de conformidade legal.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Justificativa / Protocolo de Atendimento
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Informe o protocolo ou motivo da solicitação..."
                  className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-borderDark/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAnonymize}
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-900/30 disabled:opacity-50 transition-all"
                >
                  {isPending ? "Anonimizando..." : "Confirmar Anonimização"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
