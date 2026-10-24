import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/auth-options";
import { redirect } from "next/navigation";
import { listMyReservations } from "@/modules/portal/portal-service";
import { Film, Clock, MapPin } from "lucide-react";

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
    <main className="min-h-screen bg-gradient-to-b from-primary via-darkBg to-primary text-white">
      <header className="border-b border-borderDark/40 bg-surface/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="relative h-10 w-44 transition-transform hover:scale-105">
              <Image
                src="/logos/cinedoom-logo-horizontal-color.png"
                alt="CineDoom"
                fill
                className="object-contain object-left"
                priority
              />
            </Link>
            <span className="hidden sm:inline-block h-6 w-[1px] bg-borderDark" />
            <div className="hidden sm:block">
              <h1 className="text-sm font-black tracking-wider text-white">MINHAS RESERVAS</h1>
              <p className="text-[10px] text-slate-400">Portal do Cliente</p>
            </div>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/portal" className="px-3 py-2 rounded-lg hover:bg-surface/60 transition-colors">
              Portal
            </Link>
            <Link href="/" className="px-3 py-2 rounded-lg hover:bg-surface/60 transition-colors">
              Início
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Olá, {session.user.name}</h2>
          <p className="text-slate-400 mt-1">Histórico pessoal de reservas e ingressos</p>
        </div>

        {reservations.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-surface border border-borderDark">
            <Film className="w-10 h-10 mx-auto text-slate-500" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma reserva encontrada</h3>
            <p className="text-slate-400 mt-2">Suas reservas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reservations.map((res) => (
              <article
                key={res.id}
                className="rounded-xl bg-surface border border-borderDark overflow-hidden shadow-lg shadow-black/20"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Film className="w-4 h-4" />
                      <span className="font-semibold">{res.session.film.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        <span>{res.session.room.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(res.session.startsAt)}</span>
                      </div>
                      <span>
                        Código: <span className="text-white font-mono">{res.code}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-secondary/40 border border-secondary">
                        {res.status}
                      </span>
                      <span className="text-slate-400">
                        Assentos: {res.sessionSeats.map((s) => s.seat.seatCode).join(", ")}
                      </span>
                      <span className="text-slate-400">
                        Total: R$ {Number(res.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>Criada em: {formatDate(res.createdAt)}</p>
                    {res.expiresAt && res.status === "PENDING" && (
                      <p>Expira em: {formatDate(res.expiresAt)}</p>
                    )}
                    {res.cancelledAt && <p>Cancelada em: {formatDate(res.cancelledAt)}</p>}
                    {res.confirmedAt && <p>Confirmada em: {formatDate(res.confirmedAt)}</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
