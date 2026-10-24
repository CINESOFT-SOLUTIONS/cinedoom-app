"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { AuthModalProvider } from "@/contexts/auth-modal-context";
import { LoginModal } from "@/components/login-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>
        {children}
        <LoginModal />
      </AuthModalProvider>
    </SessionProvider>
  );
}
