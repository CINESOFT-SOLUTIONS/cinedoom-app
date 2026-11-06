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

  return <BookingFlow initialFilmId={filmeId} initialSessionId={sessionId} />;
}

export default function PortalReservasPage() {
  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      <CineDoomHeader activePage="filmes" />
      <main className="flex-1 w-full">
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
      <CineDoomFooter />
    </div>
  );
}
