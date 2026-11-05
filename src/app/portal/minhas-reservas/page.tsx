import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { redirect } from "next/navigation";
import { listMyReservations } from "@/modules/portal/portal-service";
import { Ticket, ArrowRight } from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { ReservationsTabsPanel } from "@/components/portal/reservations-tabs-panel";

export default async function MinhasReservasPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/portal/minhas-reservas");
  }

  if (session.user.role !== "CLIENTE") {
    redirect("/");
  }

  const reservations = await listMyReservations(session.user.id, session.user.tenantId);

  const now = new Date();
  const activeReservations = reservations.filter((res) => {
    if (res.status === "CONFIRMED") return true;
    if (res.status === "PENDING") {
      return !res.expiresAt || new Date(res.expiresAt) > now;
    }
    return false;
  });

  const expiredReservations = reservations.filter((res) => {
    if (res.status === "EXPIRED" || res.status === "CANCELLED") return true;
    if (res.status === "PENDING" && res.expiresAt && new Date(res.expiresAt) <= now) {
      return true;
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* 1. Faixa Superior White Liquid Glass */}
      <CineDoomHeader activePage="minhas-reservas" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <span className="text-xs font-semibold text-cta uppercase tracking-wider block">
              Portal do Cliente
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Minhas Reservas
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Olá, <strong className="text-white">{session.user.name}</strong>. Acompanhe seus ingressos e histórico de reservas.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all self-start sm:self-auto"
          >
            <span>Ver Programação</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {reservations.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-3xl liquid-glass-card space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
              <Ticket className="w-7 h-7 text-cta" />
            </div>
            <h2 className="text-lg font-bold text-white">Nenhuma reserva encontrada</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Você ainda não possui ingressos reservados. Explore os filmes em cartaz e garanta seu lugar em uma de nossas salas.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-cta hover:bg-cta-hover text-white text-xs font-semibold shadow-lg shadow-cta/25 transition-all"
              >
                Escolher Filme e Assento
              </Link>
            </div>
          </div>
        ) : (
          <ReservationsTabsPanel
            activeReservations={activeReservations}
            expiredReservations={expiredReservations}
          />
        )}
      </main>

      {/* Rodapé Simplificado apenas com barra inferior */}
      <CineDoomFooter simple />
    </div>
  );
}
