"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
  className = "",
  itemLabel = "itens",
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Se não houver itens ou apenas 1 página com todos os itens, não há necessidade de paginar ou mostra resumo limpo
  if (totalItems <= pageSize && currentPage === 1) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/5 text-xs text-slate-400 ${className}`}
    >
      <div className="text-slate-400">
        Mostrando <span className="font-semibold text-white">{startItem}</span> a{" "}
        <span className="font-semibold text-white">{endItem}</span> de{" "}
        <span className="font-semibold text-white">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-white/5"
          aria-label="Página anterior"
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((p, idx) => {
          if (p === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="px-1.5 sm:px-2 py-1 text-slate-600 select-none">
                ...
              </span>
            );
          }
          const pageNum = Number(p);
          const isActive = pageNum === currentPage;
          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[30px] sm:min-w-[32px] h-8 px-1.5 sm:px-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                isActive
                  ? "bg-cta text-white font-bold shadow-[0_0_10px_rgba(233,69,96,0.3)]"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors border border-white/5"
          aria-label="Próxima página"
          title="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

