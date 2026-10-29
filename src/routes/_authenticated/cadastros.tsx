import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { NativeSelect, Panel, Vazio } from "@/components/kit";
import { Confirmar } from "@/components/Confirmar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvalidate, usePerms, useRefs, useServidores } from "@/lib/data";
import type { Ref } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/cadastros")({
  head: () => ({ meta: [{ title: "Cargos e categorias — Gestão de Servidores" }, { name: "description", content: "Cargos, funções, vínculos e situações funcionais." }] }),
  component: Cadastros,
});

const CATS_V = [["efetivo", "Efetivo"], ["temporario", "Contratado temporário"], ["processo_seletivo", "Processo seletivo"], ["comissionado", "Comissionado"], ["outro", "Outro"]];
const CATS_S = [["ativo", "Em exercício"], ["cedido", "Cedido"], ["permutado", "Permutado"], ["desvio", "Desvio de função"], ["requisitado", "Requisitado"], ["licenca", "Licença"], ["aposentado", "Aposentado"], ["exonerado", "Exonerado"], ["desligado", "Desligado"], ["outro", "Outro"]];

type Tab = "cargos" | "funcoes" | "vinculos" | "situacoes";

function Cadastros() {
  const refs = useRefs();
  const serv = useServidores();
  if (!refs.data) return <p className="text-muted-foreground">Carregando…</p>;
  const uso = (col: string, id: string) => serv.data?.filter((s) => s[col] === id).length ?? 0;
  return (
    <>
      <PageHeader title="Cargos e categorias" description="Listas usadas no cadastro e nos indicadores. As categorias definem como cada vínculo ou situação entra nos cálculos do painel." />
      <Tabs defaultValue="cargos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="cargos">Cargos</TabsTrigger>
          <TabsTrigger value="funcoes">Funções</TabsTrigger>
          <TabsTrigger value="vinculos">Tipos de vínculo</TabsTrigger>
          <TabsTrigger value="situacoes">Situações funcionais</TabsTrigger>
        </TabsList>
        <TabsContent value="cargos"><Lista tab="cargos" itens={refs.data.cargos.list} uso={(id) => uso("cargo_id", id)} /></TabsContent>
        <TabsContent value="funcoes"><Lista tab="funcoes" itens={refs.data.funcoes.list} uso={(id) => uso("funcao_id", id)} /></TabsContent>
        <TabsContent value="vinculos"><Lista tab="vinculos" itens={refs.data.vinculos.list} uso={(id) => uso("vinculo_id", id)} cats={CATS_V} /></TabsContent>
        <TabsContent value="situacoes"><Lista tab="situacoes" itens={refs.data.situacoes.list} uso={(id) => uso("situacao_id", id)} cats={CATS_S} exercicio /></TabsContent>
      </Tabs>
    </>
  );
}

function Lista({ tab, itens, uso, cats, exercicio }: { tab: Tab; itens: Ref[]; uso: (id: string) => number; cats?: string[][]; exercicio?: boolean }) {
  const { can } = usePerms();
  const inval = useInvalidate();
  const pode = can("cadastros.editar");
  const [novo, setNovo] = useState("");
  const [edits, setEdits] = useState<Record<string, Partial<Ref>>>({});
  const [del, setDel] = useState<Ref | null>(null);
  const [busca, setBusca] = useState("");

  async function adicionar() {
    if (!novo.trim()) return;
    const { error } = await supabase.from(tab).insert({ nome: novo.trim() } as never);
    if (error) return void toast.error(error.code === "23505" ? "Já existe um item com este nome." : error.message);
    setNovo("");
    inval("refs");
  }
  async function salvar(id: string) {
    const { error } = await supabase.from(tab).update(edits[id] as never).eq("id", id);
    if (error) return void toast.error(error.code === "23505" ? "Já existe um item com este nome." : error.message);
    setEdits((e) => { const c = { ...e }; delete c[id]; return c; });
    toast.success("Salvo.");
    inval("refs", "servidores");
  }
  async function excluir(r: Ref) {
    const { error } = await supabase.from(tab).delete().eq("id", r.id);
    if (error) return void toast.error(error.code === "23503" ? "Item em uso por servidores ou vagas; não pode ser excluído." : error.message);
    inval("refs");
  }
  const mostra = itens.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()));
  return (
    <Panel>
      <div className="mb-3 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Filtrar…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {pode && (
          <>
            <Input className="max-w-sm" placeholder="Novo item" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adicionar()} />
            <Button onClick={adicionar}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
          </>
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Nome</th>{cats && <th className="p-2">Categoria para cálculo</th>}{exercicio && <th className="p-2">Conta como em exercício</th>}<th className="p-2 text-right">Registros</th><th /></tr></thead>
        <tbody>
          {mostra.map((r) => {
            const e = { ...r, ...edits[r.id] };
            const set = (p: Partial<Ref>) => setEdits((x) => ({ ...x, [r.id]: { ...x[r.id], ...p } }));
            return (
              <tr key={r.id} className="border-t">
                <td className="p-2">{pode ? <Input value={e.nome} onChange={(ev) => set({ nome: ev.target.value })} /> : r.nome}</td>
                {cats && (
                  <td className="p-2">
                    <NativeSelect disabled={!pode} value={e.categoria} onChange={(ev) => set({ categoria: ev.target.value })}>
                      {cats.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </NativeSelect>
                  </td>
                )}
                {exercicio && <td className="p-2"><Switch disabled={!pode} checked={!!e.em_exercicio} onCheckedChange={(v) => set({ em_exercicio: v })} /></td>}
                <td className="p-2 text-right tabular-nums">{uso(r.id)}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  {pode && edits[r.id] && <Button size="icon" variant="ghost" title="Salvar" onClick={() => salvar(r.id)}><Save className="h-4 w-4 text-primary" /></Button>}
                  {pode && <Button size="icon" variant="ghost" title="Excluir" onClick={() => setDel(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {mostra.length === 0 && <Vazio>Nenhum item.</Vazio>}
      <Confirmar perigo open={!!del} onOpenChange={(o) => !o && setDel(null)} titulo="Excluir item?" acao="Excluir" onConfirm={() => del && excluir(del)}>
        “{del?.nome}” será removido. Itens em uso não podem ser excluídos.
      </Confirmar>
    </Panel>
  );
}
