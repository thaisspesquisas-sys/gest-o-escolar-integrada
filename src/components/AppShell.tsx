import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Users, FileSpreadsheet, School, Tags, Layers, Briefcase, FileText, ShieldCheck, History, Settings, LogOut, Menu, Landmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { configQuery, PAPEL_LABEL, usePerms } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITENS = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/servidores", label: "Servidores", icon: Users, perm: "servidores.ver" },
  { to: "/situacoes", label: "Por situação funcional", icon: Layers, perm: "servidores.ver" },
  { to: "/importar", label: "Importar planilha", icon: FileSpreadsheet, perm: "servidores.importar" },
  { to: "/unidades", label: "Unidades e turmas", icon: School },
  { to: "/cadastros", label: "Cargos e categorias", icon: Tags },
  { to: "/vagas", label: "Quadro de vagas", icon: Briefcase },
  { to: "/relatorios", label: "Relatórios", icon: FileText, perm: "relatorios.ver" },
  { to: "/usuarios", label: "Usuários e permissões", icon: ShieldCheck, perm: "usuarios.gerenciar" },
  { to: "/auditoria", label: "Auditoria", icon: History, perm: "auditoria.ver" },
  { to: "/configuracoes", label: "Identidade visual", icon: Settings, perm: "admin" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data, can } = usePerms();
  const { data: cfg } = useQuery(configQuery);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const semPerfil = data && data.user && !data.papel;

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          {cfg?.brasao_url ? (
            <img src={cfg.brasao_url} alt="Brasão do município" className="h-10 w-10 object-contain" />
          ) : (
            <Landmark className="h-9 w-9 text-sidebar-primary" />
          )}
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-wider text-sidebar-foreground/60">{cfg?.municipio}</p>
            <p className="font-serif text-sm font-bold leading-tight">Gestão de Servidores</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {ITENS.filter((i) => !("perm" in i) || can(i.perm)).map((i) => (
            <Link
              key={i.to}
              to={i.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-sidebar-primary font-semibold" }}
            >
              <i.icon className="h-4 w-4" />
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <p className="truncate text-sm font-semibold">{data?.nome}</p>
          <p className="text-xs text-sidebar-foreground/60">{data?.papel ? PAPEL_LABEL[data.papel] : "Sem perfil"}</p>
          <Button variant="ghost" size="sm" onClick={sair} className="mt-2 w-full justify-start px-0 text-sidebar-foreground/80 hover:bg-transparent hover:text-sidebar-primary">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      {open && <div className="no-print fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-serif font-bold">Gestão de Servidores</span>
        </header>
        <main className="flex-1 p-4 md:p-8">
          {semPerfil ? (
            <div className="mx-auto max-w-md rounded-lg border bg-card p-8 text-center">
              <h1 className="text-xl font-bold">Acesso pendente</h1>
              <p className="mt-2 text-sm text-muted-foreground">Sua conta ainda não possui perfil de acesso. Procure o administrador do sistema.</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SemPermissao() {
  return <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">Você não tem permissão para acessar esta área.</div>;
}
