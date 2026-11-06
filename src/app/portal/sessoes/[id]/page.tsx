"use client";

import React from "react";
import { useParams } from "next/navigation";
import { CineDoomHeader } from "@/components/cinedoom-header";
import { CineDoomFooter } from "@/components/cinedoom-footer";
import { BookingFlow } from "@/components/booking/booking-flow";

export default function PortalSessionReservationPage() {
  const params = useParams();
  const sessionId = params.id as string;

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      <CineDoomHeader activePage="filmes" />
      <main className="flex-1 w-full">
        <BookingFlow initialSessionId={sessionId} />
      </main>
      <CineDoomFooter />
    </div>
  );
}
