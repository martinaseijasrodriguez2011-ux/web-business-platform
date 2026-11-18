import { FileDown, FileSpreadsheet } from "lucide-react";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { Table, Td, Th } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth";
import { getCommunityOptions, getStaffOptions } from "@/lib/queries";
import { buildReport, cellText, REPORT_TYPES } from "@/lib/reports";

export const metadata = { title: "Informes" };

export default async function InformesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const params = Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>;
  const [communities, staff] = await Promise.all([getCommunityOptions(), getStaffOptions()]);
  const ready = !!sp.tipo && (sp.tipo !== "comunidad" || !!sp.comunidad) && (sp.tipo !== "gestora" || !!sp.gestora);
  const report = ready ? await buildReport(params) : null;
  const qs = new URLSearchParams(params).toString();
  return (
    <div>
      <PageHeader title="Informes" subtitle="Informes por comunidad, gestora, periodo y económicos. Exportables a PDF y Excel con la fecha de generación y los filtros utilizados." />
      <Card className="mb-6 no-print">
        <form className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Tipo de informe" htmlFor="tipo" className="lg:col-span-2"><Select id="tipo" name="tipo" defaultValue={sp.tipo ?? "periodo"}>{Object.entries(REPORT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Comunidad" htmlFor="comunidad" hint="Obligatoria en el informe por comunidad."><Select id="comunidad" name="comunidad" defaultValue={sp.comunidad ?? ""}><option value="">Todas</option>{communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field label="Gestora" htmlFor="gestora" hint="Obligatoria en el informe por gestora."><Select id="gestora" name="gestora" defaultValue={sp.gestora ?? ""}><option value="">Todas</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select></Field>
          <Field label="Periodo" htmlFor="periodo"><Select id="periodo" name="periodo" defaultValue={sp.periodo ?? ""}><option value="">Todo / personalizado</option><option value="mes">Mes en curso</option><option value="trimestre">Trimestre en curso</option><option value="anio">Año en curso</option></Select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Desde" htmlFor="desde"><Input id="desde" name="desde" type="date" defaultValue={sp.desde ?? ""} /></Field>
            <Field label="Hasta" htmlFor="hasta"><Input id="hasta" name="hasta" type="date" defaultValue={sp.hasta ?? ""} /></Field>
          </div>
          <div className="flex items-end lg:col-span-6"><button className="h-10 rounded-lg bg-brand px-5 text-sm font-medium text-white">Generar informe</button></div>
        </form>
      </Card>
      {!sp.tipo && <p className="text-sm text-ink-3">Seleccione el tipo de informe y los filtros, y pulse «Generar informe».</p>}
      {sp.tipo && !ready && <p className="text-sm text-[var(--naranja-fg)]">Seleccione {sp.tipo === "comunidad" ? "la comunidad" : "la gestora"} para generar este informe.</p>}
      {report && (
        <Card>
          <CardHeader title={report.title} subtitle={report.filters.map(([k, v]) => `${k}: ${v}`).join(" · ")}
            actions={<><ButtonLink href={`/api/informes/pdf?${qs}`} variant="secondary" size="sm"><FileDown size={16} /> PDF</ButtonLink><ButtonLink href={`/api/informes/xlsx?${qs}`} variant="secondary" size="sm"><FileSpreadsheet size={16} /> Excel</ButtonLink></>} />
          <CardBody className="space-y-8">
            {report.summary.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{report.summary.map(([k, v]) => <div key={k} className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-ink-3">{k}</p><p className="tabular font-semibold">{v}</p></div>)}</div>
            )}
            {report.sections.map((s) => (
              <section key={s.title}>
                <h3 className="mb-2 font-semibold">{s.title} <span className="font-normal text-ink-3">({s.rows.length})</span></h3>
                {!s.rows.length ? <p className="text-sm text-ink-3">Sin registros.</p> : (
                  <Table className="rounded-lg border border-line">
                    <thead><tr>{s.columns.map((c, i) => <Th key={i} className={s.numeric?.includes(i) ? "text-right" : ""}>{c}</Th>)}</tr></thead>
                    <tbody>{s.rows.slice(0, 200).map((r, ri) => <tr key={ri}>{r.map((v, i) => <Td key={i} className={s.numeric?.includes(i) ? "tabular text-right" : ""}>{cellText(v, !!s.numeric?.includes(i))}</Td>)}</tr>)}</tbody>
                  </Table>
                )}
                {s.rows.length > 200 && <p className="mt-1 text-xs text-ink-3">Se muestran 200 filas; la exportación incluye todas.</p>}
              </section>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
