import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { evaluateRouteAccess } from "@/modules/auth/rbac-rules";

/**
 * Componente C-2: RBACGuard & Tenancy Context Injection.
 * Intercepta requisicoes e aplica controle estrito de perfis conforme AC-5.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // AC-5 / DoD: Operador inativado perde acesso a aplicacao imediatamente
  if (token && token.active === false) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Conta inativada pelo gerente. Acesso revogado imediatamente." },
        { status: 403 }
      );
    }
    const loginUrl = new URL("/auth/login?error=ContaInativa", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token?.role as string | undefined;
  const accessResult = evaluateRouteAccess(pathname, userRole);

  if (!accessResult.allowed) {
    // Para rotas de API, responde compulsoriamente em JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: accessResult.reason || "Acesso negado" },
        { status: accessResult.statusCode }
      );
    }

    // Se nao autenticado, redireciona para login
    if (accessResult.statusCode === 401) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Se autenticado mas sem permissao (ex: ATENDENTE em rota gerencial), responde com 403
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#1A1A2E;color:#F5F5F5;display:flex;align-items:center;justify-content:center;height:100vh;"><div style="text-align:center;"><h1>403 Forbidden</h1><p>${accessResult.reason}</p><a href="/" style="color:#E94560;">Voltar ao Inicio</a></div></body></html>`,
      {
        status: 403,
        headers: { "content-type": "text/html; charset=utf-8" },
      }
    );
  }

  const response = NextResponse.next();

  // Injeta o tenant_id no header de resposta/contexto se disponivel
  if (token?.tenantId) {
    response.headers.set("x-tenant-id", token.tenantId as string);
  }

  return response;
}

export const config = {
  matcher: [
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
  ],
};
