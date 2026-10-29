// Exportação para Excel e PDF com cabeçalho institucional.
export type Coluna = { key: string; label: string };
export type Cabecalho = {
  municipio: string;
  secretaria: string;
  titulo: string;
  periodo?: string;
  filtros?: string;
  brasao?: string | null;
};

const linhasCab = (c: Cabecalho) => [
  [c.municipio],
  [c.secretaria],
  [c.titulo],
  [`Período de referência: ${c.periodo || "—"}`],
  [`Filtros: ${c.filtros || "Nenhum"}`],
  [`Emitido em: ${new Date().toLocaleString("pt-BR")}`],
  [],
];

export async function exportarExcel(nome: string, cab: Cabecalho, cols: Coluna[], rows: Record<string, unknown>[]) {
  const XLSX = await import("xlsx");
  const aoa = [...linhasCab(cab), cols.map((c) => c.label), ...rows.map((r) => cols.map((c) => r[c.key] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = cols.map((c) => ({ wch: Math.min(50, Math.max(10, c.label.length + 4)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${nome}.xlsx`);
}

export async function exportarPdf(nome: string, cab: Cabecalho, cols: Coluna[], rows: Record<string, unknown>[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: cols.length > 6 ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  let x = 14;
  if (cab.brasao) {
    try {
      doc.addImage(cab.brasao, 14, 8, 16, 16);
      x = 34;
    } catch {
      /* imagem inválida: segue sem brasão */
    }
  }
  doc.setFont("helvetica", "bold").setFontSize(11).text(cab.municipio, x, 12);
  doc.setFont("helvetica", "normal").setFontSize(10).text(cab.secretaria, x, 17);
  doc.setFont("helvetica", "bold").setFontSize(13).text(cab.titulo, 14, 31);
  doc.setFont("helvetica", "normal").setFontSize(8.5);
  doc.text(`Período: ${cab.periodo || "—"}   |   Filtros: ${cab.filtros || "Nenhum"}`, 14, 37, { maxWidth: w - 28 });
  doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, 14, 42);
  autoTable(doc, {
    startY: 46,
    head: [cols.map((c) => c.label)],
    body: rows.map((r) => cols.map((c) => String(r[c.key] ?? ""))),
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: [33, 62, 110] },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8).text(`Página ${doc.getNumberOfPages()}`, w - 14, h - 8, { align: "right" });
      doc.text(cab.secretaria, 14, h - 8);
    },
  });
  // Corrige "Página X de Y"
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFillColor(255, 255, 255).rect(w - 50, h - 12, 40, 6, "F");
    doc.setFontSize(8).text(`Página ${i} de ${total}`, w - 14, h - 8, { align: "right" });
  }
  doc.save(`${nome}.pdf`);
}
