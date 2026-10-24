import React from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export function CineDoomFooter() {
  return (
    <footer className="bg-[#0B0F1C] border-t border-borderDark/80 pt-12 pb-8 mt-16 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="relative h-9 w-40">
              <Image
                src="/logos/cinedoom-logo-horizontal-white.png"
                alt="CineDoom"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cinema com reserva online e pagamento presencial na bilheteria física.
            </p>
          </div>

          <div className="space-y-2.5">
            <span className="font-semibold text-white text-xs uppercase tracking-wider block">
              Bilheteria & Reservas Presenciais
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              As reservas realizadas no portal garantem seus assentos até 1 hora antes do início da sessão. O pagamento e a emissão dos ingressos físicos são realizados diretamente no balcão da bilheteria.
            </p>
          </div>

          <div className="space-y-2.5">
            <span className="font-semibold text-white text-xs uppercase tracking-wider block">
              Segurança & Conformidade
            </span>
            <p className="text-xs text-slate-400 leading-relaxed flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              Dados protegidos em conformidade com a LGPD (Lei nº 13.709/2018).
            </p>
            <p className="text-[11px] text-slate-500">
              Reserva com trava transacional ACID e expiração automática de assentos.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-borderDark/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 CineDoom. Todos os direitos reservados.</p>
          <div className="flex items-center gap-2">
            <span>Desenvolvido por</span>
            <div className="relative h-7 w-32 opacity-90 hover:opacity-100 transition-opacity">
              <Image
                src="/logos/cinesoft-logo-horizontal-white.png"
                alt="CineSoft Solutions"
                fill
                className="object-contain object-left"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
