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
      const response = await fetch("/api/backoffice/usuarios");
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
        const res = await fetch("/api/backoffice/usuarios", {
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
      const res = await fetch(`/api/backoffice/usuarios/${user.id}`, {
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
        const res = await fetch(`/api/backoffice/usuarios/${targetUser.id}`, {
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
    <div className="min-h-screen bg-[#F5F5F5] text-[#2D2D2D] font-sans">
      {/* Top Header */}
      <header className="bg-[#1A1A2E] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/backoffice"
              className="p-2 rounded hover:bg-white/10 text-gray-300 transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2 bg-[#E94560]/20 rounded text-[#E94560]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestão de Atendentes</h1>
              <p className="text-xs text-gray-400">
                Ativação e credenciais de operadores de bilheteria do cinema (AC-5 / US-6)
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#E94560] hover:bg-[#d63d56] text-white text-sm font-semibold px-4 py-2.5 rounded-md shadow transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Atendente</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Banner de Feedback */}
        {statusMessage && (
          <div
            className={`p-4 rounded-md flex items-center justify-between gap-3 text-sm shadow-xs border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar de Pesquisa */}
        <div className="bg-white p-4 rounded-lg shadow-xs border border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar operador por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560]"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Total: <span className="font-bold text-gray-800">{filteredUsers.length}</span> usuários listados
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-lg shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Nome</th>
                  <th className="px-6 py-3.5">E-mail</th>
                  <th className="px-6 py-3.5">Perfil</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Cadastro</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Carregando equipe de operadores...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Nenhum atendente encontrado. Clique em &quot;Novo Atendente&quot; para cadastrar.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                        <span>{u.name}</span>
                        {u.id === currentUserId && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                            Você
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">{u.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            u.role === "GERENTE"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            u.active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.active ? "bg-emerald-600" : "bg-red-600"
                            }`}
                          />
                          {u.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Botão Redefinir Senha */}
                        <button
                          onClick={() => openPasswordModal(u)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-black p-1.5 rounded hover:bg-gray-100 transition-colors"
                          title="Redefinir Senha"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                          <span>Senha</span>
                        </button>

                        {/* Botão Ativar/Inativar */}
                        {u.id === currentUserId ? (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-gray-400 p-1.5 cursor-not-allowed"
                            title="Conta logada"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Protegido</span>
                          </span>
                        ) : u.active ? (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors"
                            title="Inativar Atendente"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Inativar</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 p-1.5 rounded hover:bg-emerald-50 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#1A1A2E] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-[#E94560]" />
                <h2 className="font-bold text-base">Novo Atendente (FRAME-7)</h2>
              </div>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560] ${
                    errors.name ? "border-red-500 bg-red-50/50" : "border-gray-300"
                  }`}
                />
                {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  E-mail de Acesso <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ex: joao@cinema.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560] ${
                    errors.email ? "border-red-500 bg-red-50/50" : "border-gray-300"
                  }`}
                />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Senha Inicial */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Senha Inicial (mínimo 6 caracteres) <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560] ${
                    errors.password ? "border-red-500 bg-red-50/50" : "border-gray-300"
                  }`}
                />
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              {/* Perfil Fixo (FRAME-7) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  disabled
                  value="ATENDENTE"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                >
                  <option value="ATENDENTE">ATENDENTE (Operador de Bilheteria)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Apenas GERENTE pode criar usuários. Perfil fixo: ATENDENTE.</span>
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#E94560] hover:bg-[#d63d56] rounded-md shadow disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#1A1A2E] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#E94560]" />
                <h2 className="font-bold text-sm">Redefinir Senha</h2>
              </div>
              <button
                onClick={closePasswordModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                Defina uma nova senha de acesso para o operador{" "}
                <span className="font-bold text-gray-900">{targetUser.name}</span>.
              </p>

              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                  {errors.general}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560] ${
                    errors.password ? "border-red-500 bg-red-50/50" : "border-gray-300"
                  }`}
                />
                {errors.password && (
                  <p className="text-red-600 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#E94560] hover:bg-[#d63d56] rounded-md shadow disabled:opacity-50"
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
