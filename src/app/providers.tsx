"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { AuthModalProvider } from "@/contexts/auth-modal-context";
import { LoginModal } from "@/components/login-modal";
import { LiquidGlassRefractionProvider } from "@/components/liquid-glass-refraction";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>
        <LiquidGlassRefractionProvider />
        {children}
        <LoginModal />
      </AuthModalProvider>
    </SessionProvider>
  );
}
