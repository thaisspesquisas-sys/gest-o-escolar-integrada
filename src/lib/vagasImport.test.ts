import { describe, it, expect } from "vitest";
import { extrairVagas, planejarRemanejamento, sugerirMapVaga } from "./vagasImport";
import { analisarVaga, type VagaRow } from "./vagas";
import type { Ref, ServidorRow } from "./calc";

const vinc = new Map<string, Ref>([["ef", { id: "ef", nome: "Efetivo", categoria: "efetivo" }]]);
const sit = new Map<string, Ref>();
const sv = (id: string, unidade: string): ServidorRow => ({ id, nome: id, matricula: id, ativo: true, cargo_id: "prof", funcao_id: null, vinculo_id: "ef", situacao_id: null, unidade_id: unidade, data_admissao: null, data_desligamento: null });
const nomes = { servidor: "Ana", destino: "B", data: "29/10/2026" };

describe("importar quadro de vagas", () => {
  it("lê colunas e valores, exige cargo", () => {
    const m = sugerirMapVaga(["Cargo", "Escola", "Autorizadas", "Concurso"]);
    const l = extrairVagas([{ Cargo: "prof", Escola: "em a", Autorizadas: "5", Concurso: 2 }, { Cargo: "", Autorizadas: 3 }], m, 2027);
    expect(l[0]).toMatchObject({ cargo: "PROF", unidade: "EM A", ano: 2027, erros: [] });
    expect(l[0]!.nums.autorizadas).toBe(5);
    expect(l[1]!.erros).toContain("Cargo ausente");
  });
});

describe("remanejamento A → B", () => {
  it("sem linha em A: cria linha em análise que deixa 1 vaga aberta após a saída", () => {
    const servs = [sv("1", "A"), sv("2", "A")];
    const p = planejarRemanejamento(servs[0]!, "B", 2027, [], servs, vinc, sit, nomes);
    expect(p.criarOrigem).toMatchObject({ unidade_id: "A", autorizadas: 2, status_validacao: "em_analise" });
    const depois = [{ ...servs[0]!, unidade_id: "B" }, servs[1]!];
    const a = analisarVaga({ ...p.criarOrigem!, id: "x", updated_at: "" } as VagaRow, depois, vinc, sit);
    expect(a.disponiveisCalculadas).toBe(1);
    expect(a.disponiveisConfirmadas).toBeNull();
  });
  it("com linha em A: não cria outra, a vaga abre pelo recálculo", () => {
    const linha = { id: "v", ano_referencia: 2027, cargo_id: "prof", funcao_id: null, unidade_id: "A", autorizadas: 1, reservadas: 0, status_validacao: "em_analise" } as VagaRow;
    const p = planejarRemanejamento(sv("1", "A"), "B", 2027, [linha], [sv("1", "A")], vinc, sit, nomes);
    expect(p.criarOrigem).toBeNull();
    expect(p.origemExistente?.id).toBe("v");
  });
});
