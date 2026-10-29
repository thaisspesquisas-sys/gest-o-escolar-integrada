import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Field, NativeSelect, RefSelect, Vazio } from "@/components/kit";
import { Confirmar } from "@/components/Confirmar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchAll, fmtData, usePerms, useRefs, useServidores } from "@/lib/data";
import { analisarVaga, type VagaRow } from "@/lib/vagas";
import { AGUARDANDO, INSUFICIENTE } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/vagas")({
  head: () => ({ meta: [{ title: "Quadro de vagas — Gestão de Servidores" }, { name: "description", content: "Planejamento de vagas para concurso e contratação." }] }),
  component: Vagas,
});

const vagasQueryKey = ["vagas"];
function useVagas() {
  return useQuery({ queryKey: vagasQueryKey, queryFn: () => fetchAll<VagaRow>((a, b) => supabase.from("vagas").select("*").order("ano_referencia", { ascending: false }).range(a, b)) });
}

const NUM = ["previstas_lei", "autorizadas", "reservadas", "previstas_concurso", "previstas_pss", "previstas_temporaria"] as const;

function Vagas() {
  const { can } = usePerms();
  const pode = can("vagas.editar");
  const refs = useRefs();
  const serv = useServidores();
  const vagas = useVagas();
  const [ano, setAno] = useState("");
  const [unidade, setUnidade] = useState("");
  const [edit, setEdit] = useState<Partial<VagaRow> | null>(null);
  const [del, setDel] = useState<VagaRow | null>(null);

  if (!refs.data || !vagas.data) return <p className="text-muted-foreground">Carregando…</p>;
  const R = refs.data;
  const lista = vagas.data.filter((v) => (!ano || String(v.ano_referencia) === ano) && (!unidade || v.unidade_id === unidade));
  const anos = [...new Set(vagas.data.map((v) => String(v.ano_referencia)))];

  async function salvar() {
    if (!edit?.cargo_id) return toast.error("Selecione o cargo.");
    const payload: Record<string, unknown> = {
      ano_referencia: Number(edit.ano_referencia) || new Date().getFullYear(), cargo_id: edit.cargo_id, funcao_id: edit.funcao_id || null, unidade_id: edit.unidade_id || null,
      status_validacao: edit.status_validacao ?? "em_analise", justificativa: edit.justificativa || null,
    };
    for (const k of NUM) {
      const v = edit[k];
      if (v != null && String(v) !== "" && Number(v) < 0) return toast.error("Quantidades não podem ser negativas.");
      payload[k] = v == null || String(v) === "" ? (k === "reservadas" ? 0 : null) : Number(v);
    }
    const { error } = edit.id ? await supabase.from("vagas").update(payload as never).eq("id", edit.id) : await supabase.from("vagas").insert(payload as never);
    if (error) return toast.error(error.message);
    toast.success("Quadro atualizado.");
    setEdit(null);
    vagas.refetch();
  }
  async function excluir(v: VagaRow) {
    const { error } = await supabase.from("vagas").delete().eq("id", v.id);
    if (error) return toast.error(error.message);
    vagas.refetch();
  }
  const n = (x: number | null) => (x == null ? "—" : x);

  return (
    <>
      <PageHeader
        title="Quadro de vagas"
        description="Informe por cargo as vagas previstas em lei e autorizadas. O sistema calcula ocupação com base nos efetivos em exercício. Aposentadorias e exonerações não geram vaga automaticamente: a disponibilidade só é “confirmada” após validação da equipe competente."
        actions={pode && <Button onClick={() => setEdit({ ano_referencia: new Date().getFullYear() + 1, status_validacao: "em_analise", reservadas: 0 })}><Plus className="mr-2 h-4 w-4" />Nova linha do quadro</Button>}
      />
      <div className="mb-3 flex flex-wrap gap-3">
        <NativeSelect className="w-40" value={ano} onChange={(e) => setAno(e.target.value)}><option value="">Todos os anos</option>{anos.map((a) => <option key={a}>{a}</option>)}</NativeSelect>
        <RefSelect className="w-72" refs={R.unidades.list} value={unidade} onChange={setUnidade} todos="Todas as unidades" />
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2">Ano</th><th className="p-2">Cargo / função</th><th className="p-2">Unidade</th>
              <th className="p-2 text-right">Lei</th><th className="p-2 text-right">Autoriz.</th><th className="p-2 text-right">Ocup. (efetivos)</th><th className="p-2 text-right">Reserv.</th>
              <th className="p-2 text-right">Temp./PSS</th><th className="p-2 text-right">Outras sit.</th><th className="p-2 text-right">Disp. calculada</th><th className="p-2">Disp. confirmada</th>
              <th className="p-2 text-right">Concurso / PSS / Temp.</th><th className="p-2">Atualizado</th><th />
            </tr>
          </thead>
          <tbody>
            {lista.map((v) => {
              const a = analisarVaga(v, serv.data ?? [], R.vinculos.map, R.situacoes.map);
              return (
                <tr key={v.id} className="border-t align-top">
                  <td className="p-2">{v.ano_referencia}</td>
                  <td className="p-2 font-medium">{R.cargos.map.get(v.cargo_id)?.nome}<div className="text-xs text-muted-foreground">{v.funcao_id ? R.funcoes.map.get(v.funcao_id)?.nome : "Todas as funções"}</div></td>
                  <td className="p-2">{v.unidade_id ? R.unidades.map.get(v.unidade_id)?.nome : "Rede"}</td>
                  <td className="p-2 text-right">{n(v.previstas_lei)}</td><td className="p-2 text-right">{n(v.autorizadas)}</td><td className="p-2 text-right">{a.ocupadas}</td><td className="p-2 text-right">{v.reservadas}</td>
                  <td className="p-2 text-right">{a.temporarios}</td><td className="p-2 text-right">{a.outrasSituacoes}</td>
                  <td className="p-2 text-right">{a.disponiveisCalculadas ?? <span className="text-xs text-muted-foreground">{INSUFICIENTE}</span>}</td>
                  <td className="p-2">{a.disponiveisConfirmadas != null ? <Badge className="bg-success text-primary-foreground">{a.disponiveisConfirmadas}</Badge> : <Badge variant="outline">{a.observacao ?? AGUARDANDO}</Badge>}</td>
                  <td className="p-2 text-right whitespace-nowrap">{n(v.previstas_concurso)} / {n(v.previstas_pss)} / {n(v.previstas_temporaria)}</td>
                  <td className="p-2 whitespace-nowrap text-xs">{fmtData(v.updated_at.slice(0, 10))}</td>
                  <td className="p-2 whitespace-nowrap">
                    {pode && <Button size="icon" variant="ghost" onClick={() => setEdit(v)}><Pencil className="h-4 w-4" /></Button>}
                    {pode && <Button size="icon" variant="ghost" onClick={() => setDel(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && <Vazio>Nenhuma linha no quadro de vagas. Cadastre o quadro de cargos para que o sistema calcule as vagas.</Vazio>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Fórmula: disponível calculada = autorizadas − efetivos em exercício no cargo − reservadas (mínimo 0). “Temp./PSS” mostra quantos postos estão hoje supridos por contratação temporária.
      </p>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar linha do quadro" : "Nova linha do quadro de vagas"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Ano de referência"><Input type="number" value={edit.ano_referencia ?? ""} onChange={(e) => setEdit({ ...edit, ano_referencia: Number(e.target.value) })} /></Field>
              <Field label="Cargo *" className="sm:col-span-2"><RefSelect refs={R.cargos.list} value={edit.cargo_id ?? ""} onChange={(v) => setEdit({ ...edit, cargo_id: v })} todos="—" /></Field>
              <Field label="Função (opcional)" className="sm:col-span-3"><RefSelect refs={R.funcoes.list} value={edit.funcao_id ?? ""} onChange={(v) => setEdit({ ...edit, funcao_id: v })} todos="Todas" /></Field>
              <Field label="Unidade (opcional)" className="sm:col-span-3"><RefSelect refs={R.unidades.list} value={edit.unidade_id ?? ""} onChange={(v) => setEdit({ ...edit, unidade_id: v })} todos="Rede inteira" /></Field>
              {([["previstas_lei", "Previstas em lei"], ["autorizadas", "Autorizadas p/ provimento"], ["reservadas", "Reservadas / bloqueadas"], ["previstas_concurso", "Previstas p/ concurso"], ["previstas_pss", "Previstas p/ processo seletivo"], ["previstas_temporaria", "Previstas p/ contratação temporária"]] as const).map(([k, l]) => (
                <Field key={k} label={l}><Input type="number" min={0} value={edit[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              ))}
              <Field label="Validação" className="sm:col-span-3">
                <NativeSelect value={edit.status_validacao} onChange={(e) => setEdit({ ...edit, status_validacao: e.target.value as VagaRow["status_validacao"] })}>
                  <option value="em_analise">Em análise (estimativa do sistema)</option>
                  <option value="confirmado">Confirmado administrativamente</option>
                </NativeSelect>
              </Field>
              <Field label="Justificativa / base legal / ato" className="sm:col-span-3"><Textarea value={edit.justificativa ?? ""} onChange={(e) => setEdit({ ...edit, justificativa: e.target.value })} /></Field>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button><Button onClick={salvar}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Confirmar perigo open={!!del} onOpenChange={(o) => !o && setDel(null)} titulo="Excluir linha do quadro?" acao="Excluir" onConfirm={() => del && excluir(del)}>A exclusão ficará registrada na auditoria.</Confirmar>
    </>
  );
}
