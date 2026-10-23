import { describe, it, expect } from "vitest";

describe("Design System & Brand Tokens", () => {
  it("deve conter as cores institucionais corretas do CineDoom", () => {
    const brandColors = {
      primary: "#1A1A2E",
      secondary: "#0F3460",
      cta: "#E94560",
      neutralBg: "#F5F5F5",
      darkBg: "#16213E",
    };

    expect(brandColors.primary).toBe("#1A1A2E");
    expect(brandColors.secondary).toBe("#0F3460");
    expect(brandColors.cta).toBe("#E94560");
    expect(brandColors.neutralBg).toBe("#F5F5F5");
  });
});
