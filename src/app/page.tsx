import Link from "next/link";
import { Film, Ticket, ShieldCheck, Users, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 md:p-16 bg-gradient-to-b from-primary via-darkBg to-primary">
      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between border-b border-borderDark/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cta flex items-center justify-center font-bold text-white shadow-lg shadow-cta/20">
            CD
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-white">CINEDOOM</h1>
            <p className="text-xs text-slate-400">Plataforma de Cinema & Bilheteria ACID</p>
          </div>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/portal"
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-surface/50 transition-colors"
          >
            Portal do Cliente
          </Link>
          <Link
            href="/auth/login"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-cta hover:bg-cta-hover text-white shadow-md shadow-cta/20 transition-all"
          >
            Acesso Restrito
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <div className="w-full max-w-4xl text-center py-16 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/40 border border-secondary text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Conformidade ABNT NBR ISO/IEC/IEEE 12207:2021 & LGPD</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Gestao de Cinemas com <span className="text-cta">Garantia ACID</span> e Zero Conflitos
        </h2>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          Bilheteria fisica de alta performance, mapa de assentos reativo com atualizacao em tempo real, painel de ocupacao gerencial e reserva online com baixa presencial.
        </p>

        {/* Modules Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left">
          <div className="p-6 rounded-xl bg-surface border border-borderDark hover:border-cta/40 transition-all shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-cta/10 text-cta flex items-center justify-center mb-4">
              <Ticket className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Portal do Cliente</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Consulta de programacao, reserva atomica com status RESERVED, voucher por e-mail e cancelamento voluntario web.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-borderDark hover:border-cta/40 transition-all shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-secondary/30 text-emerald-400 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Modulo do Atendente</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Venda presencial com trava SELECT FOR UPDATE, baixa de reservas com identificador unico e cancelamento auditavel append-only.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-borderDark hover:border-cta/40 transition-all shadow-lg">
            <div className="w-10 h-10 rounded-lg bg-primary/40 text-blue-400 flex items-center justify-center mb-4">
              <Film className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Painel do Gerente</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Gestao de salas, catalogo de filmes, sessao e painel de taxa de ocupacao em tempo real isolado por tenant.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-5xl border-t border-borderDark/40 pt-6 text-center text-xs text-slate-500">
        <p>CineDoom SaaS v1.0.0-mvp — Desenvolvido por CineSoft Solutions</p>
        <p className="mt-1">Universidade Federal de Goias (UFG) — Instituto de Informatica (INF)</p>
      </footer>
    </main>
  );
}
