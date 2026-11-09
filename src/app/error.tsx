"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro não capturado na rota:", error);
  }, [error]);

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
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Ocorreu um imprevisto
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
              Não foi possível carregar as informações desta página. Tente recarregar ou volte para o início.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cta hover:bg-cta-hover text-white text-xs font-bold tracking-wide transition-all shadow-lg shadow-cta/20 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Página Inicial</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

