import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, RefSelect } from "./kit";
import { cpfValido, somenteDigitos, type ServidorRow } from "@/lib/calc";
import type { Refs } from "@/lib/data";

const VAZIO = {
  nome: "", matricula: "", cpf: "", email: "", telefone: "", cargo_id: "", funcao_id: "", vinculo_id: "", situacao_id: "", unidade_id: "",
  secretaria_origem: "", municipio_exercicio: "", data_admissao: "", data_desligamento: "", carga_horaria: "", turno: "", ato_numero: "", ato_data: "", observacoes: "",
};
type F = typeof VAZIO;

export function ServidorForm({ open, onClose, servidor, refs, podeCpf, onSaved }: { open: boolean; onClose: () => void; servidor: ServidorRow | null; refs: Refs; podeCpf: boolean; onSaved: () => void }) {
  const [f, setF] = useState<F>(VAZIO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!servidor) { setF(VAZIO); return; }
    const base = Object.fromEntries(Object.keys(VAZIO).map((k) => [k, (servidor[k] as string | null) ?? ""])) as F;
    setF(base);
    if (podeCpf)
      supabase.from("servidores_sensiveis").select("cpf").eq("servidor_id", servidor.id).maybeSingle().then(({ data }) => data && setF((x) => ({ ...x, cpf: data.cpf })));
  }, [open, servidor, podeCpf]);

  const set = (k: keyof F) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const inp = (k: keyof F, type = "text") => <Input type={type} value={f[k]} onChange={(e) => set(k)(e.target.value)} />;

  async function salvar() {
    if (f.nome.trim().length < 3) return void toast.error("Informe o nome completo.");
    if (!f.matricula.trim()) return void toast.error("Informe a matrícula.");
    const cpf = somenteDigitos(f.cpf);
    if (podeCpf && cpf && !cpfValido(cpf)) return void toast.error("CPF inválido.");
    if (f.data_desligamento && f.data_admissao && f.data_desligamento < f.data_admissao) return void toast.error("A data de desligamento não pode ser anterior à admissão.");
    setSalvando(true);
    const { cpf: _c, ...resto } = f;
    const payload = Object.fromEntries(Object.entries(resto).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v]));
    const q = servidor
      ? supabase.from("servidores").update(payload as never).eq("id", servidor.id).select("id").single()
      : supabase.from("servidores").insert(payload as never).select("id").single();
    const { data, error } = await q;
    if (error) {
      setSalvando(false);
      return void toast.error(error.code === "23505" ? "Já existe um servidor com esta matrícula." : error.message);
    }
    if (podeCpf) {
      const r = cpf
        ? await supabase.from("servidores_sensiveis").upsert({ servidor_id: data.id, cpf })
        : await supabase.from("servidores_sensiveis").delete().eq("servidor_id", data.id);
      if (r.error) toast.error(r.error.code === "23505" ? "Este CPF já está vinculado a outro registro. Os demais dados foram salvos." : r.error.message);
    }
    setSalvando(false);
    toast.success("Cadastro salvo.");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{servidor ? "Editar servidor" : "Novo servidor"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo *" className="sm:col-span-2">{inp("nome")}</Field>
          <Field label="Matrícula *">{inp("matricula")}</Field>
          {podeCpf && <Field label="CPF">{inp("cpf")}</Field>}
          <Field label="E-mail">{inp("email", "email")}</Field>
          <Field label="Telefone">{inp("telefone")}</Field>
          <Field label="Cargo"><RefSelect refs={refs.cargos.list} value={f.cargo_id} onChange={set("cargo_id")} todos="—" /></Field>
          <Field label="Função"><RefSelect refs={refs.funcoes.list} value={f.funcao_id} onChange={set("funcao_id")} todos="—" /></Field>
          <Field label="Tipo de vínculo"><RefSelect refs={refs.vinculos.list} value={f.vinculo_id} onChange={set("vinculo_id")} todos="—" /></Field>
          <Field label="Situação funcional"><RefSelect refs={refs.situacoes.list} value={f.situacao_id} onChange={set("situacao_id")} todos="—" /></Field>
          <Field label="Unidade / lotação" className="sm:col-span-2"><RefSelect refs={refs.unidades.list} value={f.unidade_id} onChange={set("unidade_id")} todos="—" /></Field>
          <Field label="Secretaria / origem">{inp("secretaria_origem")}</Field>
          <Field label="Município / local de exercício">{inp("municipio_exercicio")}</Field>
          <Field label="Data de admissão">{inp("data_admissao", "date")}</Field>
          <Field label="Desligamento / exoneração / aposentadoria">{inp("data_desligamento", "date")}</Field>
          <Field label="Carga horária">{inp("carga_horaria")}</Field>
          <Field label="Turno">{inp("turno")}</Field>
          <Field label="Nº do ato administrativo">{inp("ato_numero")}</Field>
          <Field label="Data do ato">{inp("ato_data", "date")}</Field>
          <Field label="Observações administrativas" className="sm:col-span-2">
            <Textarea value={f.observacoes} onChange={(e) => set("observacoes")(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
