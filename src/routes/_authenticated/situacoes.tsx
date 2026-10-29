import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { Panel, Vazio } from "@/components/kit";
import { fmtData, usePerms, useRefs, useServidores } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/situacoes")({
  head: () => ({ meta: [{ title: "Situação funcional — Gestão de Servidores" }, { name: "description", content: "Servidores organizados por vínculo e situação." }] }),
  component: Situacoes,
});

function Situacoes() {
  const { can } = usePerms();
  const refs = useRefs();
  const serv = useServidores();
  const [sel, setSel] = useState<{ tipo: "v" | "s"; id: string } | null>(null);

  const grupos = useMemo(() => {
    if (!refs.data || !serv.data) return null;
    const ativos = serv.data;
    const v = refs.data.vinculos.list.map((x) => ({ tipo: "v" as const, ...x, total: ativos.filter((s) => s.vinculo_id === x.id).length }));
    const s = refs.data.situacoes.list.map((x) => ({ tipo: "s" as const, ...x, total: ativos.filter((r) => r.situacao_id === x.id).length }));
    return { v, s };
  }, [refs.data, serv.data]);

  if (!can("servidores.ver")) return <SemPermissao />;
  if (!grupos || !refs.data || !serv.data) return <p className="text-muted-foreground">Carregando…</p>;
  const R = refs.data;
  const lista = sel ? serv.data.filter((s) => (sel.tipo === "v" ? s.vinculo_id : s.situacao_id) === sel.id) : [];
  const titulo = sel ? (sel.tipo === "v" ? R.vinculos.map : R.situacoes.map).get(sel.id)?.nome : "";

  const Grupo = ({ titulo, itens }: { titulo: string; itens: typeof grupos.v | typeof grupos.s }) => (
    <Panel title={titulo}>
      <div className="grid gap-2 sm:grid-cols-2">
        {itens.map((i) => (
          <button
            key={i.id}
            onClick={() => setSel({ tipo: i.tipo, id: i.id })}
            className={cn("flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:border-primary", sel?.id === i.id && "border-primary bg-secondary")}
          >
            <span>{i.nome}</span>
            <span className="font-serif text-lg font-bold tabular-nums">{i.total}</span>
          </button>
        ))}
      </div>
    </Panel>
  );

  return (
    <>
      <PageHeader
        title="Organização por situação funcional"
        description="Tipo de vínculo (como a pessoa ingressou) e situação funcional (onde e como está) são classificações separadas, para evitar somas incorretas. As categorias podem ser ajustadas em “Cargos e categorias”."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Por tipo de vínculo" itens={grupos.v} />
        <Grupo titulo="Por situação funcional" itens={grupos.s} />
      </div>
      {sel && (
        <Panel className="mt-4" title={`${titulo} — ${lista.length} registro(s)`} actions={<Link to="/relatorios" className="text-sm text-primary underline">Emitir relatório</Link>}>
          {lista.length === 0 ? <Vazio>Nenhum servidor nesta categoria.</Vazio> : (
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Matrícula</th><th className="p-2">Nome</th><th className="p-2">Cargo</th><th className="p-2">Lotação</th><th className="p-2">Admissão</th></tr></thead>
                <tbody>
                  {lista.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 font-mono text-xs">{s.matricula}</td><td className="p-2">{s.nome}</td>
                      <td className="p-2">{s.cargo_id ? R.cargos.map.get(s.cargo_id)?.nome : "—"}</td>
                      <td className="p-2">{s.unidade_id ? R.unidades.map.get(s.unidade_id)?.nome : "—"}</td>
                      <td className="p-2">{fmtData(s.data_admissao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </>
  );
}
