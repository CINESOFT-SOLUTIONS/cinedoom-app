import React from "react";

export function AgeRatingBadge({ rating }: { rating?: string }) {
  const r = (rating || "L").toUpperCase();

  if (r === "L" || r === "LIVRE") {
    return (
      <span
        title="Classificação Livre para todos os públicos"
        className="w-6 h-6 rounded bg-[#00A859] text-white font-bold text-xs flex items-center justify-center shadow-sm select-none"
      >
        L
      </span>
    );
  }
  if (r === "10") {
    return (
      <span
        title="Não recomendado para menores de 10 anos"
        className="w-6 h-6 rounded bg-[#0099DA] text-white font-bold text-xs flex items-center justify-center shadow-sm select-none"
      >
        10
      </span>
    );
  }
  if (r === "12") {
    return (
      <span
        title="Não recomendado para menores de 12 anos"
        className="w-6 h-6 rounded bg-[#F7B500] text-neutral-900 font-bold text-xs flex items-center justify-center shadow-sm select-none"
      >
        12
      </span>
    );
  }
  if (r === "14") {
    return (
      <span
        title="Não recomendado para menores de 14 anos"
        className="w-6 h-6 rounded bg-[#F37021] text-white font-bold text-xs flex items-center justify-center shadow-sm select-none"
      >
        14
      </span>
    );
  }
  if (r === "16") {
    return (
      <span
        title="Não recomendado para menores de 16 anos"
        className="w-6 h-6 rounded bg-[#E94560] text-white font-bold text-xs flex items-center justify-center shadow-sm select-none"
      >
        16
      </span>
    );
  }
  return (
    <span
      title="Não recomendado para menores de 18 anos"
      className="w-6 h-6 rounded bg-[#1C1C1C] border border-slate-600 text-white font-bold text-xs flex items-center justify-center shadow-sm select-none"
    >
      18
    </span>
  );
}
