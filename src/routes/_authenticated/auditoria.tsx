import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { NativeSelect, Panel, Vazio } from "@/components/kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { diff } from "@/components/Historico";
import { usePerms } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({ meta: [{ title: "Auditoria — Gestão de Servidores" }, { name: "description", content: "Registro de operações e importações." }] }),
  component: Auditoria,
});

const TABELAS: Record<string, string> = { servidores: "Servidores", servidores_sensiveis: "Dados sensíveis", unidades: "Unidades", turmas: "Turmas", cargos: "Cargos", funcoes: "Funções", vinculos: "Vínculos", situacoes: "Situações", vagas: "Vagas", role_permissions: "Permissões", user_roles: "Perfis de usuário", configuracoes: "Configurações" };
const ACAO: Record<string, string> = { INSERT: "Inclusão", UPDATE: "Alteração", DELETE: "Exclusão", INATIVACAO: "Inativação" };

function Auditoria() {
  const { can } = usePerms();
  const [tabela, setTabela] = useState("");
  const log = useQuery({
    queryKey: ["auditoria", tabela],
    queryFn: async () => {
      let q = supabase.from("auditoria").select("*").order("created_at", { ascending: false }).limit(300);
      if (tabela) q = q.eq("tabela", tabela);
      return (await q).data ?? [];
    },
  });
  const imps = useQuery({ queryKey: ["importacoes"], queryFn: async () => (await supabase.from("importacoes").select("id,arquivo_nome,aba,usuario_email,novos,atualizados,ignorados,para_correcao,pendencias,created_at").order("created_at", { ascending: false })).data ?? [] });
  if (!can("auditoria.ver")) return <SemPermissao />;
  return (
    <>
      <PageHeader title="Auditoria" description="Toda inclusão, alteração, inativação e exclusão é registrada automaticamente pelo banco de dados, com usuário, data e hora. CPFs aparecem mascarados." />
      <Tabs defaultValue="ops">
        <TabsList><TabsTrigger value="ops">Operações</TabsTrigger><TabsTrigger value="imp">Importações</TabsTrigger></TabsList>
        <TabsContent value="ops">
          <Panel actions={<NativeSelect className="w-56" value={tabela} onChange={(e) => setTabela(e.target.value)}><option value="">Todas as áreas</option>{Object.entries(TABELAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</NativeSelect>} title="Últimas 300 operações">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left uppercase text-muted-foreground"><tr><th className="p-2">Data/hora</th><th className="p-2">Área</th><th className="p-2">Operação</th><th className="p-2">Registro</th><th className="p-2">Alterações</th><th className="p-2">Usuário</th></tr></thead>
                <tbody>
                  {log.data?.map((h) => {
                    const d = (h.depois ?? h.antes) as Record<string, unknown> | null;
                    return (
                      <tr key={h.id} className="border-t align-top">
                        <td className="p-2 whitespace-nowrap">{new Date(h.created_at).toLocaleString("pt-BR")}</td>
                        <td className="p-2">{TABELAS[h.tabela] ?? h.tabela}</td><td className="p-2">{ACAO[h.acao] ?? h.acao}</td>
                        <td className="p-2">{String(d?.nome ?? d?.matricula ?? d?.permissao ?? h.registro_id ?? "")}</td>
                        <td className="p-2">{h.acao === "UPDATE" || h.acao === "INATIVACAO" ? diff(h.antes as Record<string, unknown>, h.depois as Record<string, unknown>).map((c) => c.k).join(", ") : ""}</td>
                        <td className="p-2">{h.usuario_email ?? "sistema"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {log.data?.length === 0 && <Vazio>Nenhuma operação registrada.</Vazio>}
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="imp">
          <Panel title="Histórico de importações">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Data</th><th className="p-2">Arquivo / aba</th><th className="p-2">Usuário</th><th className="p-2 text-right">Novos</th><th className="p-2 text-right">Atualiz.</th><th className="p-2 text-right">Ignorados</th><th className="p-2 text-right">Correção</th></tr></thead>
              <tbody>
                {imps.data?.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2">{new Date(i.created_at).toLocaleString("pt-BR")}</td><td className="p-2">{i.arquivo_nome}<div className="text-xs text-muted-foreground">{i.aba}</div></td><td className="p-2">{i.usuario_email}</td>
                    <td className="p-2 text-right">{i.novos}</td><td className="p-2 text-right">{i.atualizados}</td><td className="p-2 text-right">{i.ignorados}</td><td className="p-2 text-right">{i.para_correcao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {imps.data?.length === 0 && <Vazio>Nenhuma importação realizada.</Vazio>}
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
