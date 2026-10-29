import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, NativeSelect, RefSelect } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { norm, validarArquivoPlanilha } from "@/lib/importar";
import { CAMPOS_VAGA, NUMS, chaveVaga, extrairVagas, planejarRemanejamento, sugerirMapVaga, type MapVaga } from "@/lib/vagasImport";
import type { Refs } from "@/lib/data";
import type { VagaRow } from "@/lib/vagas";
import type { ServidorRow } from "@/lib/calc";

type Props = { open: boolean; onOpenChange: (o: boolean) => void; R: Refs; vagas: VagaRow[]; onDone: () => void };

export function ImportarVagas({ open, onOpenChange, R, vagas, onDone }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [map, setMap] = useState<MapVaga>({});
  const [ano, setAno] = useState(new Date().getFullYear() + 1);
  const [salvando, setSalvando] = useState(false);

  async function abrir(f: File) {
    const e = validarArquivoPlanilha(f);
    if (e) return void toast.error(e);
    const X = await import("xlsx");
    const wb = X.read(await f.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    const matriz = X.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }).slice(0, 15);
    const cab = Math.max(0, matriz.findIndex((r) => r.some((c) => norm(c) === "cargo")));
    const linhas = X.utils.sheet_to_json<Record<string, unknown>>(ws, { range: cab, defval: null, raw: true });
    const c = Object.keys(linhas[0] ?? {});
    setRows(linhas); setCols(c); setMap(sugerirMapVaga(c));
    if (!c.some((x) => norm(x) === "cargo")) toast.warning("Coluna “Cargo” não encontrada. Relacione as colunas abaixo ou use o modelo.");
  }

  const idPorNome = (list: { id: string; nome: string }[]) => new Map(list.map((r) => [norm(r.nome), r.id]));
  const preview = useMemo(() => {
    const linhas = extrairVagas(rows, map, ano);
    const cargos = idPorNome(R.cargos.list), funcoes = idPorNome(R.funcoes.list), unidades = idPorNome(R.unidades.list);
    const exist = new Map(vagas.map((v) => [`${v.ano_referencia}|${v.cargo_id}|${v.funcao_id ?? ""}|${v.unidade_id ?? ""}`, v.id]));
    return linhas.map((l) => {
      const erros = [...l.erros];
      const cargo_id = l.cargo ? cargos.get(norm(l.cargo)) : undefined;
      if (l.cargo && !cargo_id) erros.push(`Cargo não cadastrado: ${l.cargo}`);
      const funcao_id = l.funcao ? funcoes.get(norm(l.funcao)) ?? null : null;
      if (l.funcao && !funcao_id) erros.push(`Função não cadastrada: ${l.funcao}`);
      const unidade_id = l.unidade ? unidades.get(norm(l.unidade)) ?? null : null;
      if (l.unidade && !unidade_id) erros.push(`Unidade não cadastrada: ${l.unidade}`);
      const existenteId = cargo_id ? exist.get(chaveVaga(l.ano, cargo_id, funcao_id, unidade_id)) : undefined;
      return { l, cargo_id, funcao_id, unidade_id, erros, existenteId };
    });
  }, [rows, map, ano, R, vagas]);
  const ok = preview.filter((p) => !p.erros.length);

  async function confirmar() {
    setSalvando(true);
    let feitos = 0;
    for (const p of ok) {
      const payload: Record<string, unknown> = { ano_referencia: p.l.ano, cargo_id: p.cargo_id, funcao_id: p.funcao_id, unidade_id: p.unidade_id };
      for (const k of NUMS) if (p.l.nums[k] != null || !p.existenteId) payload[k] = p.l.nums[k] ?? (k === "reservadas" ? 0 : null);
      if (p.l.justificativa) payload["justificativa"] = p.l.justificativa;
      const { error } = p.existenteId
        ? await supabase.from("vagas").update(payload as never).eq("id", p.existenteId)
        : await supabase.from("vagas").insert({ ...payload, status_validacao: "em_analise" } as never);
      if (error) { toast.error(`Linha ${p.l.linha}: ${error.message}`); break; }
      feitos++;
    }
    setSalvando(false);
    toast.success(`${feitos} linha(s) gravadas no quadro (em análise).`);
    setRows([]); onOpenChange(false); onDone();
  }

  const modelo = async () => {
    const X = await import("xlsx");
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([CAMPOS_VAGA.map((c) => c.label.replace(" *", ""))]), "Quadro");
    X.writeFile(wb, "modelo-quadro-de-vagas.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Importar quadro de vagas (Excel/CSV)</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Uma linha por cargo (e opcionalmente função e unidade). Cargos, funções e unidades precisam estar cadastrados com o mesmo nome. Linhas já existentes (mesmo ano, cargo, função e unidade) são atualizadas só nas colunas preenchidas. Tudo entra como “em análise”.</p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Arquivo"><Input type="file" accept=".xlsx,.csv" onChange={(e) => e.target.files?.[0] && abrir(e.target.files[0])} /></Field>
          <Field label="Ano (se a planilha não tiver)"><Input type="number" className="w-28" value={ano} onChange={(e) => setAno(Number(e.target.value))} /></Field>
          <Button variant="outline" onClick={modelo}>Baixar modelo</Button>
        </div>
        {cols.length > 0 && (
          <>
            <div className="grid gap-2 sm:grid-cols-3">
              {CAMPOS_VAGA.map((c) => (
                <Field key={c.key} label={c.label}>
                  <NativeSelect value={map[c.key] ?? ""} onChange={(e) => setMap({ ...map, [c.key]: e.target.value || undefined })}>
                    <option value="">— não importar —</option>{cols.map((x) => <option key={x}>{x}</option>)}
                  </NativeSelect>
                </Field>
              ))}
            </div>
            <p className="text-sm">Novas: <b>{ok.filter((p) => !p.existenteId).length}</b> · Atualizadas: <b>{ok.filter((p) => p.existenteId).length}</b> · Para correção: <b>{preview.length - ok.length}</b></p>
            <div className="max-h-64 overflow-auto rounded border text-xs">
              <table className="w-full">
                <thead className="bg-muted"><tr><th className="p-1">Linha</th><th className="p-1 text-left">Cargo</th><th className="p-1 text-left">Unidade</th><th className="p-1">Autoriz.</th><th className="p-1 text-left">Situação</th></tr></thead>
                <tbody>{preview.slice(0, 300).map((p) => (
                  <tr key={p.l.linha} className="border-t"><td className="p-1">{p.l.linha}</td><td className="p-1">{p.l.cargo}</td><td className="p-1">{p.l.unidade ?? "Rede"}</td><td className="p-1 text-center">{p.l.nums.autorizadas ?? "—"}</td>
                    <td className={p.erros.length ? "p-1 text-destructive" : "p-1"}>{p.erros.length ? p.erros.join("; ") : p.existenteId ? "Atualizar" : "Nova"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!ok.length || salvando} onClick={confirmar}>{salvando ? "Gravando…" : `Confirmar ${ok.length} linha(s)`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Remanejar({ open, onOpenChange, R, vagas, servidores, onDone }: Props & { servidores: ServidorRow[] }) {
  const [busca, setBusca] = useState("");
  const [sid, setSid] = useState("");
  const [destino, setDestino] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [salvando, setSalvando] = useState(false);
  const s = servidores.find((x) => x.id === sid);
  const achados = busca.length < 2 ? [] : servidores.filter((x) => x.ativo && (norm(x.nome).includes(norm(busca)) || x.matricula.includes(busca))).slice(0, 30);
  const nome = (m: Map<string, { nome: string }>, id: string | null) => (id ? m.get(id)?.nome ?? "—" : "—");
  const plano = s && destino && destino !== s.unidade_id
    ? planejarRemanejamento(s, destino, ano, vagas, servidores, R.vinculos.map, R.situacoes.map, { servidor: `${s.nome} (mat. ${s.matricula})`, destino: nome(R.unidades.map, destino), data: new Date().toLocaleDateString("pt-BR") })
    : null;

  async function confirmar() {
    if (!s || !plano) return;
    setSalvando(true);
    const { error } = await supabase.from("servidores").update({ unidade_id: destino } as never).eq("id", s.id);
    if (!error && plano.criarOrigem) {
      const r = await supabase.from("vagas").insert(plano.criarOrigem as never);
      if (r.error) toast.error(`Servidor remanejado, mas a vaga na origem não foi aberta: ${r.error.message}`);
    }
    setSalvando(false);
    if (error) return void toast.error(error.message);
    toast.success("Servidor remanejado e vaga aberta na lotação de origem (em análise).");
    setSid(""); setDestino(""); setBusca(""); onOpenChange(false); onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Remanejar servidor para preencher vaga</DialogTitle></DialogHeader>
        <Field label="Buscar servidor (nome ou matrícula)"><Input value={busca} onChange={(e) => { setBusca(e.target.value); setSid(""); }} /></Field>
        {!s && achados.length > 0 && (
          <div className="max-h-48 overflow-auto rounded border text-sm">
            {achados.map((x) => <button key={x.id} className="block w-full border-b p-2 text-left hover:bg-muted" onClick={() => setSid(x.id)}>{x.nome} · mat. {x.matricula} · {nome(R.unidades.map, x.unidade_id)}</button>)}
          </div>
        )}
        {s && (
          <div className="space-y-3 text-sm">
            <p><b>{s.nome}</b> — {nome(R.cargos.map, s.cargo_id)} / {nome(R.funcoes.map, s.funcao_id)}<br />Lotação atual (A): <b>{nome(R.unidades.map, s.unidade_id)}</b></p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nova lotação (B)" className="sm:col-span-2"><RefSelect refs={R.unidades.list.filter((u) => u.id !== s.unidade_id)} value={destino} onChange={setDestino} todos="—" /></Field>
              <Field label="Ano do quadro"><Input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} /></Field>
            </div>
            {plano && (
              <div className="rounded border bg-muted/40 p-3">
                <p className="font-medium">O que vai acontecer:</p>
                <ul className="ml-4 list-disc">
                  <li>Lotação do servidor muda para {nome(R.unidades.map, destino)}.</li>
                  {plano.destinoExistente ? <li>A vaga do quadro em B passa a contar este servidor como ocupante.</li> : <li>B não tem linha no quadro para este cargo em {ano}; nenhuma vaga é preenchida no quadro.</li>}
                  {plano.origemExistente && <li>A linha do quadro em A é recalculada e abre 1 vaga (em análise).</li>}
                  {plano.criarOrigem && <li>Será criada uma linha no quadro em A com {plano.criarOrigem.autorizadas} autorizada(s), deixando 1 vaga aberta, marcada “em análise”.</li>}
                  {plano.avisos.map((a) => <li key={a} className="text-destructive">{a}</li>)}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">A vaga aberta só vira “confirmada” após validação da equipe. A mudança fica registrada na auditoria e no histórico do servidor.</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!plano || salvando} onClick={confirmar}>{salvando ? "Gravando…" : "Confirmar remanejamento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
