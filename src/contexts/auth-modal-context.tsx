"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type AuthModalView = "login" | "cadastro";

export interface AuthModalOptions {
  redirectOnLogin?: boolean;
  onSuccess?: () => void;
}

interface AuthModalContextType {
  isOpen: boolean;
  view: AuthModalView;
  options?: AuthModalOptions;
  openLogin: (options?: AuthModalOptions | any) => void;
  openCadastro: (options?: AuthModalOptions | any) => void;
  switchView: (view: AuthModalView) => void;
  close: () => void;
  isLoginOpen: boolean;
  closeLogin: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  isOpen: false,
  view: "login",
  options: { redirectOnLogin: true },
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
  const [options, setOptions] = useState<AuthModalOptions>({ redirectOnLogin: true });

  const openLogin = useCallback((opts?: AuthModalOptions | any) => {
    setView("login");
    if (opts && typeof opts === "object" && !("nativeEvent" in opts)) {
      setOptions(opts);
    } else {
      setOptions({ redirectOnLogin: true });
    }
    setIsOpen(true);
  }, []);

  const openCadastro = useCallback((opts?: AuthModalOptions | any) => {
    setView("cadastro");
    if (opts && typeof opts === "object" && !("nativeEvent" in opts)) {
      setOptions(opts);
    } else {
      setOptions({ redirectOnLogin: true });
    }
    setIsOpen(true);
  }, []);

  const switchView = useCallback((newView: AuthModalView) => {
    setView(newView);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        view,
        options,
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
