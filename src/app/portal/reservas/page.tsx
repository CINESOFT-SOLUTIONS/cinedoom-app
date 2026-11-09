"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { BookingFlow } from "@/components/booking/booking-flow";

function BookingFlowContainer() {
  const searchParams = useSearchParams();
  const filmeId = searchParams.get("filmeId") || searchParams.get("filmId") || undefined;
  const sessionId = searchParams.get("sessionId") || searchParams.get("sessaoId") || undefined;
  const diaParam = searchParams.get("dia") || searchParams.get("dataIndex");
  const initialDateIndex = diaParam !== null && diaParam !== undefined && !isNaN(Number(diaParam))
    ? Math.max(0, Math.min(6, parseInt(diaParam, 10)))
    : undefined;

  return (
    <BookingFlow
      initialFilmId={filmeId}
      initialSessionId={sessionId}
      initialDateIndex={initialDateIndex}
    />
  );
}

export default function PortalReservasPage() {
  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white lg:h-screen lg:overflow-hidden">
      <CineDoomHeader activePage="filmes" />
      <main className="flex-1 w-full flex flex-col justify-between overflow-x-hidden lg:overflow-y-auto">
        <Suspense
          fallback={
            <div className="py-24 flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-cta border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <BookingFlowContainer />
        </Suspense>
      </main>
      <CineDoomFooter simple className="lg:hidden" />
    </div>
  );
}
