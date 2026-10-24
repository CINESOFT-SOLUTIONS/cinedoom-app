"use client";

import React from "react";
import { Calendar, Search } from "lucide-react";

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
  selectedFormat: string;
  onSelectFormat: (fmt: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function FilmFilters({
  dateTabs,
  selectedDay,
  onSelectDay,
  selectedFormat,
  onSelectFormat,
  searchQuery,
  onSearchChange,
}: FilmFiltersProps) {
  return (
    <section
      id="programacao"
      className="sticky top-16 md:top-20 z-40 bg-[#12182B]/98 backdrop-blur-md border-b border-borderDark/80 shadow-md scroll-mt-16 md:scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Seletor de Datas em Pílulas */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 scrollbar-none">
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
                <span className="text-[10px] uppercase tracking-wider">{tab.dayName}</span>
                <span className="text-xs font-semibold">{tab.dayNumber}</span>
              </button>
            ))}
          </div>

          {/* Filtros de Formatos & Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {["TODOS", "IMAX", "VIP", "CONFORT"].map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => onSelectFormat(format)}
                  className={`px-3 py-1.5 rounded-lg font-medium text-[11px] shrink-0 transition-all ${
                    selectedFormat === format
                      ? "bg-surface text-cta border border-cta/50 shadow-sm"
                      : "text-slate-400 hover:text-white bg-surface/40 sm:bg-transparent"
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar filme em cartaz..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full liquid-glass-input rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
