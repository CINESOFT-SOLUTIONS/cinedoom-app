"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export function InstitutionalBanner() {
  return (
    <section className="pt-12 border-t border-borderDark/60">
      <div className="liquid-glass-card rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-semibold text-cta uppercase tracking-wider block">
            Conheça Nossa História
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Sobre o CineDoom
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Mais do que assistir a um filme, ir ao cinema é reservar um momento para se desconectar da rotina e mergulhar em outras histórias. É sentir cada cena, compartilhar emoções e viver a experiência de uma forma que só a tela grande pode proporcionar.
          </p>
        </div>
        <Link
          href="/sobre"
          title="Sobre o CineDoom"
          className="shrink-0 transition-transform duration-300 hover:scale-105 active:scale-95 md:ml-auto"
        >
          <Image
            src="/logos/cinedoom-icon.png"
            alt="CineDoom"
            width={120}
            height={96}
            className="w-24 h-auto sm:w-28 md:w-32 object-contain drop-shadow-2xl hover:brightness-110 transition-all"
          />
        </Link>
      </div>
    </section>
  );
}
