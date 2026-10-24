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
    <div className="min-h-screen bg-[#F5F5F5] text-[#2D2D2D] font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 liquid-glass-card border-x-0 border-t-0 rounded-none text-white shadow-xl">
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
              <FilmIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Catálogo de Filmes</h1>
              <p className="text-xs text-gray-400">
                Gestão e programação do acervo cinematográfico do cinema
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#E94560] hover:bg-[#d63d56] text-white text-sm font-semibold px-4 py-2.5 rounded-md shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Filme</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Toast Status */}
        {statusMessage && (
          <div
            className={`flex items-center justify-between p-4 rounded-md border text-sm ${
              statusMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="liquid-glass-card-light p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar filme por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm liquid-glass-input-light rounded-xl focus:outline-none"
            />
          </div>
          <div className="text-xs text-gray-500">
            Total de filmes cadastrados: <strong>{films.length}</strong>
          </div>
        </div>

        {/* Movies Table Card (FRAME-5) */}
        <div className="liquid-glass-card-light rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">Filme</th>
                  <th className="py-3.5 px-4">Diretor</th>
                  <th className="py-3.5 px-4">Duração</th>
                  <th className="py-3.5 px-4">Classificação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                      Carregando catálogo de filmes...
                    </td>
                  </tr>
                ) : films.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <FilmIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <p className="font-medium">Nenhum filme encontrado no catálogo.</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Clique no botão &ldquo;+ Novo Filme&rdquo; acima para cadastrar o primeiro título.
                      </p>
                    </td>
                  </tr>
                ) : (
                  films.map((film) => (
                    <tr
                      key={film.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {film.posterUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={film.posterUrl}
                              alt={film.title}
                              className="w-10 h-14 object-cover rounded shadow-sm border border-gray-200 bg-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400">
                              <FilmIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-[#E94560] transition-colors">
                              {film.title}
                            </div>
                            {film.synopsis && (
                              <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">
                                {film.synopsis}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {film.director || <span className="text-gray-400 italic">Não informado</span>}
                      </td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{film.durationMinutes} min</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700 border border-gray-300">
                          {film.rating || "Livre"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(film)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors"
                          title="Editar Filme"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => handleDelete(film)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="liquid-glass-card-light rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="liquid-glass-card text-white px-6 py-4 flex items-center justify-between border-x-0 border-t-0 rounded-none">
              <div className="flex items-center gap-2.5">
                <FilmIcon className="w-5 h-5 text-[#E94560]" />
                <h2 className="font-bold text-base">
                  {editingFilm ? "Editar Filme" : "Cadastrar Novo Filme"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Título do Filme <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Duna: Parte Dois"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560] ${
                    errors.title ? "border-red-500 bg-red-50/50" : "border-gray-300"
                  }`}
                />
                {errors.title && (
                  <p className="text-red-600 text-xs mt-1">{errors.title}</p>
                )}
              </div>

              {/* Duração & Classificação em Linha */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Duração (minutos) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Ex: 166"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560] ${
                      errors.durationMinutes
                        ? "border-red-500 bg-red-50/50"
                        : "border-gray-300"
                    }`}
                  />
                  {errors.durationMinutes && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.durationMinutes}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Classificação Indicativa
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560] bg-white"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Diretor
                </label>
                <input
                  type="text"
                  placeholder="Ex: Denis Villeneuve"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560]"
                />
              </div>

              {/* URL do Pôster */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  URL do Pôster (Imagem)
                </label>
                <input
                  type="text"
                  placeholder="Ex: /posters/duna-2.jpg ou https://..."
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560]"
                />
              </div>

              {/* Sinopse */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Sinopse
                </label>
                <textarea
                  rows={3}
                  placeholder="Breve resumo sobre o enredo do filme..."
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E94560]"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#E94560] hover:bg-[#d63d56] rounded-md shadow disabled:opacity-50 transition-colors"
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
