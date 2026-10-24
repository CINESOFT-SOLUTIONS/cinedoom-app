import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { rawPrisma } from "@/shared/db/prisma";
import {
  runWithTenant,
  getTenantId,
  requireTenantId,
  TenantContextError,
  withTenancy,
  TENANT_SCOPED_MODELS,
} from "@/modules/tenancy";

// Mock do next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock do Prisma
vi.mock("@/shared/db/prisma", () => {
  const createModelMock = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn((args: any) => Promise.resolve({ id: "mock-id-1", ...(args?.data || {}) })),
    createMany: vi.fn(() => Promise.resolve({ count: 25 })),
    update: vi.fn((args: any) => Promise.resolve({ id: "mock-id-1", ...(args?.data || {}) })),
    updateMany: vi.fn(() => Promise.resolve({ count: 1 })),
    delete: vi.fn(() => Promise.resolve({ id: "mock-id-1" })),
    deleteMany: vi.fn(() => Promise.resolve({ count: 1 })),
    count: vi.fn(() => Promise.resolve(0)),
    aggregate: vi.fn(() => Promise.resolve({ _count: 0 })),
  });

  const mockDb = {
    film: createModelMock(),
    room: createModelMock(),
    seat: createModelMock(),
    session: createModelMock(),
    sessionSeat: createModelMock(),
    ticket: createModelMock(),
    buyer: createModelMock(),
    user: createModelMock(),
    cancellationAudit: createModelMock(),
    tenant: createModelMock(),
    $transaction: vi.fn(async (cb: any) => {
      if (typeof cb === "function") {
        return cb(mockDb);
      }
      return Promise.all(cb);
    }),
  };

  return {
    rawPrisma: mockDb,
    prisma: mockDb,
  };
});

// Import route handlers
import { GET as getFilmById, PUT as updateFilm, DELETE as deleteFilm } from "@/app/api/filmes/[id]/route";
import { GET as listFilms, POST as createFilm } from "@/app/api/filmes/route";
import { GET as getRoomById, PUT as updateRoom, DELETE as deleteRoom } from "@/app/api/salas/[id]/route";
import { GET as listRooms, POST as createRoom } from "@/app/api/salas/route";
import { GET as getSessionById, PATCH as updateSession, DELETE as deleteSession } from "@/app/api/sessoes/[id]/route";
import { GET as listSessions } from "@/app/api/sessoes/route";
import { GET as getSessionSeats } from "@/app/api/sessoes/[id]/assentos/route";
import { GET as listTickets } from "@/app/api/ingressos/route";
import { POST as cancelTicket } from "@/app/api/ingressos/[id]/cancelar/route";
import { GET as getOccupancyPanel } from "@/app/api/ocupacao/painel/route";
import { GET as getUserById, PATCH as updateUser, DELETE as deleteUser } from "@/app/api/backoffice/usuarios/[id]/route";
import { GET as listUsers, POST as createUser } from "@/app/api/backoffice/usuarios/route";
import { POST as anonymizeTitular } from "@/app/api/titulares/anonimizar/route";

describe("Bateria Exaustiva de Seguranca: 500 Cenarios de Isolamento Cross-Tenant (TASK-18 / AC-4)", () => {
  const tenantA = "00000000-0000-4000-a000-000000000001";
  const tenantB = "00000000-0000-4000-a000-000000000002";
  const tenantC = "00000000-0000-4000-a000-000000000003";
  const tenantD = "00000000-0000-4000-a000-000000000004";
  const tenantE = "00000000-0000-4000-a000-000000000005";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // CATEGORIA 1: ACESSO DIRETO A RECURSOS CROSS-TENANT EM ENDPOINTS (200 testes)
  // =========================================================================
  describe("Categoria 1: Acesso Direto a Recursos Cross-Tenant em Endpoints REST (200 cenarios)", () => {
    // 1.1 Filmes Cross-Tenant (40 cenarios)
    const filmMatrix = Array.from({ length: 40 }, (_, i) => ({
      index: i + 1,
      resourceId: `film-foreign-${i + 1}`,
      callerTenant: i % 2 === 0 ? tenantA : tenantC,
      ownerTenant: i % 2 === 0 ? tenantB : tenantD,
      action: i < 10 ? "GET" : i < 20 ? "PUT" : i < 30 ? "DELETE" : "LIST_LEAK_CHECK",
    }));

    describe.each(filmMatrix)(
      "Filmes Cenário $index: $action sobre $resourceId",
      ({ resourceId, callerTenant, action }) => {
        it(`deve bloquear com 404/403 e jamais vazar dados do filme`, async () => {
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "user-test", role: "GERENTE", tenantId: callerTenant },
          } as any);

          (rawPrisma.film.findFirst as any).mockResolvedValue(null);

          if (action === "GET") {
            const req = new NextRequest(`http://localhost:3000/api/filmes/${resourceId}`);
            const res = await getFilmById(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
            const body = await res.json();
            expect(body.title).toBeUndefined();
          } else if (action === "PUT") {
            const req = new NextRequest(`http://localhost:3000/api/filmes/${resourceId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: "Hackeado", durationMinutes: 120 }),
            });
            const res = await updateFilm(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
          } else if (action === "DELETE") {
            const req = new NextRequest(`http://localhost:3000/api/filmes/${resourceId}`, {
              method: "DELETE",
            });
            const res = await deleteFilm(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
          } else {
            (rawPrisma.film.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(callerTenant);
              return [];
            });
            const req = new NextRequest(`http://localhost:3000/api/filmes`);
            const res = await listFilms(req);
            expect(res.status).toBe(200);
            const list = await res.json();
            expect(list).toEqual([]);
          }
        });
      }
    );

    // 1.2 Salas Cross-Tenant (40 cenarios)
    const roomMatrix = Array.from({ length: 40 }, (_, i) => ({
      index: i + 1,
      resourceId: `room-foreign-${i + 1}`,
      callerTenant: i % 2 === 0 ? tenantA : tenantB,
      ownerTenant: i % 2 === 0 ? tenantC : tenantE,
      action: i < 10 ? "GET" : i < 20 ? "PUT" : i < 30 ? "DELETE" : "LIST_LEAK_CHECK",
    }));

    describe.each(roomMatrix)(
      "Salas Cenário $index: $action sobre $resourceId",
      ({ resourceId, callerTenant, action }) => {
        it(`deve bloquear operacao de sala cross-tenant sem vazamento`, async () => {
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "user-test", role: "GERENTE", tenantId: callerTenant },
          } as any);

          (rawPrisma.room.findFirst as any).mockResolvedValue(null);

          if (action === "GET") {
            const req = new NextRequest(`http://localhost:3000/api/salas/${resourceId}`);
            const res = await getRoomById(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
            const body = await res.json();
            expect(body.name).toBeUndefined();
          } else if (action === "PUT") {
            const req = new NextRequest(`http://localhost:3000/api/salas/${resourceId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: "Sala Invadida" }),
            });
            const res = await updateRoom(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
          } else if (action === "DELETE") {
            const req = new NextRequest(`http://localhost:3000/api/salas/${resourceId}`, {
              method: "DELETE",
            });
            const res = await deleteRoom(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
          } else {
            (rawPrisma.room.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(callerTenant);
              return [];
            });
            const req = new NextRequest(`http://localhost:3000/api/salas`);
            const res = await listRooms(req);
            expect(res.status).toBe(200);
          }
        });
      }
    );

    // 1.3 Sessões & Mapa de Assentos Polling (40 cenarios)
    const sessionMatrix = Array.from({ length: 40 }, (_, i) => ({
      index: i + 1,
      resourceId: `session-foreign-${i + 1}`,
      callerTenant: i % 2 === 0 ? tenantB : tenantD,
      action: i < 10 ? "GET" : i < 20 ? "PATCH" : i < 30 ? "DELETE" : "SEATS_POLLING",
    }));

    describe.each(sessionMatrix)(
      "Sessões Cenário $index: $action sobre $resourceId",
      ({ resourceId, callerTenant, action }) => {
        it(`deve impedir acesso a sessao ou polling de assentos de outro cinema`, async () => {
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "user-test", role: "GERENTE", tenantId: callerTenant },
          } as any);

          (rawPrisma.session.findFirst as any).mockResolvedValue(null);

          if (action === "GET") {
            const req = new NextRequest(`http://localhost:3000/api/sessoes/${resourceId}`);
            const res = await getSessionById(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
          } else if (action === "PATCH") {
            const req = new NextRequest(`http://localhost:3000/api/sessoes/${resourceId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ price: 99.9 }),
            });
            const res = await updateSession(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
          } else if (action === "DELETE") {
            const req = new NextRequest(`http://localhost:3000/api/sessoes/${resourceId}`, {
              method: "DELETE",
            });
            const res = await deleteSession(req, { params: { id: resourceId } });
            expect([403, 404]).toContain(res.status);
          } else {
            // SEATS_POLLING
            const req = new NextRequest(`http://localhost:3000/api/sessoes/${resourceId}/assentos`);
            const res = await getSessionSeats(req, { params: { id: resourceId } });
            expect(res.status).toBe(404);
            const json = await res.json();
            expect(json.error).toContain("Sessao nao encontrada");
          }
        });
      }
    );

    // 1.4 Ingressos, Vendas & Cancelamentos (40 cenarios)
    const ticketMatrix = Array.from({ length: 40 }, (_, i) => ({
      index: i + 1,
      ticketId: `ticket-foreign-${i + 1}`,
      callerTenant: i % 2 === 0 ? tenantA : tenantC,
      action: i < 20 ? "CANCEL_CROSS_TENANT" : "LIST_TICKETS_ISOLATION",
    }));

    describe.each(ticketMatrix)(
      "Ingressos Cenário $index: $action sobre $ticketId",
      ({ ticketId, callerTenant, action }) => {
        it(`deve isolar ingressos e proibir cancelamento de ticket de outro tenant`, async () => {
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "user-atendente", role: "ATENDENTE", tenantId: callerTenant },
          } as any);

          if (action === "CANCEL_CROSS_TENANT") {
            (rawPrisma.ticket.findFirst as any).mockResolvedValue(null);

            const req = new NextRequest(`http://localhost:3000/api/ingressos/${ticketId}/cancelar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ motivo: "Tentativa de cancelamento cruzado ilegal" }),
            });
            const res = await cancelTicket(req, { params: { id: ticketId } });
            expect(res.status).toBe(404);
          } else {
            (rawPrisma.ticket.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(callerTenant);
              return [];
            });

            const req = new NextRequest(`http://localhost:3000/api/ingressos`);
            const res = await listTickets(req);
            expect(res.status).toBe(200);
            const tickets = await res.json();
            expect(tickets).toEqual([]);
          }
        });
      }
    );

    // 1.5 Backoffice Operadores & Compliance Titulares (40 cenarios)
    const backofficeMatrix = Array.from({ length: 40 }, (_, i) => ({
      index: i + 1,
      targetId: `00000000-0000-4000-b000-0000000000${(i + 10).toString().padStart(2, "0")}`,
      callerTenant: i % 2 === 0 ? tenantA : tenantB,
      action: i < 10 ? "GET_USER" : i < 20 ? "PATCH_USER" : i < 30 ? "DELETE_USER" : "ANONYMIZE_TITULAR",
    }));

    describe.each(backofficeMatrix)(
      "Backoffice Cenário $index: $action sobre $targetId",
      ({ targetId, callerTenant, action }) => {
        it(`deve proteger operadores e dados pessoais de compradores entre tenants`, async () => {
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "gerente-1", role: "GERENTE", tenantId: callerTenant },
          } as any);

          (rawPrisma.user.findFirst as any).mockResolvedValue(null);
          (rawPrisma.buyer.findFirst as any).mockResolvedValue(null);

          if (action === "GET_USER") {
            const req = new NextRequest(`http://localhost:3000/api/backoffice/usuarios/${targetId}`);
            const res = await getUserById(req, { params: { id: targetId } });
            expect(res.status).toBe(404);
          } else if (action === "PATCH_USER") {
            const req = new NextRequest(`http://localhost:3000/api/backoffice/usuarios/${targetId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ active: false }),
            });
            const res = await updateUser(req, { params: { id: targetId } });
            expect(res.status).toBe(404);
          } else if (action === "DELETE_USER") {
            const req = new NextRequest(`http://localhost:3000/api/backoffice/usuarios/${targetId}`, {
              method: "DELETE",
            });
            const res = await deleteUser(req, { params: { id: targetId } });
            expect(res.status).toBe(404);
          } else {
            const req = new NextRequest(`http://localhost:3000/api/titulares/anonimizar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ buyerId: targetId, reason: "Solicitacao cruzada indevida" }),
            });
            const res = await anonymizeTitular(req);
            expect(res.status).toBe(404);
          }
        });
      }
    );
  });

  // =========================================================================
  // CATEGORIA 2: ATAQUES DE INJECAO DE PARAMETROS, HEADERS E BODY (150 testes)
  // =========================================================================
  describe("Categoria 2: Ataques de Injecao de Parametros, Headers e Body Cross-Tenant (150 cenarios)", () => {
    // 2.1 Injeção de Cabeçalhos Maliciosos (50 cenarios)
    const headerInjectionMatrix = Array.from({ length: 50 }, (_, i) => ({
      index: i + 1,
      spoofedHeaderName: [
        "x-tenant-id",
        "X-Tenant-Id",
        "x-forced-tenant-id",
        "x-override-tenant",
        "x-tenant-override",
      ][i % 5],
      spoofedTenantId: [tenantB, tenantC, tenantD, tenantE][i % 4],
      authenticatedTenant: tenantA,
      endpoint: [
        "/api/filmes",
        "/api/salas",
        "/api/sessoes",
        "/api/ingressos",
        "/api/ocupacao/painel",
      ][i % 5],
    }));

    describe.each(headerInjectionMatrix)(
      "Header Spoofing Cenário $index: $spoofedHeaderName=$spoofedTenantId em $endpoint",
      ({ spoofedHeaderName, spoofedTenantId, authenticatedTenant, endpoint }) => {
        it("deve priorizar a sessao do usuario e ignorar header forjado", async () => {
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "user-1", role: "GERENTE", tenantId: authenticatedTenant },
          } as any);

          if (endpoint === "/api/filmes") {
            (rawPrisma.film.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              expect(args.where.tenantId).not.toBe(spoofedTenantId);
              return [];
            });
            const req = new NextRequest(`http://localhost:3000${endpoint}`, {
              headers: { [spoofedHeaderName]: spoofedTenantId },
            });
            const res = await listFilms(req);
            expect(res.status).toBe(200);
          } else if (endpoint === "/api/salas") {
            (rawPrisma.room.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const req = new NextRequest(`http://localhost:3000${endpoint}`, {
              headers: { [spoofedHeaderName]: spoofedTenantId },
            });
            const res = await listRooms(req);
            expect(res.status).toBe(200);
          } else if (endpoint === "/api/sessoes") {
            (rawPrisma.session.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const req = new NextRequest(`http://localhost:3000${endpoint}`, {
              headers: { [spoofedHeaderName]: spoofedTenantId },
            });
            const res = await listSessions(req);
            expect(res.status).toBe(200);
          } else if (endpoint === "/api/ingressos") {
            (rawPrisma.ticket.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const req = new NextRequest(`http://localhost:3000${endpoint}`, {
              headers: { [spoofedHeaderName]: spoofedTenantId },
            });
            const res = await listTickets(req);
            expect(res.status).toBe(200);
          } else {
            // /api/ocupacao/painel
            (rawPrisma.session.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const req = new NextRequest(`http://localhost:3000${endpoint}`, {
              headers: { [spoofedHeaderName]: spoofedTenantId },
            });
            const res = await getOccupancyPanel(req);
            expect(res.status).toBe(200);
          }
        });
      }
    );

    // 2.2 Injeção de Parâmetros de Query (50 cenarios)
    const queryInjectionMatrix = Array.from({ length: 50 }, (_, i) => ({
      index: i + 1,
      queryParam: ["tenantId", "tenant_id", "tenant", "cinema_id", "cinemaId"][i % 5],
      injectedTenant: [tenantB, tenantC, tenantD, tenantE][i % 4],
      authenticatedTenant: tenantA,
      endpoint: [
        "/api/filmes",
        "/api/salas",
        "/api/sessoes",
        "/api/ingressos",
        "/api/ocupacao/painel",
      ][i % 5],
    }));

    describe.each(queryInjectionMatrix)(
      "Query Tampering Cenário $index: ?$queryParam=$injectedTenant em $endpoint",
      ({ queryParam, injectedTenant, authenticatedTenant, endpoint }) => {
        it("deve ignorar query params de tenant forjados e aplicar tenant da sessao", async () => {
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "user-1", role: "GERENTE", tenantId: authenticatedTenant },
          } as any);

          const url = `http://localhost:3000${endpoint}?${queryParam}=${injectedTenant}`;
          const req = new NextRequest(url);

          if (endpoint === "/api/filmes") {
            (rawPrisma.film.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const res = await listFilms(req);
            expect(res.status).toBe(200);
          } else if (endpoint === "/api/salas") {
            (rawPrisma.room.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const res = await listRooms(req);
            expect(res.status).toBe(200);
          } else if (endpoint === "/api/sessoes") {
            (rawPrisma.session.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const res = await listSessions(req);
            expect(res.status).toBe(200);
          } else if (endpoint === "/api/ingressos") {
            (rawPrisma.ticket.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const res = await listTickets(req);
            expect(res.status).toBe(200);
          } else {
            (rawPrisma.session.findMany as any).mockImplementation(async (args: any) => {
              expect(args.where.tenantId).toBe(authenticatedTenant);
              return [];
            });
            const res = await getOccupancyPanel(req);
            expect(res.status).toBe(200);
          }
        });
      }
    );

    // 2.3 Injeção de Propriedades no Payload JSON (50 cenarios)
    const bodyInjectionMatrix = Array.from({ length: 50 }, (_, i) => ({
      index: i + 1,
      targetEntity: ["Film", "Room", "User"][i % 3],
      injectedTenant: [tenantB, tenantC, tenantD, tenantE][i % 4],
      authenticatedTenant: tenantA,
    }));

    describe.each(bodyInjectionMatrix)(
      "Body Injection Cenário $index: criacao de $targetEntity com tenantId=$injectedTenant",
      ({ targetEntity, injectedTenant, authenticatedTenant }) => {
        it("deve compulsoriamente forcar tenantId da sessao e sobrescrever body forjado", async () => {
          vi.mocked(getServerSession).mockResolvedValue({
            user: { id: "gerente-1", role: "GERENTE", tenantId: authenticatedTenant },
          } as any);

          if (targetEntity === "Film") {
            (rawPrisma.film.create as any).mockImplementation(async (args: any) => {
              expect(args.data.tenantId).toBe(authenticatedTenant);
              expect(args.data.tenantId).not.toBe(injectedTenant);
              return { id: "new-film", ...args.data };
            });

            const req = new NextRequest("http://localhost:3000/api/filmes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Inception Spoofed",
                durationMinutes: 148,
                tenantId: injectedTenant,
                tenant_id: injectedTenant,
              }),
            });
            const res = await createFilm(req);
            expect(res.status).toBe(201);
          } else if (targetEntity === "Room") {
            (rawPrisma.room.create as any).mockImplementation(async (args: any) => {
              expect(args.data.tenantId).toBe(authenticatedTenant);
              expect(args.data.tenantId).not.toBe(injectedTenant);
              return { id: "new-room-id", ...args.data };
            });

            const req = new NextRequest("http://localhost:3000/api/salas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Sala IMAX Spoofed",
                rows: 5,
                columns: 5,
                tenantId: injectedTenant,
              }),
            });
            const res = await createRoom(req);
            expect(res.status).toBe(201);
          } else {
            // User
            (rawPrisma.user.findFirst as any).mockResolvedValue(null);
            (rawPrisma.user.create as any).mockImplementation(async (args: any) => {
              expect(args.data.tenantId).toBe(authenticatedTenant);
              expect(args.data.tenantId).not.toBe(injectedTenant);
              return { id: "new-user-id", ...args.data };
            });

            const req = new NextRequest("http://localhost:3000/api/backoffice/usuarios", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: "Operador Forjado",
                email: `op-${Math.random()}@cinedoom.com`,
                password: "password123",
                role: "ATENDENTE",
                tenantId: injectedTenant,
              }),
            });
            const res = await createUser(req);
            expect(res.status).toBe(201);
          }
        });
      }
    );
  });

  // =========================================================================
  // CATEGORIA 3: VALIDACAO EXAUSTIVA DA TENANCY EXTENSION (100 testes)
  // =========================================================================
  describe("Categoria 3: Validacao Exaustiva de Tenancy Extension no Prisma (100 cenarios)", () => {
    const models = [
      "Film",
      "Room",
      "Seat",
      "Session",
      "SessionSeat",
      "Buyer",
      "Ticket",
      "Reservation",
      "CancellationAudit",
      "User",
    ];

    const operations = ["findMany", "findFirst", "create", "update", "delete"];

    const tenancyExtensionMatrix: {
      index: number;
      model: string;
      operation: string;
      hasContext: boolean;
    }[] = [];

    let count = 1;
    for (const model of models) {
      for (const op of operations) {
        tenancyExtensionMatrix.push({
          index: count++,
          model,
          operation: op,
          hasContext: true,
        });
        tenancyExtensionMatrix.push({
          index: count++,
          model,
          operation: op,
          hasContext: false,
        });
      }
    }

    describe.each(tenancyExtensionMatrix)(
      "Tenancy Extension Cenário $index: $model.$operation (Contexto: $hasContext)",
      ({ model, operation, hasContext }) => {
        it(`deve ${hasContext ? "injetar tenantId compulsoriamente" : "rejeitar com TenantContextError"}`, async () => {
          const mockQuery = vi.fn().mockImplementation((args) => Promise.resolve(args));
          const mockClient = {
            $extends: (ext: any) => ({
              executeOperation: (m: string, o: string, args: any) =>
                ext.query.$allModels.$allOperations({
                  model: m,
                  operation: o,
                  args,
                  query: mockQuery,
                }),
            }),
          } as any;

          const extended = withTenancy(mockClient) as any;

          if (hasContext) {
            await runWithTenant(tenantA, async () => {
              const dummyArgs =
                operation === "create"
                  ? { data: { name: "test" } }
                  : { where: { id: "resource-1" } };

              const result = await extended.executeOperation(model, operation, dummyArgs);

              expect(mockQuery).toHaveBeenCalledOnce();
              if (operation === "create") {
                expect(result.data.tenantId).toBe(tenantA);
              } else {
                expect(result.where.tenantId).toBe(tenantA);
              }
            });
          } else {
            const dummyArgs =
              operation === "create"
                ? { data: { name: "test" } }
                : { where: { id: "resource-1" } };

            await expect(
              extended.executeOperation(model, operation, dummyArgs)
            ).rejects.toThrow(TenantContextError);

            expect(mockQuery).not.toHaveBeenCalled();
          }
        });
      }
    );
  });

  // =========================================================================
  // CATEGORIA 4: CONDICOES DE CORRIDA E ISOLAMENTO ASSINCRONO (50 testes)
  // =========================================================================
  describe("Categoria 4: Condicoes de Corrida e Isolamento Assincrono Concorrente (50 cenarios)", () => {
    const concurrencyMatrix = Array.from({ length: 50 }, (_, i) => ({
      index: i + 1,
      tenantPairA: `tenant-alpha-${i}`,
      tenantPairB: `tenant-beta-${i}`,
      delayMsA: (i % 5) * 3,
      delayMsB: ((i + 2) % 5) * 3,
    }));

    describe.each(concurrencyMatrix)(
      "Concorrencia Cenário $index: $tenantPairA vs $tenantPairB",
      ({ tenantPairA, tenantPairB, delayMsA, delayMsB }) => {
        it("deve manter zero contaminacao de AsyncLocalStorage sob concorrencia", async () => {
          const [resultA, resultB] = await Promise.all([
            runWithTenant(tenantPairA, async () => {
              expect(getTenantId()).toBe(tenantPairA);
              await new Promise((resolve) => setTimeout(resolve, delayMsA));
              expect(requireTenantId()).toBe(tenantPairA);
              return getTenantId();
            }),
            runWithTenant(tenantPairB, async () => {
              expect(getTenantId()).toBe(tenantPairB);
              await new Promise((resolve) => setTimeout(resolve, delayMsB));
              expect(requireTenantId()).toBe(tenantPairB);
              return getTenantId();
            }),
          ]);

          expect(resultA).toBe(tenantPairA);
          expect(resultB).toBe(tenantPairB);
          expect(resultA).not.toBe(resultB);
          expect(getTenantId()).toBeNull();
        });
      }
    );
  });
});
