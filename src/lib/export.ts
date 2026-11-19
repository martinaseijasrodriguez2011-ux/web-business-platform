import "server-only";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Report } from "@/lib/reports";
import { euros, fechaHora } from "@/lib/format";
import { LOGO_PNG_BASE64, LOGO_SIZE } from "@/lib/brand-logo";

const BRAND = "3F3F3F";

/** Libro Excel con identidad, fecha de generación y filtros aplicados. */
export async function reportToXlsx(report: Report, company: string, author: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = `AR Incidencias · ${author}`;
  wb.created = new Date();
  const info = wb.addWorksheet("Resumen");
  info.getColumn(1).width = 32; info.getColumn(2).width = 60;
  info.addRow([company]).font = { bold: true, size: 14, color: { argb: `FF${BRAND}` } };
  info.addRow([report.title]).font = { bold: true, size: 12 };
  info.addRow([`Generado el ${fechaHora(new Date())} por ${author}`]).font = { italic: true, color: { argb: "FF6B7280" } };
  info.addRow([]);
  info.addRow(["Filtros"]).font = { bold: true };
  for (const [k, v] of report.filters) info.addRow([k, v]);
  if (report.summary.length) { info.addRow([]); info.addRow(["Resumen"]).font = { bold: true }; for (const [k, v] of report.summary) info.addRow([k, v]); }

  const used = new Set<string>();
  for (const s of report.sections) {
    let name = s.title.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
    while (used.has(name)) name = `${name.slice(0, 28)}_${used.size}`;
    used.add(name);
    const ws = wb.addWorksheet(name);
    const header = ws.addRow(s.columns);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND}` } }; });
    for (const r of s.rows) ws.addRow(r);
    s.columns.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      col.width = Math.min(60, Math.max(12, c.length + 4, ...s.rows.slice(0, 200).map((r) => String(r[i] ?? "").length + 2)));
      if (s.numeric?.includes(i)) col.numFmt = '#,##0.00 "€"';
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];
    if (s.rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.columns.length } };
  }
  return wb.xlsx.writeBuffer();
}

export async function tableToXlsx(title: string, columns: string[], rows: (string | number | null)[][], filters: [string, string][], author: string, numeric: number[] = []) {
  return reportToXlsx({ title, filters, summary: [], sections: [{ title, columns, rows: rows.map((r) => r.map((v) => v ?? "")), numeric }] }, "Altayó & Rodríguez", author);
}

/** PDF apaisado con cabecera corporativa, filtros, resumen y tablas. */
export function reportToPdf(report: Report, company: string, author: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const header = () => {
    // Logotipo oficial (proporción original) y filete en rojo corporativo
    doc.addImage(LOGO_PNG_BASE64, "PNG", 10, 3, 31, (31 * LOGO_SIZE.height) / LOGO_SIZE.width);
    doc.setDrawColor(199, 44, 46); doc.setLineWidth(0.6); doc.line(10, 15, w - 10, 15);
    doc.setTextColor(100, 100, 100); doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`${company} · AR Incidencias`, w - 10, 7, { align: "right" });
    doc.text(`Generado el ${fechaHora(new Date())} por ${author}`, w - 10, 11.5, { align: "right" });
    doc.setTextColor(17, 24, 39);
  };
  header();
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text(report.title, 10, 24);
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(75, 85, 99);
  doc.text(report.filters.map(([k, v]) => `${k}: ${v}`).join("   ·   "), 10, 30, { maxWidth: w - 20 });
  let y = 36;
  if (report.summary.length) {
    autoTable(doc, { startY: y, head: [report.summary.map(([k]) => k)], body: [report.summary.map(([, v]) => v)], theme: "grid",
      styles: { fontSize: 8, halign: "center" }, headStyles: { fillColor: [239, 246, 255], textColor: [29, 78, 216] }, margin: { left: 10, right: 10, top: 18 } });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }
  for (const s of report.sections) {
    if (y > 175) { doc.addPage(); y = 22; }
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(17, 24, 39); doc.text(`${s.title} (${s.rows.length})`, 10, y);
    if (!s.rows.length) { doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(107, 114, 128); doc.text("Sin registros.", 10, y + 5); y += 12; continue; }
    autoTable(doc, {
      startY: y + 2, head: [s.columns], body: s.rows.map((r) => r.map((v, i) => (s.numeric?.includes(i) && typeof v === "number" ? euros(v) : String(v)))),
      styles: { fontSize: 7.5, cellPadding: 1.5, overflow: "linebreak" }, headStyles: { fillColor: [63, 63, 63] }, alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: Object.fromEntries((s.numeric ?? []).map((i) => [i, { halign: "right" as const }])), margin: { left: 10, right: 10, top: 18 },
      didParseCell: (d) => { if (d.section === "head" && s.numeric?.includes(d.column.index)) d.cell.styles.halign = "right"; },
      didDrawPage: () => header(),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(107, 114, 128);
    doc.text(`Documento interno · Contiene datos personales: uso restringido (RGPD / LOPDGDD) · Página ${i} de ${pages}`, w / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
  }
  return Buffer.from(doc.output("arraybuffer"));
}

export function fileResponse(buf: ArrayBuffer | Buffer, filename: string, type: "xlsx" | "pdf") {
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": type === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
