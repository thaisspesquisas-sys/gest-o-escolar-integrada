import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Ban, History, Trash2, RotateCcw, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { Filtros, FILTRO_INICIAL, aplicarFiltros, descreverFiltros } from "@/components/Filtros";
import { ServidorForm } from "@/components/ServidorForm";
import { Confirmar } from "@/components/Confirmar";
import { Historico } from "@/components/Historico";
import { Vazio } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { configQuery, fmtData, useInvalidate, usePerms, useRefs, useServidores } from "@/lib/data";
import { exportarExcel } from "@/lib/export";
import { useQuery } from "@tanstack/react-query";
import type { ServidorRow } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/servidores")({
  head: () => ({ meta: [{ title: "Servidores — Gestão de Servidores" }, { name: "description", content: "Cadastro geral de servidores." }] }),
  component: Servidores,
});

const POR_PAGINA = 50;

function Servidores() {
  const { can } = usePerms();
  const refs = useRefs();
  const serv = useServidores();
  const cfg = useQuery(configQuery);
  const inval = useInvalidate();
  const [f, setF] = useState(FILTRO_INICIAL);
  const [pag, setPag] = useState(0);
  const [edit, setEdit] = useState<ServidorRow | null | undefined>(undefined);
  const [inativar, setInativar] = useState<ServidorRow | null>(null);
  const [excluir, setExcluir] = useState<ServidorRow | null>(null);
  const [hist, setHist] = useState<string | null>(null);

  const rows = useMemo(() => (serv.data ? aplicarFiltros(serv.data, f) : []), [serv.data, f]);
  if (!can("servidores.ver")) return <SemPermissao />;
  if (!refs.data || !serv.data) return <p className="text-muted-foreground">Carregando…</p>;
  const R = refs.data;
  const nome = (m: Map<string, { nome: string }>, id: string | null) => (id ? (m.get(id)?.nome ?? "—") : "—");
  const pagina = rows.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);
  const paginas = Math.max(1, Math.ceil(rows.length / POR_PAGINA));

  async function alternarAtivo(s: ServidorRow, ativo: boolean) {
    const { error } = await supabase.from("servidores").update({ ativo }).eq("id", s.id);
    if (error) return void toast.error(error.message);
    toast.success(ativo ? "Registro reativado." : "Registro inativado. O histórico foi preservado.");
    inval("servidores");
  }
  async function remover(s: ServidorRow) {
    const { error } = await supabase.from("servidores").delete().eq("id", s.id);
    if (error) return void toast.error(error.code === "23503" ? "Registro vinculado a outros dados; prefira inativar." : error.message);
    toast.success("Registro excluído.");
    inval("servidores");
  }

  function exportar() {
    const cols = [
      { key: "matricula", label: "Matrícula" }, { key: "nome", label: "Nome" }, { key: "cargo", label: "Cargo" }, { key: "funcao", label: "Função" },
      { key: "vinculo", label: "Vínculo" }, { key: "situacao", label: "Situação" }, { key: "unidade", label: "Lotação" },
      { key: "admissao", label: "Admissão" }, { key: "ch", label: "Carga horária" }, { key: "ativo", label: "Registro" },
    ];
    exportarExcel(
      "servidores",
      { municipio: cfg.data?.municipio ?? "", secretaria: cfg.data?.secretaria ?? "", titulo: "Relação geral de servidores", filtros: descreverFiltros(f, R) },
      cols,
      rows.map((s) => ({
        matricula: s.matricula, nome: s.nome, cargo: nome(R.cargos.map, s.cargo_id), funcao: nome(R.funcoes.map, s.funcao_id), vinculo: nome(R.vinculos.map, s.vinculo_id),
        situacao: nome(R.situacoes.map, s.situacao_id), unidade: nome(R.unidades.map, s.unidade_id), admissao: fmtData(s.data_admissao), ch: s.carga_horaria ?? "", ativo: s.ativo ? "Ativo" : "Inativado",
      })),
    );
  }

  return (
    <>
      <PageHeader
        title="Servidores"
        description="Cadastro geral. Prefira inativar a excluir, para preservar o histórico funcional."
        actions={
          <>
            <Button variant="outline" onClick={exportar}><Download className="mr-2 h-4 w-4" />Exportar Excel</Button>
            {can("servidores.editar") && <Button onClick={() => setEdit(null)}><Plus className="mr-2 h-4 w-4" />Novo servidor</Button>}
          </>
        }
      />
      <Filtros f={f} setF={(x) => { setF(x); setPag(0); }} refs={R} rows={serv.data} />
      <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="p-3">Matrícula</th><th className="p-3">Nome</th><th className="p-3">Cargo / função</th><th className="p-3">Vínculo / situação</th><th className="p-3">Lotação</th><th className="p-3">Admissão</th><th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pagina.map((s) => (
              <tr key={s.id} className="border-t align-top">
                <td className="p-3 font-mono text-xs">{s.matricula}</td>
                <td className="p-3 font-medium">{s.nome}{!s.ativo && <Badge variant="outline" className="ml-2">Inativado</Badge>}</td>
                <td className="p-3">{nome(R.cargos.map, s.cargo_id)}<div className="text-xs text-muted-foreground">{nome(R.funcoes.map, s.funcao_id)}</div></td>
                <td className="p-3">{nome(R.vinculos.map, s.vinculo_id)}<div className="text-xs text-muted-foreground">{nome(R.situacoes.map, s.situacao_id)}</div></td>
                <td className="p-3">{nome(R.unidades.map, s.unidade_id)}</td>
                <td className="p-3 whitespace-nowrap">{fmtData(s.data_admissao)}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {can("auditoria.ver") && <Button size="icon" variant="ghost" title="Histórico" onClick={() => setHist(s.id)}><History className="h-4 w-4" /></Button>}
                    {can("servidores.editar") && (
                      <>
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => setEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        {s.ativo ? (
                          <Button size="icon" variant="ghost" title="Inativar" onClick={() => setInativar(s)}><Ban className="h-4 w-4" /></Button>
                        ) : (
                          <Button size="icon" variant="ghost" title="Reativar" onClick={() => alternarAtivo(s, true)}><RotateCcw className="h-4 w-4" /></Button>
                        )}
                      </>
                    )}
                    {can("servidores.excluir") && <Button size="icon" variant="ghost" title="Excluir" onClick={() => setExcluir(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Vazio>Nenhum servidor encontrado.</Vazio>}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{rows.length} registro(s)</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={pag === 0} onClick={() => setPag(pag - 1)}>Anterior</Button>
          <span>Página {pag + 1} de {paginas}</span>
          <Button size="sm" variant="outline" disabled={pag + 1 >= paginas} onClick={() => setPag(pag + 1)}>Próxima</Button>
        </div>
      </div>

      <ServidorForm open={edit !== undefined} servidor={edit ?? null} onClose={() => setEdit(undefined)} refs={R} podeCpf={can("cpf.ver")} onSaved={() => inval("servidores")} />
      <Historico servidorId={hist} onClose={() => setHist(null)} />
      <Confirmar open={!!inativar} onOpenChange={(o) => !o && setInativar(null)} titulo="Inativar registro?" acao="Inativar" onConfirm={() => inativar && alternarAtivo(inativar, false)}>
        <b>{inativar?.nome}</b> deixará de constar como ativo. Os dados e o histórico serão preservados e o registro poderá ser reativado.
      </Confirmar>
      <Confirmar perigo open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)} titulo="Excluir definitivamente?" acao="Excluir" onConfirm={() => excluir && remover(excluir)}>
        Esta ação não pode ser desfeita. A exclusão de <b>{excluir?.nome}</b> ficará registrada na auditoria.
      </Confirmar>
    </>
  );
}
