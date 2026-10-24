"use client";

import React, { createContext, useContext, useState } from "react";

export type AuthModalView = "login" | "cadastro";

interface AuthModalContextType {
  isOpen: boolean;
  view: AuthModalView;
  openLogin: () => void;
  openCadastro: () => void;
  switchView: (view: AuthModalView) => void;
  close: () => void;
  isLoginOpen: boolean;
  closeLogin: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  isOpen: false,
  view: "login",
  openLogin: () => {},
  openCadastro: () => {},
  switchView: () => {},
  close: () => {},
  isLoginOpen: false,
  closeLogin: () => {},
});

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthModalView>("login");

  const openLogin = () => {
    setView("login");
    setIsOpen(true);
  };

  const openCadastro = () => {
    setView("cadastro");
    setIsOpen(true);
  };

  const switchView = (newView: AuthModalView) => {
    setView(newView);
  };

  const close = () => {
    setIsOpen(false);
  };

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        view,
        openLogin,
        openCadastro,
        switchView,
        close,
        isLoginOpen: isOpen,
        closeLogin: close,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
