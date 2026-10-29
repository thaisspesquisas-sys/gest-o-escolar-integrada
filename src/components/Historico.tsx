import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Vazio } from "./kit";

const IGNORAR = new Set(["updated_at", "updated_by", "created_at", "created_by", "id"]);
const ACAO: Record<string, string> = { INSERT: "Cadastro", UPDATE: "Alteração", DELETE: "Exclusão", INATIVACAO: "Inativação" };

export function diff(a: Record<string, unknown> | null, d: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(d ?? {})]);
  return [...keys].filter((k) => !IGNORAR.has(k) && JSON.stringify(a?.[k] ?? null) !== JSON.stringify(d?.[k] ?? null)).map((k) => ({ k, de: a?.[k], para: d?.[k] }));
}

export function Historico({ servidorId, onClose }: { servidorId: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["historico", servidorId],
    enabled: !!servidorId,
    queryFn: async () => (await supabase.from("auditoria").select("*").eq("registro_id", servidorId!).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <Dialog open={!!servidorId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Histórico de alterações</DialogTitle></DialogHeader>
        {q.data?.length === 0 && <Vazio>Nenhum registro de alteração visível para o seu perfil.</Vazio>}
        <ol className="space-y-3">
          {q.data?.map((h) => (
            <li key={h.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold">{ACAO[h.acao] ?? h.acao}{h.tabela === "servidores_sensiveis" ? " (dados sensíveis)" : ""}</span>
                <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")} · {h.usuario_email ?? "sistema"}</span>
              </div>
              {h.acao === "UPDATE" || h.acao === "INATIVACAO" ? (
                <ul className="mt-2 space-y-0.5 text-xs">
                  {diff(h.antes as Record<string, unknown>, h.depois as Record<string, unknown>).map((c) => (
                    <li key={c.k}><b>{c.k}</b>: {String(c.de ?? "—")} → {String(c.para ?? "—")}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
