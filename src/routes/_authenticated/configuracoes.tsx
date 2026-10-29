import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, SemPermissao } from "@/components/AppShell";
import { Field, Panel } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { configQuery, usePerms } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Identidade visual — Gestão de Servidores" }, { name: "description", content: "Brasão, logomarca e nomes institucionais." }] }),
  component: Config,
});

function lerImagem(file: File): Promise<string> {
  return new Promise((ok, err) => {
    if (!/^image\/(png|jpeg)$/.test(file.type)) return err(new Error("Use PNG ou JPG."));
    if (file.size > 400 * 1024) return err(new Error("Imagem muito grande (máx. 400 KB)."));
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => err(new Error("Falha ao ler a imagem."));
    r.readAsDataURL(file);
  });
}

function Config() {
  const { isAdmin } = usePerms();
  const cfg = useQuery(configQuery);
  const qc = useQueryClient();
  const [f, setF] = useState({ municipio: "", secretaria: "", brasao_url: null as string | null, logo_url: null as string | null });
  useEffect(() => { if (cfg.data) setF({ municipio: cfg.data.municipio, secretaria: cfg.data.secretaria, brasao_url: cfg.data.brasao_url, logo_url: cfg.data.logo_url }); }, [cfg.data]);
  if (!isAdmin) return <SemPermissao />;

  async function salvar() {
    const { error } = await supabase.from("configuracoes").update({ ...f, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return void toast.error(error.message);
    toast.success("Identidade visual atualizada.");
    qc.invalidateQueries({ queryKey: ["config"] });
  }
  const img = (k: "brasao_url" | "logo_url") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await lerImagem(file); setF((x) => ({ ...x, [k]: url })); } catch (er) { toast.error((er as Error).message); }
  };

  return (
    <>
      <PageHeader title="Identidade visual" description="Nomes e imagens exibidos no menu e no cabeçalho dos relatórios." />
      <Panel className="max-w-2xl">
        <div className="space-y-4">
          <Field label="Nome do município (ex.: Prefeitura Municipal de …)"><Input value={f.municipio} onChange={(e) => setF({ ...f, municipio: e.target.value })} /></Field>
          <Field label="Nome da Secretaria"><Input value={f.secretaria} onChange={(e) => setF({ ...f, secretaria: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["brasao_url", "logo_url"] as const).map((k) => (
              <div key={k} className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{k === "brasao_url" ? "Brasão do município" : "Logomarca da Secretaria"}</p>
                {f[k] ? <img src={f[k]!} alt="" className="mb-2 h-20 object-contain" /> : <p className="mb-2 text-xs text-muted-foreground">Nenhuma imagem.</p>}
                <input type="file" accept="image/png,image/jpeg" onChange={img(k)} className="text-xs" />
                {f[k] && <Button size="sm" variant="ghost" onClick={() => setF({ ...f, [k]: null })}>Remover</Button>}
              </div>
            ))}
          </div>
          <Button onClick={salvar}>Salvar</Button>
        </div>
      </Panel>
    </>
  );
}
