import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Filtros, FILTRO_INICIAL, aplicarFiltros } from "@/components/Filtros";
import { Panel, StatCard, Vazio } from "@/components/kit";
import { usePerms, useRefs, useServidores } from "@/lib/data";
import { contarPor } from "@/lib/calc";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "Painel — Gestão de Servidores" }, { name: "description", content: "Indicadores da rede municipal de ensino." }] }),
  component: Painel,
});

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const CAT_VINC = [
  { cat: "efetivo", label: "Efetivos" },
  { cat: "temporario", label: "Contratados temporários" },
  { cat: "processo_seletivo", label: "Processo seletivo" },
  { cat: "comissionado", label: "Comissionados" },
];
const CAT_SIT = [
  { cat: "cedido", label: "Cedidos" },
  { cat: "permutado", label: "Permutados" },
  { cat: "desvio", label: "Desviados de função" },
  { cat: "requisitado", label: "Requisitados" },
  { cat: "licenca", label: "Em licença" },
  { cat: "aposentado", label: "Aposentados" },
  { cat: "exonerado", label: "Exonerados" },
  { cat: "desligado", label: "Desligados" },
];

function Painel() {
  const { can } = usePerms();
  const refs = useRefs();
  const serv = useServidores();
  const [f, setF] = useState({ ...FILTRO_INICIAL, status: "todos" as const });

  const rows = useMemo(() => (serv.data ? aplicarFiltros(serv.data, f) : []), [serv.data, f]);
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const unicos = useQuery({
    queryKey: ["unicos", ids],
    enabled: !!serv.data,
    queryFn: async () => (await supabase.rpc("contar_servidores_unicos", { _ids: ids })).data,
  });

  const unidadesTotais = useQuery({
    queryKey: ["painel-unidades"],
    queryFn: async () => {
      const [u, t] = await Promise.all([
        supabase.from("unidades").select("id", { count: "exact", head: true }),
        supabase.from("turmas").select("id", { count: "exact", head: true }),
      ]);
      return { unidades: u.count ?? 0, turmas: t.count ?? 0 };
    },
  });

  if (!can("servidores.ver"))
    return (
      <>
        <PageHeader title="Painel da Secretaria" />
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Unidades cadastradas" value={unidadesTotais.data?.unidades ?? "…"} />
          <StatCard label="Turmas cadastradas" value={unidadesTotais.data?.turmas ?? "…"} />
        </div>
      </>
    );
  if (!refs.data || !serv.data) return <p className="text-muted-foreground">Carregando indicadores…</p>;
  const R = refs.data;

  const porCatV = (cat: string) => rows.filter((r) => r.vinculo_id && R.vinculos.map.get(r.vinculo_id)?.categoria === cat).length;
  const porCatS = (cat: string) => rows.filter((r) => r.situacao_id && R.situacoes.map.get(r.situacao_id)?.categoria === cat).length;
  const temCatS = (cat: string) => R.situacoes.list.some((s) => s.categoria === cat);
  const nomes = (l: { id: string; nome: string }[]) => new Map(l.map((x) => [x.id, x.nome]));

  const porUnidade = contarPor(rows, (r) => r.unidade_id, nomes(R.unidades.list));
  const porCargo = contarPor(rows, (r) => r.cargo_id, nomes(R.cargos.list));
  const porFuncao = contarPor(rows, (r) => r.funcao_id, nomes(R.funcoes.list));
  const porVinculo = contarPor(rows, (r) => r.vinculo_id, nomes(R.vinculos.list));
  const porSituacao = contarPor(rows, (r) => r.situacao_id, nomes(R.situacoes.list));

  return (
    <>
      <PageHeader title="Painel da Secretaria" description="Indicadores calculados a partir dos registros cadastrados. Os números mudam conforme os filtros." />
      <Filtros f={f} setF={setF} refs={R} rows={serv.data} busca={false} />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="primary"
          label="Total geral de servidores"
          value={unicos.data ?? "…"}
          hint={`Pessoas únicas (por CPF; sem CPF, por matrícula). ${rows.length} registro(s) funcional(is).`}
        />
        {CAT_VINC.map((c) => (
          <StatCard key={c.cat} label={c.label} value={porCatV(c.cat)} hint="Registros por tipo de vínculo" />
        ))}
        {CAT_SIT.filter((c) => temCatS(c.cat)).map((c) => (
          <StatCard key={c.cat} label={c.label} value={porCatS(c.cat)} hint="Registros por situação funcional" />
        ))}
        <StatCard label="Sem vínculo informado" value={rows.filter((r) => !r.vinculo_id).length} hint="Aguardando correção cadastral" />
        <StatCard label="Unidades / turmas" value={`${unidadesTotais.data?.unidades ?? "…"} / ${unidadesTotais.data?.turmas ?? "…"}`} hint="Cadastradas no sistema" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Critério: o total geral conta cada pessoa uma vez. Os cartões por vínculo e situação contam registros funcionais (matrículas); um servidor com dois vínculos aparece em cada um deles.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartBar title="Servidores por unidade (15 maiores)" data={porUnidade.slice(0, 15)} />
        <ChartBar title="Servidores por cargo (15 maiores)" data={porCargo.slice(0, 15)} />
        <ChartPie title="Por tipo de vínculo" data={porVinculo} />
        <ChartPie title="Por situação funcional" data={porSituacao} />
        <Tabela title="Por função" data={porFuncao} />
        <Tabela title="Por unidade escolar" data={porUnidade} />
      </div>
    </>
  );
}

function ChartBar({ title, data }: { title: string; data: { nome: string; total: number }[] }) {
  return (
    <Panel title={title}>
      {data.length === 0 ? <Vazio>Sem dados.</Vazio> : (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 26)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nome" width={190} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="total" fill="var(--chart-1)" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

function ChartPie({ title, data }: { title: string; data: { nome: string; total: number }[] }) {
  return (
    <Panel title={title}>
      {data.length === 0 ? <Vazio>Sem dados.</Vazio> : (
        <div className="grid items-center gap-4 sm:grid-cols-2">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="total" nameKey="nome" innerRadius={50} outerRadius={90}>
                {data.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <ul className="space-y-1 text-sm">
            {data.map((d, i) => (
              <li key={d.nome} className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: CORES[i % CORES.length] }} />
                <span className="flex-1 truncate">{d.nome}</span>
                <span className="font-semibold tabular-nums">{d.total}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function Tabela({ title, data }: { title: string; data: { nome: string; total: number }[] }) {
  return (
    <Panel title={title}>
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {data.map((d) => (
              <tr key={d.nome} className="border-b last:border-0">
                <td className="py-1.5">{d.nome}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <Vazio>Sem dados.</Vazio>}
      </div>
    </Panel>
  );
}
