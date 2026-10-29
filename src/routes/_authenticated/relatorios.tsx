import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, FileDown, Sheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { Filtros, FILTRO_INICIAL, aplicarFiltros, descreverFiltros } from "@/components/Filtros";
import { Field, NativeSelect, Vazio } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { configQuery, fetchAll, fmtData, usePerms, useRefs, useServidores, type Refs } from "@/lib/data";
import { contarPor, cpfValido, mascararCpf, type ServidorRow } from "@/lib/calc";
import { analisarVaga, type VagaRow } from "@/lib/vagas";
import { exportarExcel, exportarPdf, type Coluna } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Gestão de Servidores" }, { name: "description", content: "Relatórios oficiais com impressão e exportação." }] }),
  component: Relatorios,
});

type Tipo =
  | "geral" | "unidade" | "cargo" | "situacao" | "qtd_vinculo" | "qtd_unidade" | "efetivos" | "temporarios" | "cedidos_permutados" | "desvio" | "aposentados_exonerados"
  | "vagas_quadro" | "vagas_concurso" | "vagas_pss" | "vagas_temporaria" | "vagas_necessidade" | "vagas_unidade" | "inconsistencias" | "historico";

const TIPOS: { v: Tipo; l: string; grupo: string }[] = [
  { v: "geral", l: "Relação geral de servidores", grupo: "Servidores" },
  { v: "unidade", l: "Servidores por unidade escolar", grupo: "Servidores" },
  { v: "cargo", l: "Servidores por cargo e função", grupo: "Servidores" },
  { v: "situacao", l: "Servidores por situação funcional", grupo: "Servidores" },
  { v: "efetivos", l: "Servidores efetivos", grupo: "Servidores" },
  { v: "temporarios", l: "Contratados temporários", grupo: "Servidores" },
  { v: "cedidos_permutados", l: "Cedidos e permutados", grupo: "Servidores" },
  { v: "desvio", l: "Em desvio de função", grupo: "Servidores" },
  { v: "aposentados_exonerados", l: "Aposentados e exonerados", grupo: "Servidores" },
  { v: "qtd_vinculo", l: "Quantitativo por vínculo", grupo: "Quantitativos" },
  { v: "qtd_unidade", l: "Quantitativo por unidade", grupo: "Quantitativos" },
  { v: "vagas_quadro", l: "Quadro geral de vagas (por cargo e função)", grupo: "Vagas" },
  { v: "vagas_concurso", l: "Vagas para concurso público", grupo: "Vagas" },
  { v: "vagas_pss", l: "Vagas para processo seletivo simplificado", grupo: "Vagas" },
  { v: "vagas_temporaria", l: "Vagas para contratação temporária", grupo: "Vagas" },
  { v: "vagas_necessidade", l: "Levantamento de necessidades de pessoal", grupo: "Vagas" },
  { v: "vagas_unidade", l: "Vagas por unidade escolar", grupo: "Vagas" },
  { v: "inconsistencias", l: "Inconsistências cadastrais", grupo: "Controle" },
  { v: "historico", l: "Histórico de alterações funcionais", grupo: "Controle" },
];

const ORDENS = [["nome", "Ordem alfabética"], ["cargo", "Cargo"], ["funcao", "Função"], ["vinculo", "Vínculo"], ["unidade", "Unidade escolar"]];

function Relatorios() {
  const { can } = usePerms();
  const refs = useRefs();
  const serv = useServidores();
  const cfg = useQuery(configQuery);
  const vagas = useQuery({ queryKey: ["vagas"], queryFn: () => fetchAll<VagaRow>((a, b) => supabase.from("vagas").select("*").range(a, b) as unknown as PromiseLike<{ data: VagaRow[] | null; error: { message: string } | null }>) });
  const [tipo, setTipo] = useState<Tipo>("geral");
  const [ordem, setOrdem] = useState("nome");
  const [periodo, setPeriodo] = useState(String(new Date().getFullYear()));
  const [f, setF] = useState(FILTRO_INICIAL);
  const [comCpf, setComCpf] = useState(false);
  const cpfs = useQuery({
    queryKey: ["cpfs-rel"],
    enabled: comCpf && can("cpf.ver"),
    queryFn: async () => new Map((await fetchAll<{ servidor_id: string; cpf: string }>((a, b) => supabase.from("servidores_sensiveis").select("servidor_id,cpf").range(a, b))).map((x) => [x.servidor_id, x.cpf])),
  });
  const hist = useQuery({
    queryKey: ["hist-rel"],
    enabled: tipo === "historico" && can("auditoria.ver"),
    queryFn: async () => (await supabase.from("auditoria").select("*").in("tabela", ["servidores"]).order("created_at", { ascending: false }).limit(2000)).data ?? [],
  });

  const rel = useMemo(() => {
    if (!refs.data || !serv.data) return null;
    return montar(tipo, aplicarFiltros(serv.data, f), refs.data, vagas.data ?? [], serv.data, ordem, comCpf ? cpfs.data : undefined, hist.data ?? []);
  }, [tipo, refs.data, serv.data, vagas.data, f, ordem, comCpf, cpfs.data, hist.data]);

  if (!can("relatorios.ver")) return <SemPermissao />;
  if (!refs.data || !serv.data || !rel) return <p className="text-muted-foreground">Carregando…</p>;
  const titulo = TIPOS.find((t) => t.v === tipo)!.l;
  const cab = { municipio: cfg.data?.municipio ?? "", secretaria: cfg.data?.secretaria ?? "", titulo, periodo, filtros: rel.usaFiltros ? descreverFiltros(f, refs.data) : "Não se aplica", brasao: cfg.data?.brasao_url };
  const arq = titulo.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-");

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Escolha o relatório, ajuste filtros e ordenação, e imprima (A4) ou exporte."
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            <Button variant="outline" onClick={() => exportarPdf(arq, cab, rel.cols, rel.rows)}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
            <Button onClick={() => exportarExcel(arq, cab, rel.cols, rel.rows)}><Sheet className="mr-2 h-4 w-4" />Excel</Button>
          </>
        }
      />
      <div className="no-print mb-3 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Relatório" className="lg:col-span-2">
          <NativeSelect value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
            {["Servidores", "Quantitativos", "Vagas", "Controle"].map((g) => (
              <optgroup key={g} label={g}>{TIPOS.filter((t) => t.grupo === g).map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</optgroup>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Ordenar por"><NativeSelect value={ordem} onChange={(e) => setOrdem(e.target.value)}>{ORDENS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</NativeSelect></Field>
        <Field label="Período de referência"><Input value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Field>
        {can("cpf.ver") && rel.usaFiltros && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={comCpf} onChange={(e) => setComCpf(e.target.checked)} /> Incluir CPF (uso administrativo restrito)</label>
        )}
      </div>
      {rel.usaFiltros && <Filtros f={f} setF={setF} refs={refs.data} rows={serv.data} />}

      <div className="print-area mt-4 rounded-lg border bg-card p-6">
        <header className="mb-4 flex items-center gap-4 border-b pb-3">
          {cfg.data?.brasao_url && <img src={cfg.data.brasao_url} alt="Brasão" className="h-14 w-14 object-contain" />}
          <div className="flex-1">
            <p className="text-sm font-bold uppercase">{cab.municipio}</p>
            <p className="text-sm">{cab.secretaria}</p>
          </div>
          {cfg.data?.logo_url && <img src={cfg.data.logo_url} alt="Logomarca" className="h-12 object-contain" />}
        </header>
        <h2 className="text-lg font-bold">{titulo}</h2>
        <p className="text-xs text-muted-foreground">Período: {periodo || "—"} · Filtros: {cab.filtros} · Emitido em {new Date().toLocaleString("pt-BR")}</p>
        {rel.nota && <p className="mt-2 rounded bg-accent p-2 text-xs text-accent-foreground">{rel.nota}</p>}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr>{rel.cols.map((c) => <th key={c.key} className="border-b-2 border-foreground/30 p-1.5 text-left">{c.label}</th>)}</tr></thead>
            <tbody>{rel.rows.map((r, i) => <tr key={i} className="border-b">{rel.cols.map((c) => <td key={c.key} className="p-1.5">{String(r[c.key] ?? "")}</td>)}</tr>)}</tbody>
          </table>
          {rel.rows.length === 0 && <Vazio>Nenhum registro para os critérios escolhidos.</Vazio>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Total de linhas: {rel.rows.length}</p>
      </div>
    </>
  );
}

function montar(tipo: Tipo, rows: ServidorRow[], R: Refs, vagas: VagaRow[], todos: ServidorRow[], ordem: string, cpfs: Map<string, string> | undefined, hist: { created_at: string; acao: string; usuario_email: string | null; antes: unknown; depois: unknown; registro_id: string | null }[]): { cols: Coluna[]; rows: Record<string, unknown>[]; usaFiltros: boolean; nota?: string } {
  const nm = (m: Map<string, { nome: string }>, id: string | null) => (id ? (m.get(id)?.nome ?? "") : "");
  const catV = (s: ServidorRow) => (s.vinculo_id ? R.vinculos.map.get(s.vinculo_id)?.categoria : undefined);
  const catS = (s: ServidorRow) => (s.situacao_id ? R.situacoes.map.get(s.situacao_id)?.categoria : undefined);
  const linha = (s: ServidorRow) => ({
    matricula: s.matricula, nome: s.nome, ...(cpfs ? { cpf: cpfs.get(s.id) ? mascararCpf(cpfs.get(s.id)!) : "" } : {}),
    cargo: nm(R.cargos.map, s.cargo_id), funcao: nm(R.funcoes.map, s.funcao_id), vinculo: nm(R.vinculos.map, s.vinculo_id), situacao: nm(R.situacoes.map, s.situacao_id),
    unidade: nm(R.unidades.map, s.unidade_id), admissao: fmtData(s.data_admissao), desligamento: s.data_desligamento ? fmtData(s.data_desligamento) : "", ch: s.carga_horaria ?? "",
  });
  const colsServ: Coluna[] = [
    { key: "matricula", label: "Matrícula" }, { key: "nome", label: "Nome" }, ...(cpfs ? [{ key: "cpf", label: "CPF" }] : []),
    { key: "cargo", label: "Cargo" }, { key: "funcao", label: "Função" }, { key: "vinculo", label: "Vínculo" }, { key: "situacao", label: "Situação" }, { key: "unidade", label: "Lotação" }, { key: "admissao", label: "Admissão" },
  ];
  const lista = (filtro: (s: ServidorRow) => boolean, extra: Coluna[] = [], ord = ordem) => {
    const rs = rows.filter(filtro).map(linha);
    rs.sort((a, b) => String(a[ord as keyof typeof a] ?? "").localeCompare(String(b[ord as keyof typeof b] ?? ""), "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
    return { cols: [...colsServ, ...extra], rows: rs, usaFiltros: true };
  };
  const qtd = (key: (s: ServidorRow) => string | null, m: Map<string, { nome: string }>, label: string) => ({
    cols: [{ key: "nome", label }, { key: "total", label: "Registros" }],
    rows: [...contarPor(rows, key, new Map([...m].map(([k, v]) => [k, v.nome]))), { id: "t", nome: "TOTAL", total: rows.length }],
    usaFiltros: true,
  });
  const vagasRows = (filtro: (v: VagaRow, a: ReturnType<typeof analisarVaga>) => boolean, campo?: keyof VagaRow) => {
    const out = vagas
      .map((v) => ({ v, a: analisarVaga(v, todos, R.vinculos.map, R.situacoes.map) }))
      .filter(({ v, a }) => filtro(v, a))
      .map(({ v, a }) => ({
        ano: v.ano_referencia, cargo: nm(R.cargos.map, v.cargo_id), funcao: nm(R.funcoes.map, v.funcao_id) || "Todas", unidade: nm(R.unidades.map, v.unidade_id) || "Rede",
        lei: v.previstas_lei ?? "Não informado", autorizadas: v.autorizadas ?? "Não informado", ocupadas: a.ocupadas, disp_conf: a.disponiveisConfirmadas ?? "—",
        analise: a.disponiveisConfirmadas == null ? (a.disponiveisCalculadas ?? a.observacao) : 0, temporarios: a.temporarios, efetivos: a.efetivos,
        necessidade: a.necessidadeEstimada ?? "Dados insuficientes para cálculo", previstas: campo ? (v[campo] ?? "Não informado") : "", justificativa: v.justificativa ?? "", atualizacao: fmtData(v.updated_at.slice(0, 10)),
      }));
    out.sort((a, b) => (campo === undefined && tipo === "vagas_unidade" ? a.unidade.localeCompare(b.unidade) : 0) || a.cargo.localeCompare(b.cargo));
    const cols: Coluna[] = [
      { key: "ano", label: "Ano" }, { key: "cargo", label: "Cargo" }, { key: "funcao", label: "Função" }, ...(tipo === "vagas_unidade" ? [{ key: "unidade", label: "Unidade" }] : []),
      { key: "lei", label: "Previstos em lei" }, { key: "autorizadas", label: "Autorizadas" }, { key: "ocupadas", label: "Ocupadas" }, { key: "disp_conf", label: "Disponíveis confirmadas" },
      { key: "analise", label: "Dependem de análise" }, { key: "efetivos", label: "Efetivos" }, { key: "temporarios", label: "Temporários/PSS" }, { key: "necessidade", label: "Necessidade estimada (cálculo)" },
      ...(campo ? [{ key: "previstas", label: "Previstas nesta modalidade" }] : []), { key: "justificativa", label: "Justificativa" }, { key: "atualizacao", label: "Atualização" },
    ];
    return {
      cols, rows: out, usaFiltros: false,
      nota: "“Necessidade estimada” e “Dependem de análise” são cálculos do sistema e não constituem vagas oficialmente autorizadas. Apenas a coluna “Disponíveis confirmadas” reflete validação administrativa.",
    };
  };

  switch (tipo) {
    case "geral": return lista(() => true, [{ key: "ch", label: "C.H." }]);
    case "unidade": return lista(() => true, [], "unidade");
    case "cargo": return lista(() => true, [], "cargo");
    case "situacao": return lista(() => true, [], "situacao");
    case "efetivos": return lista((s) => catV(s) === "efetivo");
    case "temporarios": return lista((s) => catV(s) === "temporario" || catV(s) === "processo_seletivo");
    case "cedidos_permutados": return lista((s) => catS(s) === "cedido" || catS(s) === "permutado");
    case "desvio": return lista((s) => catS(s) === "desvio");
    case "aposentados_exonerados": return lista((s) => ["aposentado", "exonerado", "desligado"].includes(catS(s) ?? ""), [{ key: "desligamento", label: "Data" }]);
    case "qtd_vinculo": return qtd((s) => s.vinculo_id, R.vinculos.map, "Vínculo");
    case "qtd_unidade": return qtd((s) => s.unidade_id, R.unidades.map, "Unidade");
    case "vagas_quadro": return vagasRows(() => true);
    case "vagas_concurso": return vagasRows((v) => (v.previstas_concurso ?? 0) > 0 || v.status_validacao === "confirmado", "previstas_concurso");
    case "vagas_pss": return vagasRows((v) => (v.previstas_pss ?? 0) > 0, "previstas_pss");
    case "vagas_temporaria": return vagasRows((v) => (v.previstas_temporaria ?? 0) > 0, "previstas_temporaria");
    case "vagas_necessidade": return vagasRows(() => true);
    case "vagas_unidade": return vagasRows((v) => !!v.unidade_id);
    case "inconsistencias": {
      const out: Record<string, unknown>[] = [];
      for (const s of rows) {
        const p: string[] = [];
        if (!s.cargo_id) p.push("Sem cargo");
        if (!s.vinculo_id) p.push("Sem vínculo");
        if (!s.unidade_id) p.push("Sem lotação");
        if (!s.data_admissao) p.push("Sem data de admissão");
        if (s.data_desligamento && s.data_admissao && s.data_desligamento < s.data_admissao) p.push("Desligamento anterior à admissão");
        const cs = catS(s);
        if (["aposentado", "exonerado", "desligado"].includes(cs ?? "") && !s.data_desligamento) p.push("Situação de saída sem data");
        if (cpfs && cpfs.get(s.id) && !cpfValido(cpfs.get(s.id)!)) p.push("CPF inválido");
        if (p.length) out.push({ matricula: s.matricula, nome: s.nome, unidade: nm(R.unidades.map, s.unidade_id), problemas: p.join("; ") });
      }
      const porNome = new Map<string, ServidorRow[]>();
      rows.forEach((s) => porNome.set(s.nome.toLowerCase().trim(), [...(porNome.get(s.nome.toLowerCase().trim()) ?? []), s]));
      porNome.forEach((l) => l.length > 1 && l.forEach((s) => out.push({ matricula: s.matricula, nome: s.nome, unidade: nm(R.unidades.map, s.unidade_id), problemas: `Nome repetido em ${l.length} matrículas (verificar duplicidade ou duplo vínculo)` })));
      return { cols: [{ key: "matricula", label: "Matrícula" }, { key: "nome", label: "Nome" }, { key: "unidade", label: "Lotação" }, { key: "problemas", label: "Inconsistências" }], rows: out, usaFiltros: true };
    }
    case "historico": {
      const nomes = new Map(todos.map((s) => [s.id, `${s.nome} (${s.matricula})`]));
      return {
        cols: [{ key: "data", label: "Data/hora" }, { key: "servidor", label: "Servidor" }, { key: "acao", label: "Operação" }, { key: "campos", label: "Campos alterados" }, { key: "usuario", label: "Usuário" }],
        rows: hist.map((h) => {
          const a = (h.antes ?? {}) as Record<string, unknown>, d = (h.depois ?? {}) as Record<string, unknown>;
          const campos = Object.keys({ ...a, ...d }).filter((k) => !["updated_at", "updated_by"].includes(k) && JSON.stringify(a[k]) !== JSON.stringify(d[k]));
          return { data: new Date(h.created_at).toLocaleString("pt-BR"), servidor: nomes.get(h.registro_id ?? "") ?? String(d.nome ?? a.nome ?? ""), acao: { INSERT: "Cadastro", UPDATE: "Alteração", DELETE: "Exclusão", INATIVACAO: "Inativação" }[h.acao] ?? h.acao, campos: h.acao === "UPDATE" || h.acao === "INATIVACAO" ? campos.join(", ") : "", usuario: h.usuario_email ?? "" };
        }),
        usaFiltros: false,
      };
    }
  }
}
