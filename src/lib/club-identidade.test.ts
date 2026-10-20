/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { chaveClube, correspondeBuscaClube, nomeCatalogoClube } from "./club-identidade";
import { selecionarEscudo } from "./club-escudo";

describe("identidades de clubes", () => {
  test("Paris Saint-Germain vira Paris Saint Germain e aceita PSG", () => {
    expect(nomeCatalogoClube("Paris Saint-Germain")).toBe("Paris Saint Germain");
    expect(chaveClube("PSG")).toBe(chaveClube("Paris Saint Germain"));
  });
  test("Bayer de Munique e Bayern de Munique identificam Bayern Munich", () => {
    expect(nomeCatalogoClube("Bayer de Munique")).toBe("Bayern Munich");
    expect(nomeCatalogoClube("Bayern de Munique")).toBe("Bayern Munich");
    expect(chaveClube("Bayern Munich")).not.toBe(chaveClube("Bayer Leverkusen"));
  });
  test("Inter de Milão identifica Inter Milan, não Milan", () => {
    expect(nomeCatalogoClube("Inter de Milão")).toBe("Inter Milan");
    expect(chaveClube("Inter Milan")).not.toBe(chaveClube("Milan"));
  });
  test("busca aceita grafias antigas e abreviações", () => {
    expect(correspondeBuscaClube("Bayern Munich", "Munique")).toBe(true);
    expect(correspondeBuscaClube("Inter Milan", "Milão")).toBe(true);
    expect(correspondeBuscaClube("Paris Saint Germain", "PSG")).toBe(true);
  });
  test("os três nomes corrigidos encontram seus elencos existentes", () => {
    const catalogo = JSON.parse(readFileSync("public/elencos.json", "utf8")) as { clubes: Record<string, unknown[]> };
    for (const nome of ["Paris Saint Germain", "Bayern Munich", "Inter Milan"]) {
      const chave = Object.keys(catalogo.clubes).find((k) => chaveClube(k) === chaveClube(nome));
      expect(chave).toBeDefined();
      expect(chave ? catalogo.clubes[chave]?.length : 0).toBeGreaterThan(10);
    }
  });
  test("escudo exige identidade, futebol e país correspondentes", () => {
    const times = [
      { strTeam: "Milan", strSport: "Soccer", strCountry: "Italy", strBadge: "https://example.org/milan.png" },
      { strTeam: "Inter Milan", strSport: "Basketball", strCountry: "Italy", strBadge: "https://example.org/basket.png" },
      { strTeam: "Inter Milan", strSport: "Soccer", strCountry: "Brazil", strBadge: "https://example.org/br.png" },
      { strTeam: "Inter Milan", strSport: "Soccer", strCountry: "Italy", strBadge: "https://example.org/inter.png" },
    ];
    expect(selecionarEscudo(times, "Inter de Milão", "Itália")).toBe("https://example.org/inter.png");
    expect(selecionarEscudo(times.slice(0, 3), "Inter de Milão", "Itália")).toBeNull();
  });
});