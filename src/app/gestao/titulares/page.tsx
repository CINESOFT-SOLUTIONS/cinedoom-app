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
            text: `Dados do titular anonimizados com sucesso! ${result.ticketsPreserved} ingresso(s) preservados para cumprimento do CDC (ADR-009).`,
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
    <div className="min-h-screen bg-[#F5F5F5] text-[#2D2D2D] font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 liquid-glass-card border-x-0 border-t-0 rounded-none text-white shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/gestao"
              className="p-2 rounded hover:bg-white/10 text-gray-300 transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 bg-[#E94560]/20 rounded text-[#E94560]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Compliance LGPD — Art. 18</h1>
              <p className="text-xs text-gray-400">
                Atendimento aos direitos dos titulares e anonimização in-place (ADR-009 / TASK-14)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Banner de Feedback */}
        {statusMessage && (
          <div
            className={`p-4 rounded-md flex items-center justify-between gap-3 text-sm shadow-xs border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Card Informativo ADR-009 */}
        <div className="liquid-glass-card-light p-6 rounded-2xl shadow-sm flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded shrink-0 mt-0.5">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-xs leading-relaxed text-gray-600 space-y-1">
            <p className="font-semibold text-gray-800 text-sm">
              Direito de Eliminação e Anonimização (Art. 18, Inciso VI da LGPD)
            </p>
            <p>
              Ao receber uma solicitação do titular, a anonimização in-place substitui o nome,
              e-mail e hash do CPF por valores anônimos irreversíveis. O registro do comprador
              mantém seu identificador interno íntegro para preservar as foreign keys fiscais
              exigidas pelo Código de Defesa do Consumidor (Art. 27 — guarda contábil por 5 anos).
            </p>
          </div>
        </div>

        {/* Barra de Busca de Titular */}
        <div className="liquid-glass-card-light p-6 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-800">
            Localizar Titular para Atendimento de Direitos
          </h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Informe o CPF do titular (ex: 123.456.789-00 ou 12345678900)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm liquid-glass-input-light rounded-xl focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="bg-[#1A1A2E] hover:bg-[#161626] text-white px-5 py-2.5 text-sm font-semibold rounded-md shadow disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Buscando..." : "Buscar Titular"}
            </button>
          </form>
        </div>

        {/* Resultado da Busca */}
        {titular && (
          <div className="liquid-glass-card-light rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-150">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900">Registro Cadastral do Titular</h3>
                <p className="text-xs text-gray-500 font-mono">ID: {titular.id}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                  titular.isAnonymized
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    titular.isAnonymized ? "bg-amber-600" : "bg-emerald-600"
                  }`}
                />
                {titular.isAnonymized ? "Anonimizado (LGPD Art. 18)" : "Ativo no Sistema"}
              </span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">
                    Nome Completo
                  </span>
                  <span className="font-semibold text-gray-800">{titular.name}</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">
                    E-mail Cadastrado
                  </span>
                  <span className="font-mono text-gray-800 text-xs">{titular.email}</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">
                    CPF (Exibição Mascarada)
                  </span>
                  <span className="font-mono font-bold text-gray-800">{titular.cpfMasked}</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 block mb-1">
                    Data do Consentimento LGPD
                  </span>
                  <span className="text-gray-800">
                    {new Date(titular.lgpdConsentAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Informações Fiscais do CDC */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">
                      {titular.ticketsCount} Ingressos Vinculados
                    </span>
                    <p className="text-xs text-gray-600">
                      Preservados para cumprimento de auditoria contábil e fiscal de 5 anos (CDC Art. 27).
                    </p>
                  </div>
                </div>
              </div>

              {/* Ação de Anonimização */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end">
                {titular.isAnonymized ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 px-4 py-2.5 rounded-md border border-amber-200">
                    <Lock className="w-4 h-4 text-amber-600" />
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
                    className="flex items-center gap-2 bg-[#E94560] hover:bg-[#d63d56] text-white text-sm font-semibold px-5 py-2.5 rounded-md shadow transition-colors"
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
          <div className="bg-white p-12 text-center rounded-lg border border-gray-200 text-gray-500 text-sm">
            Nenhum comprador encontrado com os dados informados para este cinema.
          </div>
        )}
      </main>

      {/* Modal de Confirmação de Anonimização */}
      {isModalOpen && titular && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#1A1A2E] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-base">Confirmar Anonimização LGPD</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-xs leading-relaxed space-y-1">
                <p className="font-bold">Ação Irreversível (Art. 18 da LGPD):</p>
                <p>
                  O nome, e-mail e hash de busca do titular{" "}
                  <span className="font-bold">{titular.name}</span> serão substituídos por valores
                  anônimos. As chaves de vendas e ingressos serão preservadas intactas sem quebra de
                  integridade referencial (ADR-009).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Justificativa / Protocolo de Atendimento
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560]"
                />
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAnonymize}
                  disabled={isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md shadow disabled:opacity-50"
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
