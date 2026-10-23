export interface RouteAccessResult {
  allowed: boolean;
  statusCode: 200 | 401 | 403;
  reason?: string;
}

export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Validador estrito de politicas RBAC (Componente C-2 / AC-5).
 * - Rotas gerenciais (/backoffice, /admin, /gerente, /api/filmes, etc.) exigem compulsoriamente GERENTE.
 * - ATENDENTE e CLIENTE recebem HTTP 403 Forbidden se tentarem acessar rotas gerenciais.
 * - Rotas operacionais (/bilheteria) sao acessiveis por ATENDENTE e GERENTE.
 */
export function evaluateRouteAccess(pathname: string, userRole?: string): RouteAccessResult {
  // Endpoint de polling de assentos (AC-2 / US-5 / TC-17): acessivel por ATENDENTE, GERENTE e CLIENTE
  const isAssentosPollingRoute =
    pathname.startsWith("/api/sessoes/") && pathname.endsWith("/assentos");

  if (isAssentosPollingRoute) {
    if (!userRole) {
      return {
        allowed: false,
        statusCode: 401,
        reason: "Autenticacao obrigatoria para consultar mapa de assentos.",
      };
    }
    if (userRole === "ATENDENTE" || userRole === "GERENTE" || userRole === "CLIENTE") {
      return { allowed: true, statusCode: 200 };
    }
    return {
      allowed: false,
      statusCode: 403,
      reason: `Acesso negado: Perfil ${userRole} nao possui autorizacao para consultar assentos.`,
    };
  }

  const isBackofficeRoute =
    pathname.startsWith("/backoffice") ||
    pathname.startsWith("/api/backoffice") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/gerente") ||
    pathname.startsWith("/api/gerente") ||
    pathname.startsWith("/api/filmes") ||
    pathname.startsWith("/api/salas") ||
    pathname.startsWith("/api/sessoes") ||
    pathname.startsWith("/api/usuarios");

  const isBilheteriaRoute =
    pathname.startsWith("/bilheteria") ||
    pathname.startsWith("/api/bilheteria") ||
    pathname.startsWith("/api/vendas");

  // Se nao requer perfil restrito, permite
  if (!isBackofficeRoute && !isBilheteriaRoute) {
    return { allowed: true, statusCode: 200 };
  }

  // Se a rota eh restrita e nao ha usuario autenticado
  if (!userRole) {
    return {
      allowed: false,
      statusCode: 401,
      reason: "Autenticacao obrigatoria para acessar este recurso.",
    };
  }

  // AC-5 / TC-5 / TC-13: Regra estrita de Backoffice: apenas GERENTE
  if (isBackofficeRoute) {
    if (userRole === "GERENTE") {
      return { allowed: true, statusCode: 200 };
    }
    return {
      allowed: false,
      statusCode: 403,
      reason: `Acesso negado: Perfil ${userRole} nao possui autorizacao para rotas administrativas (AC-5 / TC-5 / TC-13).`,
    };
  }

  // Regra de Bilheteria / PDV: ATENDENTE ou GERENTE
  if (isBilheteriaRoute) {
    if (userRole === "ATENDENTE" || userRole === "GERENTE") {
      return { allowed: true, statusCode: 200 };
    }
    return {
      allowed: false,
      statusCode: 403,
      reason: "Acesso restrito a operadores de bilheteria e gerentes.",
    };
  }

  return { allowed: true, statusCode: 200 };
}
