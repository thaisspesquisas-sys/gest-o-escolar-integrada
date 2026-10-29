import { describe, it, expect } from "vitest";
import { calcularVaga, cpfValido, INSUFICIENTE, AGUARDANDO } from "./calc";
import { classificar, extrair, sugerirMapeamento, paraData } from "./importar";

describe("vagas", () => {
  it("sem vagas autorizadas: dados insuficientes", () => {
    expect(calcularVaga({ previstas_lei: 10, autorizadas: null, reservadas: 0, status_validacao: "confirmado" }, 3).observacao).toBe(INSUFICIENTE);
  });
  it("disponíveis = autorizadas - ocupadas - reservadas, confirmadas só após validação", () => {
    const a = calcularVaga({ previstas_lei: null, autorizadas: 10, reservadas: 2, status_validacao: "em_analise" }, 5);
    expect(a.disponiveisCalculadas).toBe(3);
    expect(a.disponiveisConfirmadas).toBeNull();
    expect(a.observacao).toBe(AGUARDANDO);
    const b = calcularVaga({ previstas_lei: null, autorizadas: 10, reservadas: 2, status_validacao: "confirmado" }, 5);
    expect(b.disponiveisConfirmadas).toBe(3);
  });
  it("nunca negativo", () => {
    expect(calcularVaga({ previstas_lei: null, autorizadas: 2, reservadas: 0, status_validacao: "confirmado" }, 5).disponiveisCalculadas).toBe(0);
  });
});

describe("importação", () => {
  it("mapeia colunas da planilha da Secretaria", () => {
    const m = sugerirMapeamento(["MAT", "SERVIDORES", "CARGO ", "FUNÇÃO", "LOTAÇÃO", "VÍNCULO ", "ADMISSÃO", "C.H. "]);
    expect(m.matricula).toBe("MAT");
    expect(m.nome).toBe("SERVIDORES");
    expect(m.unidade).toBe("LOTAÇÃO");
    expect(m.carga_horaria).toBe("C.H. ");
  });
  it("classifica novos, atualizações, sem alteração e correções", () => {
    const regs = extrair(
      [
        { M: "1", N: "Ana" },
        { M: "2", N: "Bia" },
        { M: "3", N: "Caio" },
        { M: "", N: "Sem mat" },
        { M: "4", N: "D" },
        { M: "4", N: "D2" },
      ],
      { matricula: "M", nome: "N" },
    );
    const ex = new Map([
      ["2", { id: "b", matricula: "2", nome: "Bia" }],
      ["3", { id: "c", matricula: "3", nome: "Caio Antigo" }],
    ]);
    const r = classificar(regs, ex, (reg, e) => (reg.nome !== e["nome"] ? ["nome"] : []));
    expect(r.map((x) => x.classe)).toEqual(["novo", "ignorar", "atualizar", "correcao", "correcao", "correcao"]);
  });
  it("valida CPF e datas do Excel", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(paraData("08/02/2025")).toBe("2025-02-08");
  });
});
