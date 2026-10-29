import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Landmark, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarPrimeiroAdmin } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Gestão de Servidores da Educação" },
      { name: "description", content: "Acesso restrito a usuários autorizados da Secretaria Municipal de Educação." },
      { property: "og:title", content: "Entrar — Gestão de Servidores da Educação" },
      { property: "og:description", content: "Acesso restrito a usuários autorizados." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [semAdmin, setSemAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ nome: "", email: "", senha: "" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => data.user && navigate({ to: "/painel", replace: true }));
    supabase.rpc("existe_admin").then(({ data }) => setSemAdmin(data === false));
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.senha });
    setLoading(false);
    if (error) return toast.error("E-mail ou senha incorretos.");
    navigate({ to: "/painel", replace: true });
  }

  async function configurar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await criarPrimeiroAdmin({ data: { nome: f.nome, email: f.email.trim(), senha: f.senha } });
      toast.success("Administrador criado. Entrando…");
      await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.senha });
      navigate({ to: "/painel", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <Landmark className="h-8 w-8 text-sidebar-primary" />
          <span className="text-sm uppercase tracking-widest">Secretaria Municipal de Educação</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Gestão Inteligente de Servidores da Educação</h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/75">
            Cadastro funcional, indicadores da rede, quadro de vagas e relatórios oficiais em um só lugar.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">Acesso restrito. Tratamento de dados conforme a LGPD (Lei nº 13.709/2018).</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={semAdmin ? configurar : entrar} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-bold">{semAdmin ? "Configuração inicial" : "Entrar"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {semAdmin
                ? "Crie a conta do administrador do sistema. Depois, só ele poderá cadastrar outros usuários."
                : "Use o e-mail e a senha fornecidos pelo administrador."}
            </p>
          </div>
          {semAdmin && (
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" required minLength={3} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" required minLength={semAdmin ? 8 : 1} value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || semAdmin === null}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {semAdmin ? "Criar administrador" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
