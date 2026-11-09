import Link from "next/link";
import Image from "next/image";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#070A12] text-white">
      <div className="w-full max-w-md text-center flex flex-col items-center">
        {/* Logo Centralizada CineDoom Branca */}
        <div className="relative h-12 w-52 mb-8">
          <Image
            src="/logos/cinedoom-logo-horizontal-white.png"
            alt="CineDoom"
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Card de Erro */}
        <div className="w-full p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-cta">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-white block">
              404
            </span>
            <h1 className="text-lg font-bold text-slate-200">
              Página não encontrada
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
              O conteúdo ou a rota que você tentou acessar não existe, foi movida ou não está disponível no momento.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold tracking-wide transition-all shadow-lg shadow-cta/20 active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Início</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.history.back();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

