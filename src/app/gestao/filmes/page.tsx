"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Film as FilmIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
} from "lucide-react";
import { AuthProfileMenu } from "@/components/auth-profile-menu";

interface FilmItem {
  id: string;
  title: string;
  durationMinutes: number;
  director: string | null;
  rating: string | null;
  synopsis: string | null;
  posterUrl: string | null;
  createdAt: string;
  _count?: {
    sessions: number;
  };
}

interface FormErrors {
  title?: string;
  durationMinutes?: string;
  director?: string;
  rating?: string;
  synopsis?: string;
  posterUrl?: string;
  general?: string;
}

export default function CatalogoFilmesPage() {
  const [films, setFilms] = useState<FilmItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState<FilmItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [director, setDirector] = useState("");
  const [rating, setRating] = useState("Livre");
  const [synopsis, setSynopsis] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const fetchFilms = async (searchQuery = "") => {
    setIsLoading(true);
    try {
      const url = searchQuery
        ? `/api/filmes?busca=${encodeURIComponent(searchQuery)}`
        : "/api/filmes";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFilms(data);
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Falha ao carregar o catalogo de filmes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilms(searchTerm);
  }, [searchTerm]);

  const openCreateModal = () => {
    setEditingFilm(null);
    setTitle("");
    setDurationMinutes("");
    setDirector("");
    setRating("Livre");
    setSynopsis("");
    setPosterUrl("");
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (film: FilmItem) => {
    setEditingFilm(film);
    setTitle(film.title);
    setDurationMinutes(String(film.durationMinutes));
    setDirector(film.director || "");
    setRating(film.rating || "Livre");
    setSynopsis(film.synopsis || "");
    setPosterUrl(film.posterUrl || "");
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingFilm(null);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      title: title.trim(),
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      director: director.trim() || null,
      rating: rating || null,
      synopsis: synopsis.trim() || null,
      posterUrl: posterUrl.trim() || null,
    };

    const isEditing = Boolean(editingFilm);
    const endpoint = isEditing ? `/api/filmes/${editingFilm?.id}` : "/api/filmes";
    const method = isEditing ? "PUT" : "POST";

    startTransition(async () => {
      try {
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.status === 201 || res.status === 200) {
          setStatusMessage({
            type: "success",
            text: isEditing
              ? "Filme atualizado com sucesso!"
              : "Filme cadastrado com sucesso no catalogo!",
          });
          closeModal();
          fetchFilms(searchTerm);
          return;
        }

        if (res.status === 422) {
          const errorData = await res.json();
          const fieldErrors: FormErrors = {};
          if (Array.isArray(errorData.errors)) {
            errorData.errors.forEach((err: { field: string; message: string }) => {
              if (err.field === "title") fieldErrors.title = err.message;
              else if (err.field === "durationMinutes")
                fieldErrors.durationMinutes = err.message;
              else if (err.field === "director") fieldErrors.director = err.message;
              else if (err.field === "rating") fieldErrors.rating = err.message;
              else fieldErrors.general = err.message;
            });
          }
          setErrors(fieldErrors);
          return;
        }

        const errJson = await res.json().catch(() => null);
        setErrors({
          general: errJson?.error || "Ocorreu um erro ao processar a operacao.",
        });
      } catch {
        setErrors({
          general: "Erro de conexao com o servidor.",
        });
      }
    });
  };

  const handleDelete = async (film: FilmItem) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir o filme "${film.title}" do catalogo? Esta acao nao pode ser desfeita.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/filmes/${film.id}`, {
        method: "DELETE",
      });

      if (res.status === 204) {
        setStatusMessage({
          type: "success",
          text: `Filme "${film.title}" excluido com sucesso.`,
        });
        fetchFilms(searchTerm);
      } else {
        const errJson = await res.json().catch(() => null);
        setStatusMessage({
          type: "error",
          text: errJson?.error || "Nao foi possivel excluir o filme.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Erro de comunicacao ao tentar excluir filme.",
      });
    }
  };

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
              <FilmIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Catálogo de Filmes</h1>
              <p className="text-xs text-slate-400">
                Gestão e programação do acervo cinematográfico do cinema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-cta hover:bg-cta-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-cta/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Filme</span>
            </button>
            <AuthProfileMenu />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        {/* Toast Status */}
        {statusMessage && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl border text-sm shadow-md ${
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="liquid-glass-card p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-white/10">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar filme por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none border-borderDark focus:border-cta"
            />
          </div>
          <div className="text-xs text-slate-400">
            Total de filmes cadastrados: <strong className="text-white font-semibold">{films.length}</strong>
          </div>
        </div>

        {/* Movies Table Card (FRAME-5) */}
        <div className="liquid-glass-card rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#12182B] border-b border-borderDark text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-4 px-5">Filme</th>
                  <th className="py-4 px-5">Diretor</th>
                  <th className="py-4 px-5">Duração</th>
                  <th className="py-4 px-5">Classificação</th>
                  <th className="py-4 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                      <div className="w-8 h-8 border-2 border-cta border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      Carregando catálogo de filmes...
                    </td>
                  </tr>
                ) : films.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <FilmIcon className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                      <p className="font-semibold text-white">Nenhum filme encontrado no catálogo.</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Clique no botão &ldquo;+ Novo Filme&rdquo; acima para cadastrar o primeiro título.
                      </p>
                    </td>
                  </tr>
                ) : (
                  films.map((film) => (
                    <tr
                      key={film.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          {film.posterUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={film.posterUrl}
                              alt={film.title}
                              className="w-10 h-14 object-cover rounded-lg shadow-md border border-borderDark bg-[#0A0E1A]"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-[#0A0E1A] rounded-lg border border-borderDark flex items-center justify-center text-slate-500">
                              <FilmIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white group-hover:text-cta transition-colors">
                              {film.title}
                            </div>
                            {film.synopsis && (
                              <p className="text-xs text-slate-400 line-clamp-1 max-w-xs mt-0.5">
                                {film.synopsis}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-300">
                        {film.director || <span className="text-slate-500 italic">Não informado</span>}
                      </td>
                      <td className="py-3.5 px-5 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cta" />
                          <span>{film.durationMinutes} min</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-white/5 text-slate-300 border border-white/10">
                          {film.rating || "Livre"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(film)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 p-2 rounded-lg hover:bg-sky-950/40 transition-colors"
                          title="Editar Filme"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDelete(film)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-950/40 transition-colors"
                          title="Excluir Filme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal de Cadastro / Edição de Filme */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="liquid-glass-card bg-[#161F36] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-borderDark animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 flex items-center justify-between border-b border-borderDark/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cta/15 text-cta flex items-center justify-center">
                  <FilmIcon className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-base text-white">
                  {editingFilm ? "Editar Filme" : "Cadastrar Novo Filme"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errors.general && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Título do Filme <span className="text-cta">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Duna: Parte Dois"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none border ${
                    errors.title ? "border-rose-500 bg-rose-950/20" : "border-borderDark focus:border-cta"
                  }`}
                />
                {errors.title && (
                  <p className="text-rose-400 text-xs mt-1">{errors.title}</p>
                )}
              </div>

              {/* Duração & Classificação em Linha */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duração (minutos) <span className="text-cta">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Ex: 166"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 focus:outline-none border ${
                      errors.durationMinutes
                        ? "border-rose-500 bg-rose-950/20"
                        : "border-borderDark focus:border-cta"
                    }`}
                  />
                  {errors.durationMinutes && (
                    <p className="text-rose-400 text-xs mt-1">
                      {errors.durationMinutes}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Classificação Indicativa
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white bg-[#0E1322] border border-borderDark focus:border-cta focus:outline-none"
                  >
                    <option value="Livre">Livre</option>
                    <option value="10">10 anos</option>
                    <option value="12">12 anos</option>
                    <option value="14">14 anos</option>
                    <option value="16">16 anos</option>
                    <option value="18">18 anos</option>
                  </select>
                </div>
              </div>

              {/* Diretor */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Diretor
                </label>
                <input
                  type="text"
                  placeholder="Ex: Denis Villeneuve"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none"
                />
              </div>

              {/* URL do Pôster */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL do Pôster (Imagem)
                </label>
                <input
                  type="text"
                  placeholder="Ex: /posters/duna-2.jpg ou https://..."
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none"
                />
              </div>

              {/* Sinopse */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sinopse
                </label>
                <textarea
                  rows={3}
                  placeholder="Breve resumo sobre o enredo do filme..."
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm liquid-glass-input rounded-xl text-white placeholder-slate-500 border border-borderDark focus:border-cta focus:outline-none"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-borderDark/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-cta hover:bg-cta-hover rounded-xl shadow-lg shadow-cta/25 disabled:opacity-50 transition-all"
                >
                  {isPending
                    ? "Salvando..."
                    : editingFilm
                    ? "Salvar Alterações"
                    : "Cadastrar Filme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
