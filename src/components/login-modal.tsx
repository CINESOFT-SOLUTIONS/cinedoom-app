"use client";

import React, { useEffect } from "react";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { AuthCard } from "@/components/auth-card";

export function LoginModal() {
  const { isOpen, view, options, switchView, close } = useAuthModal();

  // Trava de rolagem ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-card-title"
      className="liquid-glass-scrim z-[100] p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="my-auto w-full max-w-md max-sm:max-h-[92vh] max-sm:overflow-y-auto max-sm:rounded-3xl">
        <AuthCard
          isModal={true}
          activeView={view}
          onViewChange={switchView}
          onClose={close}
          redirectOnLogin={options?.redirectOnLogin}
          onSuccess={options?.onSuccess}
        />
      </div>
    </div>
  );
}
