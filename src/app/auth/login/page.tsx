"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ShieldAlert, Film } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Credenciais invalidas ou conta inativa.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Falha ao conectar com o servico de autenticacao.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary via-darkBg to-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-borderDark rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cta/10 text-cta mb-2 shadow-inner">
            <Film className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">CINEDOOM</h1>
          <p className="text-xs text-slate-400">Acesso Restrito: Gerentes e Operadores</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              E-mail Operacional
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@cinedoom.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-darkBg border border-borderDark text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cta transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-darkBg border border-borderDark text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cta transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-cta hover:bg-cta-hover text-white font-bold text-sm tracking-wide shadow-lg shadow-cta/20 disabled:opacity-50 transition-all"
          >
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </button>
        </form>

        <div className="pt-4 border-t border-borderDark/50 text-center text-xs text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            ← Voltar para a pagina inicial
          </Link>
        </div>
      </div>
    </main>
  );
}
