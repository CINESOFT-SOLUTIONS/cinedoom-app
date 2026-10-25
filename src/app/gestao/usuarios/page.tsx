"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
  ShieldAlert,
  Lock,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ATENDENTE" | "GERENTE" | "CLIENTE";
  active: boolean;
  createdAt: string;
  _count?: {
    ticketsSold: number;
  };
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
}

export default function GestaoUsuariosPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Modal Novo Atendente (FRAME-7)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Modal Redefinir Senha
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/gestao/usuarios");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const err = await response.json().catch(() => null);
        setStatusMessage({
          type: "error",
          text: err?.error || "Falha ao carregar lista de atendentes.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Erro de comunicacao ao buscar atendentes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Obtem o usuario atual com fallback resiliente
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.id) {
          setCurrentUserId(data.user.id);
        }
      })
      .catch(() => {});
  }, []);

  const openCreateModal = () => {
    setName("");
    setEmail("");
    setPassword("");
    setErrors({});
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setErrors({});
  };

  const openPasswordModal = (user: UserItem) => {
    setTargetUser(user);
    setNewPassword("");
    setErrors({});
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setTargetUser(null);
    setErrors({});
  };

  // Cadastro de Novo Atendente (FRAME-7)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: "ATENDENTE",
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/gestao/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.status === 201) {
          const created = await res.json();
          setStatusMessage({
            type: "success",
            text: `Operador "${created.name}" cadastrado com sucesso! Já pode realizar login na bilheteria.`,
          });
          closeCreateModal();
          fetchUsers();
        } else {
          const errJson = await res.json().catch(() => null);
          if (res.status === 422 && errJson?.errors) {
            const mapped: FormErrors = {};
            for (const err of errJson.errors) {
              if (err.field === "name") mapped.name = err.message;
              if (err.field === "email") mapped.email = err.message;
              if (err.field === "password") mapped.password = err.message;
            }
            setErrors(mapped);
          } else {
            setErrors({ general: errJson?.error || "Nao foi possivel cadastrar o atendente." });
          }
        }
      } catch {
        setErrors({ general: "Erro de conexao ao tentar cadastrar atendente." });
      }
    });
  };

  // Toggle Ativo / Inativo
  const handleToggleStatus = async (user: UserItem) => {
    const actionLabel = user.active ? "inativar" : "ativar";
    if (user.id === currentUserId) {
      alert("Operacao bloqueada: O gerente nao pode inativar a propria conta.");
      return;
    }

    if (!confirm(`Deseja realmente ${actionLabel} a conta do operador ${user.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/gestao/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });

      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `Conta de "${user.name}" ${user.active ? "inativada" : "ativada"} com sucesso.`,
        });
        fetchUsers();
      } else {
        const err = await res.json().catch(() => null);
        setStatusMessage({
          type: "error",
          text: err?.error || "Nao foi possivel alterar o status do operador.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Erro de rede ao alterar status do operador.",
      });
    }
  };

  // Redefinir Senha do Atendente
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    setErrors({});

    if (newPassword.length < 6) {
      setErrors({ password: "A nova senha deve possuir no minimo 6 caracteres." });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/gestao/usuarios/${targetUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        });

        if (res.ok) {
          setStatusMessage({
            type: "success",
            text: `Senha de "${targetUser.name}" redefinida com sucesso.`,
          });
          closePasswordModal();
        } else {
          const err = await res.json().catch(() => null);
          setErrors({ general: err?.error || "Nao foi possivel redefinir a senha." });
        }
      } catch {
        setErrors({ general: "Erro ao tentar redefinir senha do operador." });
      }
    });
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#0E1322] text-neutralBg font-sans flex flex-col selection:bg-cta selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 liquid-glass-card border-x-0 border-t-0 rounded-none text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/gestao"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-cta/15 text-cta border border-cta/30 flex items-center justify-center shadow-lg shadow-cta/10">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Gestão de Atendentes</h1>
              <p className="text-xs text-slate-400">
                Ativação e credenciais de operadores da bilheteria do cinema
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-cta hover:bg-cta-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-cta/25 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Atendente</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        {/* Banner de Feedback */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm shadow-md border ${
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar de Pesquisa */}
        <div className="liquid-glass-card p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 border border-white/10">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar operador por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none border-borderDark focus:border-cta"
            />
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Total: <span className="font-bold text-white">{filteredUsers.length}</span> usuários listados
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="liquid-glass-card rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#12182B] border-b border-borderDark text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4">Perfil</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Cadastro</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <div className="w-8 h-8 border-2 border-cta border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      Carregando equipe de operadores...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <p className="font-semibold text-white">Nenhum atendente encontrado.</p>
                      <p className="text-xs text-slate-500 mt-1">Clique em &quot;Novo Atendente&quot; para cadastrar.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-4 font-semibold text-white flex items-center gap-2">
                        <span>{u.name}</span>
                        {u.id === currentUserId && (
                          <span className="text-[10px] bg-cta/20 text-cta border border-cta/30 font-bold px-2 py-0.5 rounded-full">
                            Você
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-mono text-xs">{u.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            u.role === "GERENTE"
                              ? "bg-purple-950/60 border-purple-500/30 text-purple-300"
                              : "bg-blue-950/60 border-blue-500/30 text-blue-300"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            u.active
                              ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300"
                              : "bg-rose-950/60 border-rose-500/30 text-rose-300"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.active ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                            }`}
                          />
                          {u.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Botão Redefinir Senha */}
                        <button
                          onClick={() => openPasswordModal(u)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                          title="Redefinir Senha"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          <span>Senha</span>
                        </button>

                        {/* Botão Ativar/Inativar */}
                        {u.id === currentUserId ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-slate-500 p-2 cursor-not-allowed"
                            title="Conta logada"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Protegido</span>
                          </span>
                        ) : u.active ? (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-950/40 transition-colors"
                            title="Inativar Atendente"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Inativar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-950/40 transition-colors"
                            title="Ativar Atendente"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Ativar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Cadastro de Atendente (FRAME-7) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="liquid-glass-card bg-[#161F36] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-borderDark animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 flex items-center justify-between border-b border-borderDark/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cta/15 text-cta flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base text-white">Novo Atendente</h2>
              </div>
              <button
                onClick={closeCreateModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {errors.general && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome Completo <span className="text-cta">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border ${
                    errors.name ? "border-rose-500 bg-rose-950/20" : "border-borderDark focus:border-cta"
                  } focus:outline-none`}
                />
                {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  E-mail de Acesso <span className="text-cta">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ex: joao@cinema.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border ${
                    errors.email ? "border-rose-500 bg-rose-950/20" : "border-borderDark focus:border-cta"
                  } focus:outline-none`}
                />
                {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Senha Inicial */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha Inicial (mínimo 6 caracteres) <span className="text-cta">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border ${
                    errors.password ? "border-rose-500 bg-rose-950/20" : "border-borderDark focus:border-cta"
                  } focus:outline-none`}
                />
                {errors.password && (
                  <p className="text-rose-400 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Perfil Fixo (FRAME-7) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Perfil de Acesso
                </label>
                <select
                  disabled
                  value="ATENDENTE"
                  className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-slate-400 bg-[#0E1322] border border-borderDark cursor-not-allowed"
                >
                  <option value="ATENDENTE">ATENDENTE (Operador de Bilheteria)</option>
                </select>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Apenas GERENTE pode criar usuários. Perfil fixo: ATENDENTE.</span>
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-borderDark/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-cta hover:bg-cta-hover rounded-xl shadow-lg shadow-cta/25 disabled:opacity-50 transition-all"
                >
                  {isPending ? "Cadastrando..." : "Criar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Redefinir Senha */}
      {isPasswordModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-card bg-[#161F36] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-borderDark animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4.5 flex items-center justify-between border-b border-borderDark/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cta/15 text-cta flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-sm text-white">Redefinir Senha</h2>
              </div>
              <button
                onClick={closePasswordModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Defina uma nova senha de acesso para o operador{" "}
                <span className="font-bold text-white">{targetUser.name}</span>.
              </p>

              {errors.general && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-200 text-xs">
                  {errors.general}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border ${
                    errors.password ? "border-rose-500 bg-rose-950/20" : "border-borderDark focus:border-cta"
                  } focus:outline-none`}
                />
                {errors.password && (
                  <p className="text-rose-400 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div className="pt-3 border-t border-borderDark/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-bold text-white bg-cta hover:bg-cta-hover rounded-xl shadow-lg shadow-cta/25 disabled:opacity-50 transition-all"
                >
                  {isPending ? "Salvando..." : "Salvar Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
