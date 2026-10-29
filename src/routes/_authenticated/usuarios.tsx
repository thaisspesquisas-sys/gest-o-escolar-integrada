import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { Field, NativeSelect, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAPEL_LABEL, PERMISSOES, usePerms } from "@/lib/data";
import { alterarPapel, criarUsuario, redefinirSenha } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e permissões — Gestão de Servidores" }, { name: "description", content: "Contas, perfis e permissões de acesso." }] }),
  component: Usuarios,
});

const PAPEIS = Object.keys(PAPEL_LABEL) as (keyof typeof PAPEL_LABEL)[];

function Usuarios() {
  const { can, isAdmin, data: me } = usePerms();
  const criar = useServerFn(criarUsuario);
  const mudar = useServerFn(alterarPapel);
  const senha = useServerFn(redefinirSenha);
  const users = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([supabase.from("profiles").select("*").order("nome"), supabase.from("user_roles").select("user_id,role")]);
      return (p ?? []).map((u) => ({ ...u, papel: r?.find((x) => x.user_id === u.id)?.role ?? "" }));
    },
  });
  const perms = useQuery({ queryKey: ["role_permissions"], queryFn: async () => (await supabase.from("role_permissions").select("*")).data ?? [] });
  const [novo, setNovo] = useState<{ nome: string; email: string; senha: string; papel: string } | null>(null);
  const [reset, setReset] = useState<{ id: string; senha: string } | null>(null);

  if (!can("usuarios.gerenciar")) return <SemPermissao />;

  async function salvarNovo() {
    try {
      await criar({ data: novo as never });
      toast.success("Usuário criado. Informe a senha inicial à pessoa por canal seguro.");
      setNovo(null);
      users.refetch();
    } catch (e) {
      toast.error((e as Error).message.includes("already") ? "Já existe conta com este e-mail." : (e as Error).message);
    }
  }
  async function trocarPapel(userId: string, papel: string) {
    try { await mudar({ data: { userId, papel: papel as never } }); toast.success("Perfil alterado."); users.refetch(); } catch (e) { toast.error((e as Error).message); }
  }
  async function ativo(id: string, v: boolean) {
    if (id === me?.user?.id) return void toast.error("Você não pode desativar a própria conta.");
    const { error } = await supabase.from("profiles").update({ ativo: v }).eq("id", id);
    if (error) return void toast.error(error.message);
    users.refetch();
  }
  async function togglePerm(role: string, permissao: string, on: boolean) {
    const { error } = on
      ? await supabase.from("role_permissions").insert({ role: role as never, permissao })
      : await supabase.from("role_permissions").delete().eq("role", role as never).eq("permissao", permissao);
    if (error) return void toast.error(error.message);
    perms.refetch();
  }

  return (
    <>
      <PageHeader
        title="Usuários e permissões"
        description="Somente o administrador cria contas. Cada perfil recebe permissões configuráveis; as regras são aplicadas também no banco de dados."
        actions={<Button onClick={() => setNovo({ nome: "", email: "", senha: "", papel: "consulta" })}><Plus className="mr-2 h-4 w-4" />Novo usuário</Button>}
      />
      <Panel title="Contas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Nome</th><th className="p-2">E-mail</th><th className="p-2">Perfil</th><th className="p-2">Ativo</th><th /></tr></thead>
            <tbody>
              {users.data?.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2 font-medium">{u.nome}</td><td className="p-2">{u.email}</td>
                  <td className="p-2"><NativeSelect value={u.papel} onChange={(e) => trocarPapel(u.id, e.target.value)}><option value="" disabled>Sem perfil</option>{PAPEIS.map((p) => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}</NativeSelect></td>
                  <td className="p-2"><Switch checked={u.ativo} onCheckedChange={(v) => ativo(u.id, v)} /></td>
                  <td className="p-2 text-right"><Button size="sm" variant="ghost" onClick={() => setReset({ id: u.id, senha: "" })}><KeyRound className="mr-1 h-4 w-4" />Redefinir senha</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Permissões por perfil" className="mt-4">
        <p className="mb-3 text-xs text-muted-foreground">O administrador do sistema possui todas as permissões. {isAdmin ? "" : "Somente o administrador pode alterar esta matriz."}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="p-2 text-left">Permissão</th>{PAPEIS.filter((p) => p !== "admin").map((p) => <th key={p} className="p-2 text-center text-xs">{PAPEL_LABEL[p]}</th>)}</tr></thead>
            <tbody>
              {PERMISSOES.map((pm) => (
                <tr key={pm.key} className="border-t">
                  <td className="p-2">{pm.label}</td>
                  {PAPEIS.filter((p) => p !== "admin").map((p) => {
                    const on = !!perms.data?.some((x) => x.role === p && x.permissao === pm.key);
                    return <td key={p} className="p-2 text-center"><Checkbox disabled={!isAdmin} checked={on} onCheckedChange={(v) => togglePerm(p, pm.key, !!v)} /></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Dialog open={!!novo} onOpenChange={(o) => !o && setNovo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
          {novo && (
            <div className="space-y-3">
              <Field label="Nome completo"><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></Field>
              <Field label="E-mail"><Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></Field>
              <Field label="Senha inicial (mín. 8 caracteres)"><Input type="password" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} /></Field>
              <Field label="Perfil"><NativeSelect value={novo.papel} onChange={(e) => setNovo({ ...novo, papel: e.target.value })}>{PAPEIS.map((p) => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}</NativeSelect></Field>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setNovo(null)}>Cancelar</Button><Button onClick={salvarNovo}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!reset} onOpenChange={(o) => !o && setReset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redefinir senha</DialogTitle></DialogHeader>
          <Field label="Nova senha (mín. 8 caracteres)"><Input type="password" value={reset?.senha ?? ""} onChange={(e) => reset && setReset({ ...reset, senha: e.target.value })} /></Field>
          <DialogFooter>
            <Button onClick={async () => { try { await senha({ data: { userId: reset!.id, senha: reset!.senha } }); toast.success("Senha redefinida."); setReset(null); } catch (e) { toast.error((e as Error).message); } }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
