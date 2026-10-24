"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Film, UserPlus, ShieldAlert, CheckCircle } from "lucide-react";

export default function PortalCadastroPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    cpf: "",
    tenantId: "",
    lgpdConsent: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/portal/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Erro ao cadastrar cliente");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Falha ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary via-darkBg to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-borderDark rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block group">
            <div className="relative h-12 w-48 mx-auto transition-transform group-hover:scale-105">
              <Image
                src="/logos/cinedoom-logo-horizontal-color.png"
                alt="CineDoom"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <p className="text-xs text-slate-400">Cadastro de Espectador no CineDoom</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Cadastro realizado com sucesso! Já é possível fazer login.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Nome completo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-darkBg border border-borderDark text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cta"
            />
            <input
              type="email"
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-darkBg border border-borderDark text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cta"
            />
            <input
              type="password"
              placeholder="Senha (mín. 6 caracteres)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-darkBg border border-borderDark text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cta"
            />
            <input
              type="text"
              placeholder="CPF (apenas números ou formatado)"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-darkBg border border-borderDark text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cta"
            />
            <input
              type="text"
              placeholder="Tenant ID (UUID)"
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              required
              className="md:col-span-2 w-full px-4 py-2.5 rounded-lg bg-darkBg border border-borderDark text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cta"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.lgpdConsent}
              onChange={(e) => setForm({ ...form, lgpdConsent: e.target.checked })}
              className="mt-0.5"
            />
            <span>
              Li e aceito o consentimento para tratamento dos meus dados pessoais conforme LGPD (obrigatório).
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-cta hover:bg-cta-hover text-white font-bold text-sm tracking-wide shadow-lg shadow-cta/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? "Cadastrando..." : "Cadastrar como Cliente"}
          </button>
        </form>

        <div className="pt-4 border-t border-borderDark/50 text-center text-xs text-slate-400 flex items-center justify-center gap-4">
          <Link href="/auth/login" className="hover:text-white transition-colors">
            Ir para Login
          </Link>
          <Link href="/" className="hover:text-white transition-colors">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    </main>
  );
}
