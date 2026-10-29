import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, RefSelect } from "./kit";
import type { Refs } from "@/lib/data";
import type { ServidorRow } from "@/lib/calc";

export type FiltroState = { busca: string; ano: string; unidade: string; cargo: string; funcao: string; vinculo: string; situacao: string; status: "ativos" | "inativos" | "todos" };
export const FILTRO_INICIAL: FiltroState = { busca: "", ano: "", unidade: "", cargo: "", funcao: "", vinculo: "", situacao: "", status: "ativos" };

export function aplicarFiltros(rows: ServidorRow[], f: FiltroState) {
  const q = f.busca.trim().toLowerCase();
  return rows.filter(
    (s) =>
      (f.status === "todos" || (f.status === "ativos" ? s.ativo : !s.ativo)) &&
      (!f.unidade || s.unidade_id === f.unidade) &&
      (!f.cargo || s.cargo_id === f.cargo) &&
      (!f.funcao || s.funcao_id === f.funcao) &&
      (!f.vinculo || s.vinculo_id === f.vinculo) &&
      (!f.situacao || s.situacao_id === f.situacao) &&
      (!f.ano || (s.data_admissao ?? "").startsWith(f.ano)) &&
      (!q || s.nome.toLowerCase().includes(q) || s.matricula.toLowerCase().includes(q)),
  );
}

export function descreverFiltros(f: FiltroState, refs: Refs) {
  const p: string[] = [];
  if (f.busca) p.push(`Busca: "${f.busca}"`);
  if (f.ano) p.push(`Ano de admissão: ${f.ano}`);
  if (f.unidade) p.push(`Unidade: ${refs.unidades.map.get(f.unidade)?.nome}`);
  if (f.cargo) p.push(`Cargo: ${refs.cargos.map.get(f.cargo)?.nome}`);
  if (f.funcao) p.push(`Função: ${refs.funcoes.map.get(f.funcao)?.nome}`);
  if (f.vinculo) p.push(`Vínculo: ${refs.vinculos.map.get(f.vinculo)?.nome}`);
  if (f.situacao) p.push(`Situação: ${refs.situacoes.map.get(f.situacao)?.nome}`);
  p.push(f.status === "ativos" ? "Somente registros ativos" : f.status === "inativos" ? "Somente inativados" : "Ativos e inativados");
  return p.join("; ");
}

export function Filtros({ f, setF, refs, rows, busca = true }: { f: FiltroState; setF: (f: FiltroState) => void; refs: Refs; rows: ServidorRow[]; busca?: boolean }) {
  const anos = useMemo(
    () => [...new Set(rows.map((r) => r.data_admissao?.slice(0, 4)).filter(Boolean) as string[])].sort().reverse(),
    [rows],
  );
  const set = (k: keyof FiltroState) => (v: string) => setF({ ...f, [k]: v });
  return (
    <div className="no-print grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {busca && (
        <Field label="Pesquisar" className="sm:col-span-2">
          <Input placeholder="Nome ou matrícula" value={f.busca} onChange={(e) => set("busca")(e.target.value)} />
        </Field>
      )}
      <Field label="Ano de admissão">
        <NativeSelect value={f.ano} onChange={(e) => set("ano")(e.target.value)}>
          <option value="">Todos</option>
          {anos.map((a) => <option key={a}>{a}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Unidade"><RefSelect refs={refs.unidades.list} value={f.unidade} onChange={set("unidade")} /></Field>
      <Field label="Cargo"><RefSelect refs={refs.cargos.list} value={f.cargo} onChange={set("cargo")} /></Field>
      <Field label="Função"><RefSelect refs={refs.funcoes.list} value={f.funcao} onChange={set("funcao")} /></Field>
      <Field label="Vínculo"><RefSelect refs={refs.vinculos.list} value={f.vinculo} onChange={set("vinculo")} /></Field>
      <Field label="Situação"><RefSelect refs={refs.situacoes.list} value={f.situacao} onChange={set("situacao")} /></Field>
      <Field label="Registros">
        <NativeSelect value={f.status} onChange={(e) => set("status")(e.target.value)}>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativados</option>
          <option value="todos">Todos</option>
        </NativeSelect>
      </Field>
      <div className="flex items-end">
        <Button variant="outline" size="sm" onClick={() => setF(FILTRO_INICIAL)}>Limpar filtros</Button>
      </div>
    </div>
  );
}
