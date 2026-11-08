"use client";

import React from "react";
import { Calendar, Search } from "lucide-react";
import type { ProgramacaoFilter } from "@/shared/experiences";

export interface DateTabItem {
  index: number;
  dayName: string;
  dayNumber: string;
  date: Date;
}

interface FilmFiltersProps {
  dateTabs: DateTabItem[];
  selectedDay: number;
  onSelectDay: (idx: number) => void;
  selectedFormat?: ProgramacaoFilter | string;
  onSelectFormat?: (fmt: ProgramacaoFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function FilmFilters({
  dateTabs,
  selectedDay,
  onSelectDay,
  searchQuery,
  onSearchChange,
}: FilmFiltersProps) {
  return (
    <section
      id="programacao"
      className="sticky top-16 md:top-20 z-40 bg-[#12182B]/98 backdrop-blur-md border-b border-borderDark/80 shadow-md scroll-mt-16 md:scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Seletor de Datas em Pílulas */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mr-2 hidden sm:flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-cta" /> Data:
            </span>
            {dateTabs.map((tab) => (
              <button
                key={tab.index}
                type="button"
                onClick={() => onSelectDay(tab.index)}
                className={`px-4 py-2 rounded-xl text-xs font-medium shrink-0 transition-all flex flex-col items-center leading-tight ${
                  selectedDay === tab.index
                    ? "bg-cta text-white shadow-lg shadow-cta/30"
                    : "bg-surface/50 text-slate-400 hover:text-white hover:bg-surface border border-borderDark/50"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider" suppressHydrationWarning>
                  {tab.dayName}
                </span>
                <span className="text-xs font-semibold" suppressHydrationWarning>
                  {tab.dayNumber}
                </span>
              </button>
            ))}
          </div>

          {/* Busca por filme em cartaz */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar filme em cartaz..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-surface/70 border border-borderDark rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cta transition-all"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
