import { describe, expect, it } from "vitest";
import { validarArquivoPlanilha } from "./importar";

describe("Tamanho da planilha", () => {
  it("aceita a planilha original de servidores, com 20.582.238 bytes", () => {
    expect(validarArquivoPlanilha({ name: "SERVIDORES_2026-GERAL.xlsx", size: 20_582_238 })).toBeNull();
  });

  it("aceita arquivos até 100 MB inclusive", () => {
    expect(validarArquivoPlanilha({ name: "servidores.xlsx", size: 104_857_600 })).toBeNull();
  });

  it("bloqueia arquivos acima de 100 MB", () => {
    expect(validarArquivoPlanilha({ name: "servidores.xlsx", size: 104_857_601 })).not.toBeNull();
  });
});