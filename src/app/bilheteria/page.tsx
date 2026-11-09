"use client";

import React, { useEffect, useState } from "react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { AttendantSalesCounter } from "@/components/attendant/attendant-sales-counter";
import type { FilmItem } from "@/components/home/types";

export default function GerenteBilheteriaPage() {
  const [films, setFilms] = useState<FilmItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFilms() {
      try {
        setLoading(true);
        const res = await fetch("/api/portal/filmes", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setFilms(data);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo da bilheteria:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFilms();
  }, []);

  return (
    <div className="min-h-screen liquid-glass-backdrop text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      <CineDoomHeader activePage="bilheteria" />
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col">
        <AttendantSalesCounter films={films} loading={loading} />
      </main>
      <CineDoomFooter simple className="mt-8" />
    </div>
  );
}
