// Regras de cálculo documentadas e testáveis.

export type Ref = { id: string; nome: string; categoria?: string; em_exercicio?: boolean };

export type ServidorRow = {
  id: string;
  nome: string;
  matricula: string;
  ativo: boolean;
  cargo_id: string | null;
  funcao_id: string | null;
  vinculo_id: string | null;
  situacao_id: string | null;
  unidade_id: string | null;
  data_admissao: string | null;
  data_desligamento: string | null;
  [k: string]: unknown;
};

export const INSUFICIENTE = "Dados insuficientes para cálculo";
export const AGUARDANDO = "Aguardando validação";

/** Agrupa e conta registros (cada matrícula/vínculo conta uma vez por grupo). */
export function contarPor<T>(rows: T[], key: (r: T) => string | null | undefined, rotulos: Map<string, string>) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) ?? "";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([k, total]) => ({ id: k, nome: k ? (rotulos.get(k) ?? "—") : "Não informado", total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Situação em exercício: servidor ativo cuja situação não seja de afastamento definitivo
 * (aposentado, exonerado, desligado). Sem situação informada conta como em exercício.
 */
export function emExercicio(s: ServidorRow, situacoes: Map<string, Ref>) {
  if (!s.ativo) return false;
  if (!s.situacao_id) return true;
  return situacoes.get(s.situacao_id)?.em_exercicio ?? true;
}

export type VagaInput = {
  previstas_lei: number | null;
  autorizadas: number | null;
  reservadas: number | null;
  status_validacao: "em_analise" | "confirmado";
};

export type VagaCalculada = {
  ocupadas: number;
  disponiveisCalculadas: number | null;
  disponiveisConfirmadas: number | null;
  observacao: string | null;
};

/**
 * Vagas disponíveis = autorizadas − ocupadas − reservadas.
 * Ocupadas = servidores em exercício no cargo (mesma função/unidade quando informadas).
 * Sem quantidade autorizada => "Dados insuficientes". Só é "confirmada" quando validada pela equipe.
 * Aposentadorias/exonerações NÃO geram vaga automaticamente: apenas reduzem a ocupação calculada.
 */
export function calcularVaga(v: VagaInput, ocupadas: number): VagaCalculada {
  if (v.autorizadas == null) {
    return { ocupadas, disponiveisCalculadas: null, disponiveisConfirmadas: null, observacao: INSUFICIENTE };
  }
  const disp = Math.max(0, v.autorizadas - ocupadas - (v.reservadas ?? 0));
  return {
    ocupadas,
    disponiveisCalculadas: disp,
    disponiveisConfirmadas: v.status_validacao === "confirmado" ? disp : null,
    observacao: v.status_validacao === "confirmado" ? null : AGUARDANDO,
  };
}

export function somenteDigitos(s: string | null | undefined) {
  return (s ?? "").replace(/\D/g, "");
}

export function cpfValido(cpf: string) {
  const c = somenteDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export function mascararCpf(cpf: string) {
  const c = somenteDigitos(cpf);
  return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : cpf;
}
