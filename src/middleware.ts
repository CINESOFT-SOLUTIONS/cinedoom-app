import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { evaluateRouteAccess } from "@/modules/auth/rbac-rules";

/**
 * Componente C-2: RBACGuard, Tenancy Context & Distributed Tracing Injection.
 * Intercepta requisicoes e aplica controle estrito de perfis conforme AC-5.
 * Propaga x-request-id para rastreabilidade de ponta a ponta no Axiom (ADR-011 / TASK-15).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // AC-5 / DoD: Operador inativado perde acesso a aplicacao imediatamente
  if (token && token.active === false) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: "Conta inativada pelo gerente. Acesso revogado imediatamente." },
        { status: 403 }
      );
      res.headers.set("x-request-id", requestId);
      return res;
    }
    const loginUrl = new URL("/auth/login?error=ContaInativa", request.url);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const userRole = token?.role as string | undefined;
  const accessResult = evaluateRouteAccess(pathname, userRole);

  if (!accessResult.allowed) {
    // Para rotas de API, responde compulsoriamente em JSON
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: accessResult.reason || "Acesso negado" },
        { status: accessResult.statusCode }
      );
      res.headers.set("x-request-id", requestId);
      return res;
    }

    // Se nao autenticado, redireciona para login
    if (accessResult.statusCode === 401) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.headers.set("x-request-id", requestId);
      return res;
    }

    // Se autenticado mas sem permissao (ex: ATENDENTE em rota gerencial), responde com 403 padronizado CineDoom
    const friendlyReason =
      userRole === "ATENDENTE"
        ? "Seu perfil de Atendente tem acesso à bilheteria e vendas, mas não às áreas administrativas."
        : userRole === "CLIENTE"
        ? "Esta área é restrita a colaboradores do CineDoom."
        : "Você não possui permissão para acessar esta página.";

    const res = new NextResponse(
      `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>403 - Acesso Proibido | CineDoom</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #070A12;
      color: #F8FAFC;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .wrapper {
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo-container {
      margin-bottom: 2rem;
      display: flex;
      justify-content: center;
    }
    .logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }
    .card {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 1.5rem;
      padding: 2rem 1.5rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .icon-badge {
      width: 56px;
      height: 56px;
      border-radius: 1rem;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.25rem;
      color: #F87171;
    }
    .code {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #FFFFFF;
      line-height: 1;
      margin-bottom: 0.5rem;
    }
    .title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #E2E8F0;
      margin-bottom: 0.5rem;
    }
    .desc {
      font-size: 0.8125rem;
      color: #94A3B8;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 0.75rem;
      background: #E94560;
      color: #FFFFFF;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.025em;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 8px 16px rgba(233, 69, 96, 0.25);
    }
    .btn:hover {
      background: #D83A53;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <img src="/logos/cinedoom-logo-horizontal-white.png" alt="CineDoom" class="logo" />
    </div>
    <div class="card">
      <div class="icon-badge">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
        </svg>
      </div>
      <div class="code">403</div>
      <h1 class="title">Acesso Restrito</h1>
      <p class="desc">${friendlyReason}</p>
      <a href="/" class="btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Voltar ao Início</span>
      </a>
    </div>
  </div>
</body>
</html>`,
      {
        status: 403,
        headers: { "content-type": "text/html; charset=utf-8" },
      }
    );
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const response = NextResponse.next();

  // Injeta o x-request-id para correlacao no Axiom e Vercel Log Drain
  response.headers.set("x-request-id", requestId);

  // Injeta o tenant_id no header de resposta/contexto se disponivel
  if (token?.tenantId) {
    response.headers.set("x-tenant-id", token.tenantId as string);
  }

  return response;
}

export const config = {
  matcher: [
    "/gestao",
    "/gestao/:path*",
    "/api/gestao",
    "/api/gestao/:path*",
    "/backoffice",
    "/backoffice/:path*",
    "/api/backoffice",
    "/api/backoffice/:path*",
    "/admin",
    "/admin/:path*",
    "/api/admin",
    "/api/admin/:path*",
    "/gerente",
    "/gerente/:path*",
    "/api/gerente",
    "/api/gerente/:path*",
    "/bilheteria",
    "/bilheteria/:path*",
    "/api/bilheteria",
    "/api/bilheteria/:path*",
    "/api/vendas",
    "/api/vendas/:path*",
    "/api/ingressos",
    "/api/ingressos/:path*",
    "/api/filmes",
    "/api/filmes/:path*",
    "/api/salas",
    "/api/salas/:path*",
    "/api/sessoes",
    "/api/sessoes/:path*",
    "/api/usuarios",
    "/api/usuarios/:path*",
    "/api/titulares",
    "/api/titulares/:path*",
  ],
};
