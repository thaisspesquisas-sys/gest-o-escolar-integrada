import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAPEIS = ["admin", "secretario", "subsecretario", "rh", "administrativo", "consulta"] as const;

const novoUsuario = z.object({
  nome: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(8).max(72),
});

/** Cria o primeiro administrador. Só funciona enquanto não existe nenhum administrador. */
export const criarPrimeiroAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => novoUsuario.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("O administrador inicial já foi configurado.");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.senha, email_confirm: true });
    if (error || !u.user) throw new Error(error?.message ?? "Falha ao criar usuário");
    await supabaseAdmin.from("profiles").insert({ id: u.user.id, nome: data.nome, email: data.email });
    await supabaseAdmin.from("user_roles").insert({ user_id: u.user.id, role: "admin" });
    return { ok: true };
  });

async function exigirGestor(supabase: { rpc: (fn: "has_perm", a: { _perm: string }) => PromiseLike<{ data: boolean | null }> }) {
  const { data } = await supabase.rpc("has_perm", { _perm: "usuarios.gerenciar" });
  if (!data) throw new Error("Sem permissão para gerenciar usuários.");
}

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => novoUsuario.extend({ papel: z.enum(PAPEIS) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirGestor(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.senha, email_confirm: true });
    if (error || !u.user) throw new Error(error?.message ?? "Falha ao criar usuário");
    await supabaseAdmin.from("profiles").insert({ id: u.user.id, nome: data.nome, email: data.email });
    await supabaseAdmin.from("user_roles").insert({ user_id: u.user.id, role: data.papel });
    return { ok: true };
  });

export const alterarPapel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), papel: z.enum(PAPEIS) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirGestor(context.supabase);
    if (data.userId === context.userId && data.papel !== "admin") throw new Error("Você não pode remover o próprio perfil de administrador.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.papel });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const redefinirSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), senha: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirGestor(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.senha });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
