import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Field, NativeSelect, Panel, StatCard, Vazio } from "@/components/kit";
import { Confirmar } from "@/components/Confirmar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchAll, useInvalidate, usePerms, useRefs, useServidores } from "@/lib/data";
import { contarPor, emExercicio } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/unidades")({
  head: () => ({ meta: [{ title: "Unidades e turmas — Gestão de Servidores" }, { name: "description", content: "Unidades escolares, turmas e lotação." }] }),
  component: Unidades,
});

type Unidade = { id: string; nome: string; codigo: string | null; endereco: string | null; localidade: string | null; tipo: string | null; situacao: string; observacoes: string | null };
type Turma = { id: string; unidade_id: string; ano_letivo: number; etapa: string; nome: string; turno: string | null };
const ETAPAS = ["Creche", "Pré-escola", "Anos iniciais (1º ao 5º)", "Anos finais (6º ao 9º)", "EJA", "Educação especial", "Outra"];

function Unidades() {
  const { can } = usePerms();
  const pode = can("cadastros.editar");
  const refs = useRefs();
  const serv = useServidores();
  const inval = useInvalidate();
  const unidades = useQuery({ queryKey: ["unidades-full"], queryFn: () => fetchAll<Unidade>((a, b) => supabase.from("unidades").select("*").order("nome").range(a, b)) });
  const turmas = useQuery({ queryKey: ["turmas"], queryFn: () => fetchAll<Turma>((a, b) => supabase.from("turmas").select("*").order("etapa").range(a, b)) });
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [edit, setEdit] = useState<Partial<Unidade> | null>(null);
  const [del, setDel] = useState<Unidade | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const turmasAno = useMemo(() => (turmas.data ?? []).filter((t) => !ano || String(t.ano_letivo) === ano), [turmas.data, ano]);
  const anos = useMemo(() => [...new Set([String(new Date().getFullYear()), String(new Date().getFullYear() + 1), ...(turmas.data ?? []).map((t) => String(t.ano_letivo))])].sort(), [turmas.data]);

  if (!unidades.data || !refs.data || !turmas.data) return <p className="text-muted-foreground">Carregando…</p>;
  const R = refs.data;
  const lotados = (id: string) => (serv.data ?? []).filter((s) => s.unidade_id === id && emExercicio(s, R.situacoes.map));
  const porLocal = contarPor(unidades.data, (u) => u.localidade ?? null, new Map(unidades.data.map((u) => [u.localidade ?? "", u.localidade ?? ""])));
  const lista = unidades.data.filter((u) => u.nome.toLowerCase().includes(busca.toLowerCase()) || (u.codigo ?? "").includes(busca));
  const refresh = () => { unidades.refetch(); inval("refs"); };

  async function salvar() {
    if (!edit?.nome?.trim()) return toast.error("Informe o nome da unidade.");
    const payload = { nome: edit.nome.trim().toUpperCase(), codigo: edit.codigo || null, endereco: edit.endereco || null, localidade: edit.localidade || null, tipo: edit.tipo || null, situacao: edit.situacao || "Ativa", observacoes: edit.observacoes || null };
    const { error } = edit.id ? await supabase.from("unidades").update(payload).eq("id", edit.id) : await supabase.from("unidades").insert(payload);
    if (error) return toast.error(error.code === "23505" ? "Já existe unidade com este nome ou código." : error.message);
    toast.success("Unidade salva.");
    setEdit(null);
    refresh();
  }
  async function excluir(u: Unidade) {
    const { error } = await supabase.from("unidades").delete().eq("id", u.id);
    if (error) return toast.error(error.code === "23503" ? "Há servidores ou vagas vinculados; altere a situação para inativa." : error.message);
    refresh();
  }

  return (
    <>
      <PageHeader
        title="Unidades escolares e turmas"
        description="Quantitativos calculados a partir das unidades, turmas e servidores efetivamente cadastrados."
        actions={pode && <Button onClick={() => setEdit({ situacao: "Ativa" })}><Plus className="mr-2 h-4 w-4" />Nova unidade</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="primary" label="Unidades no município" value={unidades.data.length} hint={`${unidades.data.filter((u) => u.situacao === "Ativa").length} ativas`} />
        <StatCard label={`Turmas ${ano || "(todos os anos)"}`} value={turmasAno.length} />
        <Panel title="Unidades por localidade">
          <ul className="text-sm">{porLocal.map((l) => <li key={l.id} className="flex justify-between"><span>{l.id || "Não informada"}</span><b>{l.total}</b></li>)}</ul>
        </Panel>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Pesquisar unidade ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <NativeSelect className="w-40" value={ano} onChange={(e) => setAno(e.target.value)}>
          <option value="">Todos os anos</option>
          {anos.map((a) => <option key={a}>{a}</option>)}
        </NativeSelect>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="w-8" /><th className="p-3">Unidade</th><th className="p-3">Código</th><th className="p-3">Localidade</th><th className="p-3">Situação</th><th className="p-3 text-right">Turmas</th><th className="p-3 text-right">Servidores em exercício</th><th /></tr></thead>
          <tbody>
            {lista.map((u) => {
              const l = lotados(u.id);
              const ts = turmasAno.filter((t) => t.unidade_id === u.id);
              const open = aberta === u.id;
              return (
                <>
                  <tr key={u.id} className="border-t">
                    <td className="pl-2"><Button size="icon" variant="ghost" onClick={() => setAberta(open ? null : u.id)} aria-label="Detalhes">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></td>
                    <td className="p-3 font-medium">{u.nome}</td><td className="p-3">{u.codigo ?? "—"}</td><td className="p-3">{u.localidade ?? "—"}</td><td className="p-3">{u.situacao}</td>
                    <td className="p-3 text-right tabular-nums">{ts.length}</td><td className="p-3 text-right tabular-nums">{l.length}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {pode && <Button size="icon" variant="ghost" onClick={() => setEdit(u)} title="Editar"><Pencil className="h-4 w-4" /></Button>}
                      {pode && <Button size="icon" variant="ghost" onClick={() => setDel(u)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </td>
                  </tr>
                  {open && (
                    <tr key={u.id + "-d"} className="bg-muted/40">
                      <td colSpan={8} className="p-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <TurmasUnidade unidadeId={u.id} turmas={ts} pode={pode} ano={ano} onChange={() => turmas.refetch()} />
                          <div>
                            <h3 className="mb-2 text-sm font-bold">Servidores por cargo e função</h3>
                            {l.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum servidor lotado.</p> : (
                              <ul className="space-y-0.5 text-sm">
                                {contarPor(l, (s) => `${s.cargo_id ?? ""}|${s.funcao_id ?? ""}`, new Map(l.map((s) => [`${s.cargo_id ?? ""}|${s.funcao_id ?? ""}`, [s.cargo_id && R.cargos.map.get(s.cargo_id)?.nome, s.funcao_id && R.funcoes.map.get(s.funcao_id)?.nome].filter(Boolean).join(" — ") || "Não informado"]))).map((c) => (
                                  <li key={c.id} className="flex justify-between gap-2"><span>{c.nome}</span><b className="tabular-nums">{c.total}</b></li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && <Vazio>Nenhuma unidade cadastrada. As unidades também são criadas automaticamente na importação da planilha.</Vazio>}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar unidade" : "Nova unidade"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome *" className="sm:col-span-2"><Input value={edit.nome ?? ""} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></Field>
              <Field label="Código identificador (INEP ou interno)"><Input value={edit.codigo ?? ""} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} /></Field>
              <Field label="Tipo"><Input placeholder="Escola, creche, setor…" value={edit.tipo ?? ""} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })} /></Field>
              <Field label="Endereço" className="sm:col-span-2"><Input value={edit.endereco ?? ""} onChange={(e) => setEdit({ ...edit, endereco: e.target.value })} /></Field>
              <Field label="Localidade / bairro / distrito"><Input value={edit.localidade ?? ""} onChange={(e) => setEdit({ ...edit, localidade: e.target.value })} /></Field>
              <Field label="Situação">
                <NativeSelect value={edit.situacao ?? "Ativa"} onChange={(e) => setEdit({ ...edit, situacao: e.target.value })}><option>Ativa</option><option>Inativa</option><option>Em reforma</option></NativeSelect>
              </Field>
              <Field label="Observações" className="sm:col-span-2"><Textarea value={edit.observacoes ?? ""} onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Confirmar perigo open={!!del} onOpenChange={(o) => !o && setDel(null)} titulo="Excluir unidade?" acao="Excluir" onConfirm={() => del && excluir(del)}>
        A unidade <b>{del?.nome}</b> e suas turmas serão removidas. Unidades com servidores lotados não podem ser excluídas.
      </Confirmar>
    </>
  );
}

function TurmasUnidade({ unidadeId, turmas, pode, ano, onChange }: { unidadeId: string; turmas: Turma[]; pode: boolean; ano: string; onChange: () => void }) {
  const [n, setN] = useState({ etapa: ETAPAS[0], nome: "", turno: "Manhã", qtd: 1 });
  async function add() {
    if (!n.nome.trim()) return toast.error("Informe o nome/série da turma.");
    const anoLetivo = Number(ano) || new Date().getFullYear();
    const linhas = Array.from({ length: Math.min(30, Math.max(1, n.qtd)) }, (_, i) => ({ unidade_id: unidadeId, ano_letivo: anoLetivo, etapa: n.etapa, nome: n.qtd > 1 ? `${n.nome.trim()} ${String.fromCharCode(65 + i)}` : n.nome.trim(), turno: n.turno }));
    const { error } = await supabase.from("turmas").insert(linhas);
    if (error) return toast.error(error.message);
    setN({ ...n, nome: "", qtd: 1 });
    onChange();
  }
  async function rem(id: string) {
    const { error } = await supabase.from("turmas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  }
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">Turmas {ano && `(${ano})`}</h3>
      {turmas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma turma cadastrada.</p> : (
        <ul className="space-y-1 text-sm">
          {turmas.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 rounded bg-card px-2 py-1">
              <span>{t.nome} <span className="text-muted-foreground">· {t.etapa} · {t.turno}</span></span>
              {pode && <button className="text-xs text-destructive" onClick={() => rem(t.id)}>remover</button>}
            </li>
          ))}
        </ul>
      )}
      {pode && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <NativeSelect value={n.etapa} onChange={(e) => setN({ ...n, etapa: e.target.value })} className="col-span-2">{ETAPAS.map((e) => <option key={e}>{e}</option>)}</NativeSelect>
          <Input placeholder="Série / nome" value={n.nome} onChange={(e) => setN({ ...n, nome: e.target.value })} />
          <NativeSelect value={n.turno} onChange={(e) => setN({ ...n, turno: e.target.value })}><option>Manhã</option><option>Tarde</option><option>Noite</option><option>Integral</option></NativeSelect>
          <div className="flex gap-1">
            <Input type="number" min={1} max={30} title="Quantidade" value={n.qtd} onChange={(e) => setN({ ...n, qtd: Number(e.target.value) })} />
            <Button size="icon" onClick={add} aria-label="Adicionar turma"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
