import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { redirect } from "next/navigation";
import { listMyReservations } from "@/modules/portal/portal-service";
import { Film, Clock, MapPin, Ticket, ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";
import { CineDoomHeader } from "@/components/cinedoom-header";

function formatDate(date: Date) {
  return new Date(date).toLocaleString("pt-BR");
}

export default async function MinhasReservasPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/portal/minhas-reservas");
  }

  if (session.user.role !== "CLIENTE") {
    redirect("/");
  }

  const reservations = await listMyReservations(session.user.id, session.user.tenantId);

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* 1. Faixa Superior White Liquid Glass */}
      <CineDoomHeader activePage="minhas-reservas" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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
          <div className="grid grid-cols-1 gap-5">
            {reservations.map((res) => (
              <article
                key={res.id}
                className="rounded-2xl liquid-glass-card overflow-hidden transition-all duration-300 hover:border-white/25 hover:shadow-2xl hover:shadow-black/40"
              >
                <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-cta shadow-[0_0_8px_rgba(233,69,96,0.6)] shrink-0" />
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {res.session.film.title}
                      </h3>
                      <span className="text-[11px] font-semibold text-cta bg-cta/15 border border-cta/30 px-2.5 py-0.5 rounded-full uppercase">
                        {res.session.room.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cta" />
                        <span>{formatDate(res.session.startsAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Código: <strong className="text-white font-mono tracking-wider">{res.code}</strong></span>
                      </div>
                      <div className="text-slate-300">
                        Assentos: <strong className="text-white font-mono">{res.sessionSeats.map((s) => s.seat.seatCode).join(", ")}</strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {res.status === "PENDING" ? "Aguardando Pagamento" : res.status === "CONFIRMED" ? "Confirmada" : "Cancelada"}
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold">
                        Total: R$ {Number(res.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 text-xs text-slate-400">
                    <div className="text-left md:text-right space-y-0.5 text-[11px]">
                      <p>Criada em: {formatDate(res.createdAt)}</p>
                      {res.expiresAt && res.status === "PENDING" && (
                        <p className="text-amber-300">Expira em: {formatDate(res.expiresAt)}</p>
                      )}
                    </div>

                    <Link
                      href={`/portal/reservas/${res.id}/comprovante`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all shadow-sm"
                    >
                      <span>Ver Comprovante</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#0B0F1C] border-t border-borderDark/80 pt-8 pb-6 mt-16 text-center text-xs text-slate-500">
        <p>© 2026 CineDoom. Dados protegidos com conformidade à LGPD (Lei nº 13.709/2018).</p>
      </footer>
    </div>
  );
}
