import { describe, it, expect } from "vitest";
import { MODULE_NAME as bilheteria } from "@/modules/bilheteria";
import { MODULE_NAME as backoffice } from "@/modules/backoffice";
import { MODULE_NAME as auth } from "@/modules/auth";
import { MODULE_NAME as tenancy } from "@/modules/tenancy";
import { MODULE_NAME as ocupacao } from "@/modules/ocupacao";
import { MODULE_NAME as portal } from "@/modules/portal";
import { MODULE_NAME as compradores } from "@/modules/compradores";
import { MODULE_NAME as notificacoes } from "@/modules/notificacoes";

describe("Modular Architecture (Monolito Modular)", () => {
  it("todos os 8 modulos de dominio devem ser exportados sem ciclos", () => {
    expect(bilheteria).toBe("bilheteria");
    expect(backoffice).toBe("backoffice");
    expect(auth).toBe("auth");
    expect(tenancy).toBe("tenancy");
    expect(ocupacao).toBe("ocupacao");
    expect(portal).toBe("portal");
    expect(compradores).toBe("compradores");
    expect(notificacoes).toBe("notificacoes");
  });
});
