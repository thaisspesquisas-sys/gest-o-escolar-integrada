import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload, CheckCircle2, Download } from "lucide-react";
import type { WorkBook } from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { Field, NativeSelect, Panel, StatCard, Vazio } from "@/components/kit";
import { Confirmar } from "@/components/Confirmar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CAMPOS, classificar, extrair, norm, sugerirMapeamento, type Classificado, type Mapeamento, type Registro } from "@/lib/importar";
import { refsQuery, useInvalidate, usePerms, useRefs, useServidores, type Refs } from "@/lib/data";
import { exportarExcel } from "@/lib/export";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({ meta: [{ title: "Importar planilha — Gestão de Servidores" }, { name: "description", content: "Importação e atualização da base de servidores." }] }),
  component: Importar,
});

type Tabela = "cargos" | "funcoes" | "vinculos" | "situacoes" | "unidades";

const CAT_VINC: [RegExp, string][] = [[/temporar/, "temporario"], [/estatut|efetiv/, "efetivo"], [/comission/, "comissionado"], [/pss|seletiv/, "processo_seletivo"]];
const CAT_SIT: [RegExp, string][] = [[/cedid|cessao/, "cedido"], [/permut/, "permutado"], [/desvi/, "desvio"], [/requisit/, "requisitado"], [/licen/, "licenca"], [/aposent/, "aposentado"], [/exoner/, "exonerado"], [/deslig/, "desligado"], [/exercicio|ativo/, "ativo"]];

/** Resolve um texto da planilha para um registro existente (nome igual ou mesma categoria). */
function resolver(refs: Refs, tabela: Tabela, texto: string | null): { id?: string; novo?: string } {
  if (!texto) return {};
  const lista = refs[tabela].list;
  const igual = lista.find((r) => norm(r.nome) === norm(texto));
  if (igual) return { id: igual.id };
  const regras = tabela === "vinculos" ? CAT_VINC : tabela === "situacoes" ? CAT_SIT : null;
  if (regras) {
    const cat = regras.find(([re]) => re.test(norm(texto)))?.[1];
    const porCat = cat && lista.find((r) => r.categoria === cat);
    if (porCat) return { id: porCat.id };
  }
  return { novo: tabela === "vinculos" || tabela === "situacoes" ? texto : texto.toUpperCase() };
}

const CAMPO_TAB: Partial<Record<keyof Registro, Tabela>> = { cargo: "cargos", funcao: "funcoes", vinculo: "vinculos", situacao: "situacoes", unidade: "unidades" };
const COL_ID: Record<Tabela, string> = { cargos: "cargo_id", funcoes: "funcao_id", vinculos: "vinculo_id", situacoes: "situacao_id", unidades: "unidade_id" };
const TEXTO = ["nome", "secretaria_origem", "data_admissao", "data_desligamento", "carga_horaria", "turno", "email", "telefone", "ato_numero", "observacoes"] as const;

function Importar() {
  const { can, data: me } = usePerms();
  const refs = useRefs();
  const serv = useServidores();
  const inval = useInvalidate();
  const qc = useQueryClient();
  const [arquivo, setArquivo] = useState<{ nome: string; wb: WorkBook } | null>(null);
  const [aba, setAba] = useState("");
  const [linhaCab, setLinhaCab] = useState(1);
  const [map, setMap] = useState<Mapeamento>({});
  const [sitPadrao, setSitPadrao] = useState("");
  const [preview, setPreview] = useState<Classificado[] | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [rodando, setRodando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [XLSXmod, setX] = useState<typeof import("xlsx") | null>(null);

  const dados = useMemo(() => {
    if (!arquivo || !aba || !XLSXmod) return { colunas: [] as string[], linhas: [] as Record<string, unknown>[] };
    const ws = arquivo.wb.Sheets[aba]!;
    const linhas = XLSXmod.utils.sheet_to_json<Record<string, unknown>>(ws, { range: linhaCab - 1, defval: null, raw: true });
    const colunas = Object.keys(linhas[0] ?? {}).filter((c) => !c.startsWith("__EMPTY"));
    return { colunas, linhas: linhas.filter((l) => Object.values(l).some((v) => v != null && String(v).trim() !== "")) };
  }, [arquivo, aba, linhaCab, XLSXmod]);

  if (!can("servidores.importar")) return <SemPermissao />;
  if (!refs.data || !serv.data) return <p className="text-muted-foreground">Carregando…</p>;
  const R = refs.data;

  async function abrir(file: File) {
    if (file.size > 15 * 1024 * 1024) return void toast.error("Arquivo muito grande (máx. 15 MB).");
    if (!/\.(xlsx|csv)$/i.test(file.name)) return void toast.error("Formato não aceito. Use XLSX ou CSV.");
    const X = await import("xlsx");
    setX(X);
    const buf = await file.arrayBuffer();
    const wb = X.read(buf, { type: "array", cellDates: true, dense: false });
    setArquivo({ nome: file.name, wb });
    const primeira = wb.SheetNames[0] ?? "";
    escolherAba(X, wb, primeira);
    setPreview(null);
    setResultado(null);
  }

  function escolherAba(X: typeof import("xlsx"), wb: WorkBook, nome: string) {
    setAba(nome);
    const ws = wb.Sheets[nome]!;
    const matriz = X.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, range: 0 }).slice(0, 12);
    const idx = matriz.findIndex((r) => (r ?? []).filter((c) => c != null && String(c).trim() !== "").length >= 3);
    const lc = idx >= 0 ? idx + 1 : 1;
    setLinhaCab(lc);
    const cols = Object.keys(X.utils.sheet_to_json<Record<string, unknown>>(ws, { range: lc - 1, defval: null })[0] ?? {});
    setMap(sugerirMapeamento(cols));
    const n = norm(nome);
    const sit = R.situacoes.list.find((s) => (n.includes("aposent") && s.categoria === "aposentado") || (n.includes("exoner") && s.categoria === "exonerado") || (n.includes("cedid") && s.categoria === "cedido") || (n.includes("desviad") && s.categoria === "desvio"));
    setSitPadrao(sit?.id ?? "");
  }

  function analisar() {
    if (!map.matricula || !map.nome) return void toast.error("Relacione ao menos as colunas de matrícula e nome.");
    const regs = extrair(dados.linhas, map, linhaCab + 1);
    const existentes = new Map(serv.data!.map((s) => [s.matricula, s]));
    const res = classificar(regs, existentes, (reg, ex) => {
      const m: string[] = [];
      for (const k of TEXTO) if (reg[k] != null && String(reg[k]) !== String(ex[k] ?? "")) m.push(k);
      for (const [campo, tab] of Object.entries(CAMPO_TAB) as [keyof Registro, Tabela][]) {
        const r = resolver(R, tab, reg[campo] as string | null);
        if ((r.id && r.id !== ex[COL_ID[tab]]) || r.novo) m.push(campo);
      }
      if (sitPadrao && !reg.situacao && ex["situacao_id"] !== sitPadrao) m.push("situacao");
      return m;
    });
    setPreview(res);
  }

  async function executar() {
    if (!preview) return;
    setRodando(true);
    try {
      const alvo = preview.filter((p) => p.classe === "novo" || p.classe === "atualizar");
      // 1. Cria cargos/funções/unidades/vínculos/situações inexistentes
      const novos: Record<Tabela, Set<string>> = { cargos: new Set(), funcoes: new Set(), vinculos: new Set(), situacoes: new Set(), unidades: new Set() };
      for (const p of alvo) for (const [campo, tab] of Object.entries(CAMPO_TAB) as [keyof Registro, Tabela][]) {
        const r = resolver(R, tab, p.reg[campo] as string | null);
        if (r.novo) novos[tab].add(r.novo);
      }
      for (const tab of Object.keys(novos) as Tabela[]) {
        if (!novos[tab].size) continue;
        const { error } = await supabase.from(tab).upsert([...novos[tab]].map((nome) => ({ nome })), { onConflict: "nome", ignoreDuplicates: true });
        if (error) throw new Error(`${tab}: ${error.message}`);
      }
      const R2 = await qc.fetchQuery({ ...refsQuery, staleTime: 0 });
      const linha = (reg: Registro, apenasPreenchidos: boolean) => {
        const o: Record<string, unknown> = { matricula: reg.matricula };
        for (const k of TEXTO) if (reg[k] != null || !apenasPreenchidos) o[k] = reg[k];
        for (const [campo, tab] of Object.entries(CAMPO_TAB) as [keyof Registro, Tabela][]) {
          const r = resolver(R2, tab, reg[campo] as string | null);
          if (r.id) o[COL_ID[tab]] = r.id;
        }
        if (!o["situacao_id"] && sitPadrao) o["situacao_id"] = sitPadrao;
        return o;
      };
      // 2. Novos registros
      const ins = alvo.filter((p) => p.classe === "novo").map((p) => linha(p.reg, false));
      const idPorMat = new Map(serv.data!.map((s) => [s.matricula, s.id]));
      for (let i = 0; i < ins.length; i += 200) {
        const { data, error } = await supabase.from("servidores").insert(ins.slice(i, i + 200) as never).select("id,matricula");
        if (error) throw new Error(error.message);
        data?.forEach((d) => idPorMat.set(d.matricula, d.id));
      }
      // 3. Atualizações (apenas campos preenchidos na planilha; nada é apagado)
      const upd = alvo.filter((p) => p.classe === "atualizar");
      for (let i = 0; i < upd.length; i += 10) {
        await Promise.all(
          upd.slice(i, i + 10).map(async (p) => {
            const { matricula: _m, ...campos } = linha(p.reg, true);
            const { error } = await supabase.from("servidores").update(campos as never).eq("id", p.existenteId!);
            if (error) throw new Error(error.message);
          }),
        );
      }
      // 4. CPF (somente perfis autorizados)
      if (can("cpf.ver") && map.cpf) {
        const cpfs = alvo.filter((p) => p.reg.cpf).map((p) => ({ servidor_id: idPorMat.get(p.reg.matricula!)!, cpf: p.reg.cpf! })).filter((x) => x.servidor_id);
        if (cpfs.length) {
          const { error } = await supabase.from("servidores_sensiveis").upsert(cpfs);
          if (error) toast.warning(`Alguns CPFs não foram gravados: ${error.message}`);
        }
      }
      const cont = (c: string) => preview.filter((p) => p.classe === c).length;
      await supabase.from("importacoes").insert({
        arquivo_nome: arquivo!.nome, aba, usuario_id: me!.user!.id, usuario_email: me!.user!.email ?? null,
        novos: cont("novo"), atualizados: cont("atualizar"), ignorados: cont("ignorar"), para_correcao: cont("correcao"),
        mapeamento: { ...map, situacao_padrao: sitPadrao || null } as never,
        dados_originais: dados.linhas.map((l) => { const c = { ...l }; if (map.cpf) delete c[map.cpf]; return c; }) as never,
        pendencias: preview.filter((p) => p.classe === "correcao").map((p) => ({ linha: p.reg.linha, matricula: p.reg.matricula, nome: p.reg.nome, motivos: p.motivos })) as never,
      });
      await inval("servidores", "refs");
      setResultado(`${cont("novo")} cadastrados, ${cont("atualizar")} atualizados, ${cont("ignorar")} sem alteração, ${cont("correcao")} para correção.`);
      setPreview(null);
      toast.success("Importação concluída.");
    } catch (e) {
      toast.error(`Importação interrompida: ${(e as Error).message}`);
    } finally {
      setRodando(false);
    }
  }

  const grupos = preview && {
    novo: preview.filter((p) => p.classe === "novo"),
    atualizar: preview.filter((p) => p.classe === "atualizar"),
    ignorar: preview.filter((p) => p.classe === "ignorar"),
    correcao: preview.filter((p) => p.classe === "correcao"),
  };

  return (
    <>
      <PageHeader title="Importar planilha" description="Envie a planilha (XLSX ou CSV), confira a correspondência das colunas e a prévia. Nada é gravado antes da sua confirmação, e dados existentes nunca são apagados." />
      {resultado && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success bg-card p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 text-success" /> Importação registrada: {resultado}
        </div>
      )}
      <Panel title="1. Arquivo">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-primary px-4 py-3 text-sm font-medium text-primary hover:bg-secondary">
            <Upload className="h-4 w-4" /> {arquivo ? arquivo.nome : "Selecionar arquivo"}
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && abrir(e.target.files[0])} />
          </label>
          {arquivo && XLSXmod && (
            <>
              <Field label="Aba da planilha" className="min-w-56">
                <NativeSelect value={aba} onChange={(e) => { escolherAba(XLSXmod, arquivo.wb, e.target.value); setPreview(null); }}>
                  {arquivo.wb.SheetNames.map((s) => <option key={s}>{s}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Linha do cabeçalho" className="w-36">
                <Input type="number" min={1} value={linhaCab} onChange={(e) => { setLinhaCab(Math.max(1, Number(e.target.value))); setPreview(null); }} />
              </Field>
              <p className="text-sm text-muted-foreground">{dados.linhas.length} linha(s) com dados · {dados.colunas.length} coluna(s)</p>
            </>
          )}
        </div>
      </Panel>

      {arquivo && dados.colunas.length > 0 && (
        <Panel title="2. Correspondência de colunas" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPOS.filter((c) => c.key !== "cpf" || can("cpf.ver")).map((c) => (
              <Field key={c.key} label={c.label + ("obrigatorio" in c ? " *" : "")}>
                <NativeSelect value={map[c.key] ?? ""} onChange={(e) => { setMap({ ...map, [c.key]: e.target.value || undefined }); setPreview(null); }}>
                  <option value="">— não importar —</option>
                  {dados.colunas.map((col) => <option key={col} value={col}>{col}</option>)}
                </NativeSelect>
              </Field>
            ))}
            <Field label="Situação para registros desta aba">
              <NativeSelect value={sitPadrao} onChange={(e) => { setSitPadrao(e.target.value); setPreview(null); }}>
                <option value="">— não definir —</option>
                {R.situacoes.list.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Matrícula é a chave de atualização. Cargos, funções e unidades inexistentes serão criados. Vínculos como “Estatutários” e “CONTRATO-TEMPORÁRIO” são associados às categorias cadastradas.
          </p>
          <div className="mt-4 overflow-x-auto">
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Primeiras linhas do arquivo</p>
            <table className="w-full text-xs">
              <thead><tr>{dados.colunas.map((c) => <th key={c} className="border-b p-1 text-left">{c}</th>)}</tr></thead>
              <tbody>
                {dados.linhas.slice(0, 5).map((l, i) => (
                  <tr key={i}>{dados.colunas.map((c) => <td key={c} className="border-b p-1">{c === map.cpf ? "•••" : l[c] instanceof Date ? (l[c] as Date).toLocaleDateString("pt-BR") : String(l[c] ?? "")}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button className="mt-4" onClick={analisar}>Gerar prévia</Button>
        </Panel>
      )}

      {grupos && (
        <Panel title="3. Prévia da importação" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Serão cadastrados" value={grupos.novo.length} />
            <StatCard label="Serão atualizados" value={grupos.atualizar.length} />
            <StatCard label="Sem alteração (ignorados)" value={grupos.ignorar.length} />
            <StatCard label="Para correção" value={grupos.correcao.length} />
          </div>
          <Tabs defaultValue="novo" className="mt-4">
            <TabsList>
              <TabsTrigger value="novo">Novos</TabsTrigger>
              <TabsTrigger value="atualizar">Atualizações</TabsTrigger>
              <TabsTrigger value="correcao">Correção</TabsTrigger>
              <TabsTrigger value="ignorar">Ignorados</TabsTrigger>
            </TabsList>
            {(Object.keys(grupos) as (keyof typeof grupos)[]).map((k) => (
              <TabsContent key={k} value={k}>
                <ListaPrevia itens={grupos[k]} />
              </TabsContent>
            ))}
          </Tabs>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={rodando || grupos.novo.length + grupos.atualizar.length === 0} onClick={() => setConfirmar(true)}>
              {rodando ? "Importando…" : "Confirmar importação"}
            </Button>
            <Button variant="outline" onClick={() => setPreview(null)}>Cancelar</Button>
            {grupos.correcao.length > 0 && (
              <Button variant="outline" onClick={() => exportarExcel("pendencias-importacao", { municipio: "", secretaria: "", titulo: `Pendências — ${arquivo?.nome} / ${aba}` }, [{ key: "linha", label: "Linha" }, { key: "matricula", label: "Matrícula" }, { key: "nome", label: "Nome" }, { key: "motivos", label: "Motivos" }], grupos.correcao.map((p) => ({ linha: p.reg.linha, matricula: p.reg.matricula, nome: p.reg.nome, motivos: p.motivos.join("; ") })))}>
                <Download className="mr-2 h-4 w-4" /> Baixar pendências
              </Button>
            )}
          </div>
        </Panel>
      )}

      <Confirmar open={confirmar} onOpenChange={setConfirmar} titulo="Confirmar importação?" acao="Importar" onConfirm={executar}>
        Serão cadastrados <b>{grupos?.novo.length}</b> e atualizados <b>{grupos?.atualizar.length}</b> registros. Nas atualizações, apenas os campos preenchidos na planilha substituem os atuais; nenhum dado é apagado. A operação ficará registrada.
      </Confirmar>
    </>
  );
}

function ListaPrevia({ itens }: { itens: Classificado[] }) {
  if (!itens.length) return <Vazio>Nenhum registro.</Vazio>;
  return (
    <div className="max-h-96 overflow-auto rounded border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted"><tr><th className="p-2 text-left">Linha</th><th className="p-2 text-left">Matrícula</th><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Cargo</th><th className="p-2 text-left">Lotação</th><th className="p-2 text-left">Observação</th></tr></thead>
        <tbody>
          {itens.slice(0, 500).map((p) => (
            <tr key={p.reg.linha} className="border-t">
              <td className="p-2">{p.reg.linha}</td><td className="p-2 font-mono">{p.reg.matricula}</td><td className="p-2">{p.reg.nome}</td><td className="p-2">{p.reg.cargo}</td><td className="p-2">{p.reg.unidade}</td>
              <td className="p-2 text-muted-foreground">{p.motivos.join("; ") || (p.mudancas ? `Altera: ${p.mudancas.join(", ")}` : "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {itens.length > 500 && <p className="p-2 text-xs text-muted-foreground">Exibindo 500 de {itens.length}.</p>}
    </div>
  );
}
