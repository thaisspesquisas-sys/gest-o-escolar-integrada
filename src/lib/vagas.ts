import { calcularVaga, emExercicio, type Ref, type ServidorRow } from "./calc";

export type VagaRow = {
  id: string; ano_referencia: number; cargo_id: string; funcao_id: string | null; unidade_id: string | null;
  previstas_lei: number | null; autorizadas: number | null; reservadas: number; previstas_concurso: number | null; previstas_pss: number | null; previstas_temporaria: number | null;
  status_validacao: "em_analise" | "confirmado"; justificativa: string | null; updated_at: string;
};

/** Cruza a linha do quadro de vagas com os servidores cadastrados (mesmo cargo; função e unidade quando informadas). */
export function analisarVaga(v: VagaRow, servidores: ServidorRow[], vinculos: Map<string, Ref>, situacoes: Map<string, Ref>) {
  const doCargo = servidores.filter(
    (s) => s.cargo_id === v.cargo_id && (!v.funcao_id || s.funcao_id === v.funcao_id) && (!v.unidade_id || s.unidade_id === v.unidade_id),
  );
  const exercicio = doCargo.filter((s) => emExercicio(s, situacoes));
  const cat = (s: ServidorRow) => (s.vinculo_id ? vinculos.get(s.vinculo_id)?.categoria : undefined);
  const sit = (s: ServidorRow) => (s.situacao_id ? situacoes.get(s.situacao_id)?.categoria : undefined);
  const efetivos = exercicio.filter((s) => cat(s) === "efetivo").length;
  const temporarios = exercicio.filter((s) => cat(s) === "temporario" || cat(s) === "processo_seletivo").length;
  const outrasSituacoes = exercicio.filter((s) => ["cedido", "permutado", "desvio", "requisitado"].includes(sit(s) ?? "")).length;
  const afastadosDefinitivos = doCargo.filter((s) => ["aposentado", "exonerado", "desligado"].includes(sit(s) ?? "")).length;
  // Ocupadas = efetivos em exercício (temporários não ocupam cargo efetivo)
  const calc = calcularVaga(v, efetivos);
  // Necessidade estimada = cargos autorizados ainda sem efetivo (inclui os hoje supridos por temporários)
  const necessidade = calc.disponiveisCalculadas;
  return { ...calc, efetivos, temporarios, outrasSituacoes, afastadosDefinitivos, necessidadeEstimada: necessidade };
}
