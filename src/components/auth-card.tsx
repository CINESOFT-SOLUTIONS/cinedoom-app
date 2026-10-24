"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  FileText,
  UserPlus,
  ShieldAlert,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  X,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

// Validacao oficial de CPF brasileiro via Modulo 11
function isValidCPF(rawCpf: string): boolean {
  const cpf = rawCpf.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let firstCheck = 11 - (sum % 11);
  if (firstCheck >= 10) firstCheck = 0;
  if (firstCheck !== Number.parseInt(cpf.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  let secondCheck = 11 - (sum % 11);
  if (secondCheck >= 10) secondCheck = 0;
  return secondCheck === Number.parseInt(cpf.charAt(10), 10);
}

// Validacao de formato de E-mail via Regex
function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export interface AuthCardProps {
  initialView?: "login" | "cadastro";
  activeView?: "login" | "cadastro";
  onViewChange?: (view: "login" | "cadastro") => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function AuthCard({
  initialView = "login",
  activeView: controlledView,
  onViewChange,
  onClose,
  isModal = false,
}: AuthCardProps) {
  const router = useRouter();
  const [internalView, setInternalView] = useState<"login" | "cadastro">(initialView);
  const currentView = controlledView ?? internalView;

  // Estados de Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Estados de Cadastro
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    cpf: "",
    lgpdConsent: false,
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerTouched, setRegisterTouched] = useState({
    name: false,
    email: false,
    cpf: false,
    password: false,
    confirmPassword: false,
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Transicao de Altura Suave via ResizeObserver
  const loginPanelRef = useRef<HTMLDivElement>(null);
  const cadastroPanelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);

  const handleSwitchView = (nextView: "login" | "cadastro") => {
    setLoginError(null);
    setRegisterError(null);
    if (onViewChange) {
      onViewChange(nextView);
    } else {
      setInternalView(nextView);
      if (!isModal && typeof window !== "undefined") {
        const nextUrl = nextView === "login" ? "/auth/login" : "/portal/cadastro";
        window.history.pushState(null, "", nextUrl);
      }
    }
  };

  // Suporte a navegacao pelo historico do navegador (back/forward)
  useEffect(() => {
    if (isModal) return;
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        if (window.location.pathname.includes("cadastro")) {
          setInternalView("cadastro");
        } else {
          setInternalView("login");
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isModal]);

  // Mede e ajusta a altura dinamicamente para animacao suave
  useEffect(() => {
    const activeEl = currentView === "login" ? loginPanelRef.current : cadastroPanelRef.current;
    if (!activeEl) return;

    setPanelHeight(activeEl.offsetHeight);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height;
        if (h > 0) setPanelHeight(h);
      }
    });

    ro.observe(activeEl);
    return () => ro.disconnect();
  }, [currentView, loginError, registerError, registerSuccess]);

  // Handlers de Login
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await signIn("credentials", {
        email: loginEmail,
        password: loginPassword,
        redirect: false,
      });

      if (res?.error) {
        setLoginError("Credenciais inválidas ou usuário inativo.");
      } else {
        if (onClose) onClose();
        router.push("/");
        router.refresh();
      }
    } catch {
      setLoginError("Falha ao conectar com o serviço de autenticação.");
    } finally {
      setLoginLoading(false);
    }
  }

  // Validacoes em Tempo Real de Cadastro
  const digitsOnlyCpf = registerForm.cpf.replace(/\D/g, "");
  const isCpfComplete = digitsOnlyCpf.length === 11;
  const isCpfValid = isCpfComplete && isValidCPF(registerForm.cpf);
  const isCpfInvalid =
    (isCpfComplete && !isCpfValid) ||
    (registerTouched.cpf && digitsOnlyCpf.length > 0 && !isCpfComplete);

  const isEmailValid = isValidEmail(registerForm.email);
  const isEmailInvalid =
    registerTouched.email && registerForm.email.length > 0 && !isEmailValid;

  const isPasswordValid = registerForm.password.length >= 6;
  const isPasswordInvalid =
    registerTouched.password && registerForm.password.length > 0 && !isPasswordValid;

  const isConfirmPasswordValid =
    isPasswordValid &&
    confirmPassword.length > 0 &&
    confirmPassword === registerForm.password;
  const isConfirmPasswordInvalid =
    registerTouched.confirmPassword &&
    confirmPassword.length > 0 &&
    confirmPassword !== registerForm.password;

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 9) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
    } else if (raw.length > 6) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    } else if (raw.length > 3) {
      formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`;
    }
    setRegisterForm((prev) => ({ ...prev, cpf: formatted }));
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(false);

    if (!isValidCPF(registerForm.cpf)) {
      setRegisterError("Por favor, informe um CPF válido.");
      setRegisterTouched((prev) => ({ ...prev, cpf: true }));
      return;
    }

    if (!isValidEmail(registerForm.email)) {
      setRegisterError("Por favor, informe um formato de e-mail válido (ex: seu@email.com).");
      setRegisterTouched((prev) => ({ ...prev, email: true }));
      return;
    }

    if (registerForm.password.length < 6) {
      setRegisterError("A senha deve conter no mínimo 6 caracteres.");
      setRegisterTouched((prev) => ({ ...prev, password: true }));
      return;
    }

    if (registerForm.password !== confirmPassword) {
      setRegisterError("As senhas não coincidem. Por favor, verifique a repetição da senha.");
      setRegisterTouched((prev) => ({ ...prev, confirmPassword: true }));
      return;
    }

    setRegisterLoading(true);

    try {
      const res = await fetch("/api/portal/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error || data.message || "Erro ao cadastrar cliente.");
      } else {
        setRegisterSuccess(true);
        setLoginEmail(registerForm.email);
        setTimeout(() => {
          handleSwitchView("login");
          setRegisterSuccess(false);
        }, 1200);
      }
    } catch {
      setRegisterError("Falha ao conectar com o servidor.");
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <>
      {/* Caixote Liquid Glass Branco Centralizado */}
      <div className="relative w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 border border-white/90 shadow-[0_24px_70px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,1),inset_0_-1px_1px_rgba(203,213,225,0.4)] overflow-hidden before:content-[''] before:absolute before:inset-0 before:pointer-events-none before:bg-gradient-to-b before:from-white/60 before:via-transparent before:to-transparent before:rounded-3xl transition-all">
        {/* Barra Superior de Controles: Voltar (a esquerda em cadastro) e Fechar (a direita) */}
        <div className="relative flex items-center justify-between min-h-[32px] -mt-1 mb-2">
          {/* Botao Voltar Suave para Login */}
          <button
            type="button"
            onClick={() => handleSwitchView("login")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all duration-200 cursor-pointer ${
              currentView === "cadastro"
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-3 pointer-events-none"
            }`}
            aria-label="Voltar para login"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Voltar</span>
          </button>

          {/* Botao Fechar (X) */}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors ml-auto cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors ml-auto cursor-pointer"
              aria-label="Voltar para a pagina inicial"
            >
              <X className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Cabecalho da Marca CineDoom com Cross-Fade Suave */}
        <div className="text-center space-y-2 mb-5 sm:mb-6">
          <div className="relative w-14 h-12 mx-auto drop-shadow-sm transition-transform hover:scale-105">
            <Image
              src="/logos/cinedoom-icon-color.png"
              alt="CineDoom"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="min-h-[46px] flex flex-col justify-center space-y-1">
            <h1
              id="auth-card-title"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight transition-all duration-200"
            >
              {currentView === "login" ? "Acesse sua Conta" : "Crie sua Conta"}
            </h1>
            <p className="text-xs text-slate-500 transition-all duration-200">
              {currentView === "login"
                ? "Informe suas credenciais para continuar no CineDoom"
                : "Informe seus dados para acessar o Portal do Cliente"}
            </p>
          </div>
        </div>

        {/* Container Deslizante com Animacao Fluida de Altura e Deslocamento Horizontal */}
        <div
          className="relative overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ height: panelHeight ? `${panelHeight}px` : undefined }}
        >
          {/* ===================== PAINEL 1: LOGIN ===================== */}
          <div
            ref={loginPanelRef}
            className={`w-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              currentView === "login"
                ? "opacity-100 translate-x-0 relative pointer-events-auto"
                : "opacity-0 -translate-x-10 absolute inset-x-0 top-0 pointer-events-none"
            }`}
          >
            {loginError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in duration-150 mb-3">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-medium">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cta focus:ring-2 focus:ring-cta/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cta focus:ring-2 focus:ring-cta/20 transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                    aria-label={showLoginPassword ? "Ocultar senha" : "Ver senha"}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 rounded-xl bg-cta hover:bg-cta-hover text-white font-bold text-sm tracking-wide shadow-lg shadow-cta/25 hover:shadow-cta/35 disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-2"
              >
                {loginLoading ? (
                  <span>Autenticando...</span>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Secao Inferior: Botao de Criar Conta */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col items-center gap-2 text-center">
              <span className="text-xs text-slate-500 font-medium">
                Ainda não tem uma conta no CineDoom?
              </span>

              <button
                type="button"
                onClick={() => handleSwitchView("cadastro")}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-cta/50 bg-slate-50 hover:bg-white text-slate-800 hover:text-cta font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs group cursor-pointer active:scale-98"
              >
                <UserPlus className="w-4 h-4 text-cta group-hover:scale-110 transition-transform" />
                <span>Criar Conta</span>
              </button>
            </div>
          </div>

          {/* ===================== PAINEL 2: CADASTRO ===================== */}
          <div
            ref={cadastroPanelRef}
            className={`w-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              currentView === "cadastro"
                ? "opacity-100 translate-x-0 relative pointer-events-auto"
                : "opacity-0 translate-x-10 absolute inset-x-0 top-0 pointer-events-none"
            }`}
          >
            {registerError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in duration-150 mb-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-medium">{registerError}</span>
              </div>
            )}

            {registerSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-150 mb-2.5">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-medium">Cadastro realizado com sucesso! Redirecionando para login...</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-2.5">
              {/* Linha 1: Nome Completo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={registerForm.name}
                    maxLength={100}
                    onBlur={() => setRegisterTouched((prev) => ({ ...prev, name: true }))}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    required
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-cta focus:ring-2 focus:ring-cta/20 transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Linha 2: E-mail com Validacao no Ato da Digitacao */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    value={registerForm.email}
                    maxLength={120}
                    onBlur={() => setRegisterTouched((prev) => ({ ...prev, email: true }))}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, email: e.target.value });
                      if (!registerTouched.email && e.target.value.length > 0) {
                        setRegisterTouched((prev) => ({ ...prev, email: true }));
                      }
                    }}
                    required
                    className={`w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/60 focus:bg-white border text-slate-900 placeholder-slate-400 text-sm focus:outline-none transition-all shadow-xs ${
                      isEmailValid
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        : isEmailInvalid
                        ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-cta focus:ring-2 focus:ring-cta/20"
                    }`}
                  />
                  {isEmailValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in" />
                  )}
                  {isEmailInvalid && (
                    <AlertCircle className="w-4 h-4 text-rose-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in" />
                  )}
                </div>
                {isEmailInvalid && (
                  <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                    Formato de e-mail inválido.
                  </p>
                )}
              </div>

              {/* Linha 3: CPF com Mascara e Validacao Modulo 11 */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  CPF
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={registerForm.cpf}
                    maxLength={14}
                    onBlur={() => setRegisterTouched((prev) => ({ ...prev, cpf: true }))}
                    onChange={(e) => {
                      handleCpfChange(e);
                      if (!registerTouched.cpf && e.target.value.length > 0) {
                        setRegisterTouched((prev) => ({ ...prev, cpf: true }));
                      }
                    }}
                    required
                    className={`w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/60 focus:bg-white border text-slate-900 placeholder-slate-400 text-sm focus:outline-none transition-all shadow-xs ${
                      isCpfValid
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        : isCpfInvalid
                        ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-cta focus:ring-2 focus:ring-cta/20"
                    }`}
                  />
                  {isCpfValid && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in" />
                  )}
                  {isCpfInvalid && (
                    <AlertCircle className="w-4 h-4 text-rose-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none animate-in fade-in" />
                  )}
                </div>
                {isCpfInvalid && (
                  <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                    CPF inválido.
                  </p>
                )}
              </div>

              {/* Linha 4: Senha com Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={registerForm.password}
                    maxLength={64}
                    onBlur={() => setRegisterTouched((prev) => ({ ...prev, password: true }))}
                    onChange={(e) => {
                      setRegisterForm({ ...registerForm, password: e.target.value });
                      if (!registerTouched.password && e.target.value.length > 0) {
                        setRegisterTouched((prev) => ({ ...prev, password: true }));
                      }
                    }}
                    required
                    className={`w-full pl-9 pr-16 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/60 focus:bg-white border text-slate-900 placeholder-slate-400 text-sm focus:outline-none transition-all shadow-xs ${
                      isPasswordValid
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        : isPasswordInvalid
                        ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-cta focus:ring-2 focus:ring-cta/20"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isPasswordValid && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 pointer-events-none animate-in fade-in" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                      aria-label={showRegisterPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {isPasswordInvalid && (
                  <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                    A senha deve ter no mínimo 6 caracteres.
                  </p>
                )}
              </div>

              {/* Linha 5: Repetir Senha com Validacao em Tempo Real */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Repetir Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    value={confirmPassword}
                    maxLength={64}
                    onBlur={() => setRegisterTouched((prev) => ({ ...prev, confirmPassword: true }))}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (!registerTouched.confirmPassword && e.target.value.length > 0) {
                        setRegisterTouched((prev) => ({ ...prev, confirmPassword: true }));
                      }
                    }}
                    required
                    className={`w-full pl-9 pr-16 py-2 rounded-xl bg-slate-50 hover:bg-slate-100/60 focus:bg-white border text-slate-900 placeholder-slate-400 text-sm focus:outline-none transition-all shadow-xs ${
                      isConfirmPasswordValid
                        ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        : isConfirmPasswordInvalid
                        ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-200 focus:border-cta focus:ring-2 focus:ring-cta/20"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isConfirmPasswordValid && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 pointer-events-none animate-in fade-in" />
                    )}
                    {isConfirmPasswordInvalid && (
                      <AlertCircle className="w-4 h-4 text-rose-500 pointer-events-none animate-in fade-in" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {isConfirmPasswordInvalid && (
                  <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                    As senhas não coincidem.
                  </p>
                )}
              </div>

              {/* Termos de Consentimento LGPD com Modal Interativo */}
              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer pt-0.5 select-none">
                <input
                  type="checkbox"
                  checked={registerForm.lgpdConsent}
                  onChange={(e) => setRegisterForm({ ...registerForm, lgpdConsent: e.target.checked })}
                  className="mt-0.5 rounded border-slate-300 text-cta focus:ring-cta/25 accent-cta cursor-pointer shrink-0"
                  required
                />
                <span className="leading-snug text-[11px]">
                  Li e concordo com os termos e com a{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPrivacy(true);
                    }}
                    className="text-cta hover:text-cta-hover font-bold underline underline-offset-2 transition-colors cursor-pointer inline"
                  >
                    Política de Privacidade
                  </button>{" "}
                  conforme a LGPD.
                </span>
              </label>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full py-2.5 rounded-xl bg-cta hover:bg-cta-hover text-white font-bold text-sm tracking-wide shadow-lg shadow-cta/25 hover:shadow-cta/35 disabled:opacity-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-1"
              >
                <UserPlus className="w-4 h-4" />
                <span>{registerLoading ? "Cadastrando..." : "Cadastrar-se como Cliente"}</span>
              </button>
            </form>


          </div>
        </div>
      </div>

      {/* Modal Interativo de Politica de Privacidade (LGPD) */}
      {showPrivacy && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrivacy(false);
          }}
        >
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 space-y-4 border border-slate-200 shadow-[0_24px_70px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-200 overflow-hidden text-slate-800">
            <button
              type="button"
              onClick={() => setShowPrivacy(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cta/10 flex items-center justify-center text-cta shrink-0">
                <ShieldCheck className="w-5 h-5 text-cta" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Política de Privacidade e Proteção de Dados
              </h2>
            </div>

            <div className="text-xs text-slate-600 space-y-3 max-h-[55vh] overflow-y-auto pr-2 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block text-[13px]">
                  1. Finalidade da Coleta (Art. 7º da LGPD)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  O CineDoom coleta exclusivamente seu Nome, E-mail e CPF para a emissão nominativa de ingressos, controle de assentos marcados e cumprimento de obrigações fiscais.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block text-[13px]">
                  2. Segurança e Criptografia
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Seu CPF é armazenado sob criptografia de ponta a ponta (AES-256-GCM) e indexado via hash cego seguro (HMAC-SHA256). Seus dados nunca são comercializados ou compartilhados com terceiros para publicidade.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block text-[13px]">
                  3. Direitos do Titular (Art. 18 da LGPD)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Você tem o direito de solicitar a qualquer momento a confirmação, consulta, correção, bloqueio ou anonimização dos seus dados pessoais por meio dos canais oficiais do CineDoom.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRegisterForm((prev) => ({ ...prev, lgpdConsent: true }));
                setShowPrivacy(false);
              }}
              className="w-full py-2.5 rounded-xl bg-cta hover:bg-cta-hover text-white font-bold text-xs tracking-wide shadow-md shadow-cta/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Li e Concordo com a Política</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
