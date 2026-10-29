import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Ref, ServidorRow } from "./calc";

/** Busca todas as linhas, contornando o limite de 1000 por requisição. */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const refsQuery = queryOptions({
  queryKey: ["refs"],
  queryFn: async () => {
    const [c, f, v, s, u] = await Promise.all([
      supabase.from("cargos").select("id,nome").order("nome"),
      supabase.from("funcoes").select("id,nome").order("nome"),
      supabase.from("vinculos").select("id,nome,categoria").order("nome"),
      supabase.from("situacoes").select("id,nome,categoria,em_exercicio").order("nome"),
      supabase.from("unidades").select("id,nome,localidade,codigo").order("nome"),
    ]);
    const err = [c, f, v, s, u].find((r) => r.error)?.error;
    if (err) throw new Error(err.message);
    const mk = (rows: Ref[] | null) => ({ list: rows ?? [], map: new Map((rows ?? []).map((r) => [r.id, r])) });
    return { cargos: mk(c.data), funcoes: mk(f.data), vinculos: mk(v.data), situacoes: mk(s.data), unidades: mk(u.data as Ref[]) };
  },
});
export type Refs = Awaited<ReturnType<typeof refsQuery.queryFn & object>>;

export const servidoresQuery = queryOptions({
  queryKey: ["servidores"],
  queryFn: () =>
    fetchAll<ServidorRow>((a, b) =>
      supabase.from("servidores").select("*").order("nome").range(a, b) as unknown as PromiseLike<{ data: ServidorRow[] | null; error: { message: string } | null }>,
    ),
});

export function useRefs() {
  return useQuery(refsQuery);
}
export function useServidores() {
  return useQuery(servidoresQuery);
}
export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export const permsQuery = queryOptions({
  queryKey: ["perms"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { user: null, perms: new Set<string>(), papel: null as string | null, nome: "" };
    const [{ data: perms }, { data: roles }, { data: prof }] = await Promise.all([
      supabase.rpc("my_permissions"),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      supabase.from("profiles").select("nome").eq("id", u.user.id).maybeSingle(),
    ]);
    return { user: u.user, perms: new Set<string>(perms ?? []), papel: roles?.[0]?.role ?? null, nome: prof?.nome ?? u.user.email ?? "" };
  },
});

export function usePerms() {
  const q = useQuery(permsQuery);
  const p = q.data?.perms ?? new Set<string>();
  const can = (perm: string) => p.has("admin") || p.has(perm);
  return { ...q, can, isAdmin: p.has("admin") };
}

export const configQuery = queryOptions({
  queryKey: ["config"],
  queryFn: async () => {
    const { data } = await supabase.from("configuracoes").select("*").eq("id", 1).maybeSingle();
    return data ?? { municipio: "Prefeitura Municipal", secretaria: "Secretaria Municipal de Educação", brasao_url: null, logo_url: null };
  },
});

export const PAPEL_LABEL: Record<string, string> = {
  admin: "Administrador do sistema",
  secretario: "Secretário(a) de Educação",
  subsecretario: "Subsecretário(a)",
  rh: "Recursos Humanos",
  administrativo: "Equipe administrativa",
  consulta: "Consulta",
};

export const PERMISSOES: { key: string; label: string }[] = [
  { key: "servidores.ver", label: "Consultar servidores" },
  { key: "servidores.editar", label: "Cadastrar e editar servidores" },
  { key: "servidores.excluir", label: "Excluir servidores definitivamente" },
  { key: "servidores.importar", label: "Importar planilhas" },
  { key: "cpf.ver", label: "Ver e editar CPF" },
  { key: "cadastros.editar", label: "Editar unidades, turmas, cargos e categorias" },
  { key: "vagas.editar", label: "Editar quadro de vagas" },
  { key: "relatorios.ver", label: "Emitir relatórios" },
  { key: "auditoria.ver", label: "Ver auditoria e importações" },
  { key: "usuarios.gerenciar", label: "Gerenciar usuários" },
];

export const fmtData = (d: string | null | undefined) => (d ? new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR") : "—");
