// Leitura e classificação de planilhas (puro, sem acesso ao banco).
import { cpfValido, somenteDigitos } from "./calc";

export const CAMPOS = [
  { key: "matricula", label: "Matrícula", obrigatorio: true },
  { key: "nome", label: "Nome completo", obrigatorio: true },
  { key: "cpf", label: "CPF" },
  { key: "cargo", label: "Cargo" },
  { key: "funcao", label: "Função" },
  { key: "unidade", label: "Lotação / Unidade" },
  { key: "vinculo", label: "Vínculo" },
  { key: "situacao", label: "Situação funcional" },
  { key: "secretaria_origem", label: "Secretaria / origem" },
  { key: "data_admissao", label: "Data de admissão" },
  { key: "data_desligamento", label: "Data de desligamento/aposentadoria" },
  { key: "carga_horaria", label: "Carga horária" },
  { key: "turno", label: "Turno" },
  { key: "email", label: "E-mail" },
  { key: "telefone", label: "Telefone" },
  { key: "ato_numero", label: "Nº do ato" },
  { key: "observacoes", label: "Observações" },
] as const;
export type CampoKey = (typeof CAMPOS)[number]["key"];
export type Mapeamento = Partial<Record<CampoKey, string>>;

const SINONIMOS: Record<CampoKey, string[]> = {
  matricula: ["mat", "matricula", "matrícula"],
  nome: ["servidores", "servidor", "nome", "nome completo"],
  cpf: ["cpf"],
  cargo: ["cargo"],
  funcao: ["funcao", "função"],
  unidade: ["lotacao", "lotação", "ultima lotacao", "ultima lotação", "unidade"],
  vinculo: ["vinculo", "vínculo"],
  situacao: ["situacao", "situação"],
  secretaria_origem: ["secretaria"],
  data_admissao: ["admissao", "admissão"],
  data_desligamento: ["aposentadoria", "data da exoneracao", "data da exoneração", "desligamento"],
  carga_horaria: ["c.h.", "c.h", "carga horaria", "carga horária", "ch"],
  turno: ["turno"],
  email: ["email", "e-mail"],
  telefone: ["telefone", "celular"],
  ato_numero: ["nomeacao", "nomeação", "ato"],
  observacoes: ["obs", "observacoes", "observações", "tipo de aposentadoria"],
};

export const norm = (s: unknown) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const limpar = (s: unknown) => {
  const v = String(s ?? "").replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
};

export function sugerirMapeamento(colunas: string[]): Mapeamento {
  const m: Mapeamento = {};
  for (const campo of Object.keys(SINONIMOS) as CampoKey[]) {
    const achou = colunas.find((c) => SINONIMOS[campo].includes(norm(c)));
    if (achou && !Object.values(m).includes(achou)) m[campo] = achou;
  }
  return m;
}

export function paraData(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 1000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

export type Registro = {
  linha: number;
  matricula: string | null;
  nome: string | null;
  cpf: string | null;
  cargo: string | null;
  funcao: string | null;
  unidade: string | null;
  vinculo: string | null;
  situacao: string | null;
  secretaria_origem: string | null;
  data_admissao: string | null;
  data_desligamento: string | null;
  carga_horaria: string | null;
  turno: string | null;
  email: string | null;
  telefone: string | null;
  ato_numero: string | null;
  observacoes: string | null;
};

export function extrair(linhas: Record<string, unknown>[], m: Mapeamento, inicio = 2): Registro[] {
  const g = (row: Record<string, unknown>, k: CampoKey) => (m[k] ? row[m[k]!] : undefined);
  return linhas.map((row, i) => {
    const cpfDig = somenteDigitos(limpar(g(row, "cpf")));
    return {
      linha: i + inicio,
      matricula: limpar(g(row, "matricula")),
      nome: limpar(g(row, "nome")),
      cpf: cpfDig ? cpfDig.padStart(11, "0") : null,
      cargo: limpar(g(row, "cargo"))?.toUpperCase() ?? null,
      funcao: limpar(g(row, "funcao"))?.toUpperCase() ?? null,
      unidade: limpar(g(row, "unidade"))?.toUpperCase() ?? null,
      vinculo: limpar(g(row, "vinculo")),
      situacao: limpar(g(row, "situacao")),
      secretaria_origem: limpar(g(row, "secretaria_origem")),
      data_admissao: paraData(g(row, "data_admissao")),
      data_desligamento: paraData(g(row, "data_desligamento")),
      carga_horaria: limpar(g(row, "carga_horaria")),
      turno: limpar(g(row, "turno")),
      email: limpar(g(row, "email")),
      telefone: limpar(g(row, "telefone")),
      ato_numero: limpar(g(row, "ato_numero")),
      observacoes: limpar(g(row, "observacoes")),
    };
  });
}

export type Existente = { id: string; matricula: string; [k: string]: unknown };
export type Classe = "novo" | "atualizar" | "ignorar" | "correcao";
export type Classificado = { reg: Registro; classe: Classe; motivos: string[]; existenteId?: string; mudancas?: string[] };

/** Campos comparados para detectar atualização (valores já resolvidos para ids pelo chamador). */
export function classificar(
  regs: Registro[],
  existentes: Map<string, Existente>,
  comparar: (reg: Registro, ex: Existente) => string[],
): Classificado[] {
  const vistos = new Map<string, number>();
  for (const r of regs) if (r.matricula) vistos.set(r.matricula, (vistos.get(r.matricula) ?? 0) + 1);
  return regs.map((reg) => {
    const motivos: string[] = [];
    if (!reg.matricula) motivos.push("Matrícula ausente");
    if (!reg.nome) motivos.push("Nome ausente");
    if (reg.matricula && (vistos.get(reg.matricula) ?? 0) > 1) motivos.push("Matrícula repetida na planilha");
    if (reg.cpf && !cpfValido(reg.cpf)) motivos.push("CPF inválido");
    if (motivos.length) return { reg, classe: "correcao" as const, motivos };
    const ex = existentes.get(reg.matricula!);
    if (!ex) return { reg, classe: "novo" as const, motivos };
    const mudancas = comparar(reg, ex);
    return mudancas.length
      ? { reg, classe: "atualizar" as const, motivos, existenteId: ex.id, mudancas }
      : { reg, classe: "ignorar" as const, motivos: ["Sem alterações"], existenteId: ex.id };
  });
}
