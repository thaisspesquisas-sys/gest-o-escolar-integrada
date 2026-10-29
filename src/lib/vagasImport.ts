// Importação do quadro de vagas e regra de remanejamento (puro, sem banco).
import { norm, limpar } from "./importar";
import { emExercicio, type Ref, type ServidorRow } from "./calc";
import type { VagaRow } from "./vagas";

export const CAMPOS_VAGA = [
  { key: "ano_referencia", label: "Ano", sin: ["ano", "ano referencia", "ano de referencia"] },
  { key: "cargo", label: "Cargo *", sin: ["cargo"] },
  { key: "funcao", label: "Função", sin: ["funcao", "função"] },
  { key: "unidade", label: "Unidade / lotação", sin: ["unidade", "escola", "lotacao", "lotação"] },
  { key: "previstas_lei", label: "Previstas em lei", sin: ["previstas em lei", "lei", "previstas lei"] },
  { key: "autorizadas", label: "Autorizadas", sin: ["autorizadas", "vagas autorizadas"] },
  { key: "reservadas", label: "Reservadas", sin: ["reservadas", "bloqueadas"] },
  { key: "previstas_concurso", label: "Previstas p/ concurso", sin: ["concurso", "previstas concurso", "previstas p/ concurso"] },
  { key: "previstas_pss", label: "Previstas p/ PSS", sin: ["pss", "processo seletivo", "previstas pss"] },
  { key: "previstas_temporaria", label: "Previstas p/ temporária", sin: ["temporaria", "temporária", "contratacao temporaria"] },
  { key: "justificativa", label: "Justificativa", sin: ["justificativa", "observacoes", "observações", "obs"] },
] as const;
export type CampoVaga = (typeof CAMPOS_VAGA)[number]["key"];
export type MapVaga = Partial<Record<CampoVaga, string>>;
export const NUMS = ["previstas_lei", "autorizadas", "reservadas", "previstas_concurso", "previstas_pss", "previstas_temporaria"] as const;

export function sugerirMapVaga(cols: string[]): MapVaga {
  const m: MapVaga = {};
  for (const c of CAMPOS_VAGA) {
    const achou = cols.find((x) => (c.sin as readonly string[]).includes(norm(x)));
    if (achou && !Object.values(m).includes(achou)) m[c.key] = achou;
  }
  return m;
}

export type LinhaVaga = {
  linha: number; ano: number; cargo: string | null; funcao: string | null; unidade: string | null;
  nums: Record<(typeof NUMS)[number], number | null>; justificativa: string | null; erros: string[];
};

export function extrairVagas(rows: Record<string, unknown>[], m: MapVaga, anoPadrao: number, inicio = 2): LinhaVaga[] {
  const g = (r: Record<string, unknown>, k: CampoVaga) => (m[k] ? r[m[k]!] : undefined);
  return rows
    .map((r, i) => {
      const erros: string[] = [];
      const nums = {} as LinhaVaga["nums"];
      for (const k of NUMS) {
        const raw = limpar(g(r, k));
        if (raw == null) { nums[k] = null; continue; }
        const n = Number(raw.replace(",", "."));
        if (!Number.isFinite(n) || n < 0) { erros.push(`Valor inválido em ${k}`); nums[k] = null; } else nums[k] = Math.round(n);
      }
      const anoRaw = Number(limpar(g(r, "ano_referencia")));
      const cargo = limpar(g(r, "cargo"))?.toUpperCase() ?? null;
      if (!cargo) erros.push("Cargo ausente");
      return {
        linha: i + inicio, ano: Number.isInteger(anoRaw) && anoRaw > 1900 ? anoRaw : anoPadrao, cargo,
        funcao: limpar(g(r, "funcao"))?.toUpperCase() ?? null, unidade: limpar(g(r, "unidade"))?.toUpperCase() ?? null,
        nums, justificativa: limpar(g(r, "justificativa")), erros,
      };
    })
    .filter((l) => l.cargo || NUMS.some((k) => l.nums[k] != null));
}

/** Chave que identifica uma linha do quadro: ano + cargo + função + unidade. */
export const chaveVaga = (ano: number, cargo: string, funcao: string | null, unidade: string | null) => `${ano}|${cargo}|${funcao ?? ""}|${unidade ?? ""}`;

export type Remanejamento = {
  /** Linha a criar na lotação de origem quando ainda não existe no quadro. */
  criarOrigem: Omit<VagaRow, "id" | "updated_at"> | null;
  origemExistente: VagaRow | null;
  destinoExistente: VagaRow | null;
  avisos: string[];
};

/**
 * Remanejar servidor de A para B: a ocupação é recalculada pelos servidores, então a vaga em A abre sozinha
 * se A já tem linha no quadro. Se não tem, cria-se uma linha em A com autorizadas = ocupação atual (antes da saída),
 * de modo que a saída deixa 1 vaga aberta. A vaga aberta fica sempre "em análise" até validação.
 */
export function planejarRemanejamento(
  s: ServidorRow, destinoId: string, ano: number, vagas: VagaRow[], servidores: ServidorRow[],
  vinculos: Map<string, Ref>, situacoes: Map<string, Ref>, nomes: { servidor: string; destino: string; data: string },
): Remanejamento {
  const avisos: string[] = [];
  if (!s.cargo_id) return { criarOrigem: null, origemExistente: null, destinoExistente: null, avisos: ["Servidor sem cargo: não é possível abrir vaga na origem."] };
  const casa = (v: VagaRow, unidade: string | null) =>
    v.ano_referencia === ano && v.cargo_id === s.cargo_id && v.unidade_id === unidade && (!v.funcao_id || v.funcao_id === s.funcao_id);
  const melhor = (unidade: string | null) => {
    const c = vagas.filter((v) => casa(v, unidade));
    return c.find((v) => v.funcao_id === s.funcao_id) ?? c[0] ?? null;
  };
  const destinoExistente = melhor(destinoId);
  if (!s.unidade_id) return { criarOrigem: null, origemExistente: null, destinoExistente, avisos: ["Servidor sem lotação de origem: nenhuma vaga aberta."] };
  const origemExistente = melhor(s.unidade_id);
  const efetivo = s.vinculo_id ? vinculos.get(s.vinculo_id)?.categoria === "efetivo" : false;
  if (!efetivo) avisos.push("Servidor não é efetivo: a ocupação efetiva da origem não muda; a vaga aberta deve ser analisada.");
  let criarOrigem: Remanejamento["criarOrigem"] = null;
  if (!origemExistente) {
    const ocupadosAntes = servidores.filter(
      (x) => x.cargo_id === s.cargo_id && x.unidade_id === s.unidade_id && x.funcao_id === s.funcao_id && emExercicio(x, situacoes) &&
        (x.vinculo_id ? vinculos.get(x.vinculo_id)?.categoria === "efetivo" : false),
    ).length;
    criarOrigem = {
      ano_referencia: ano, cargo_id: s.cargo_id, funcao_id: s.funcao_id, unidade_id: s.unidade_id,
      previstas_lei: null, autorizadas: Math.max(1, ocupadosAntes), reservadas: 0,
      previstas_concurso: null, previstas_pss: null, previstas_temporaria: null, status_validacao: "em_analise",
      justificativa: `Vaga aberta automaticamente por remanejamento de ${nomes.servidor} para ${nomes.destino} em ${nomes.data}. Aguardando validação.`,
    };
  }
  return { criarOrigem, origemExistente, destinoExistente, avisos };
}
