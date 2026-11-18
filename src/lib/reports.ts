import "server-only";
import { createClient } from "@/lib/supabase/server";
import { euros, fecha } from "@/lib/format";
import { BUDGET_STATUS, CLAIM_STATUS, INCIDENT_STATUS, INVOICE_STATUS, PRIORITY } from "@/lib/labels";

export type ReportSection = { title: string; columns: string[]; rows: (string | number)[][]; numeric?: number[] };
export type Report = { title: string; filters: [string, string][]; summary: [string, string][]; sections: ReportSection[] };
export type ReportParams = { tipo?: string; comunidad?: string; gestora?: string; desde?: string; hasta?: string; periodo?: string };

export const REPORT_TYPES: Record<string, string> = {
  comunidad: "Informe por comunidad",
  gestora: "Informe por gestora",
  periodo: "Informe por periodo",
  economico: "Informe económico",
  actividad: "Actividad del equipo",
};

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Resuelve el periodo: mes/trimestre/año actual o rango personalizado. */
export function resolvePeriod(p: ReportParams): { from?: string; to?: string; label: string } {
  const now = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()) + "T12:00:00Z");
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (p.periodo === "mes") return { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(new Date(Date.UTC(y, m + 1, 0))), label: "Mes en curso" };
  if (p.periodo === "trimestre") { const q = Math.floor(m / 3) * 3; return { from: iso(new Date(Date.UTC(y, q, 1))), to: iso(new Date(Date.UTC(y, q + 3, 0))), label: "Trimestre en curso" }; }
  if (p.periodo === "anio") return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Año ${y}` };
  if (isDate(p.desde) || isDate(p.hasta)) return { from: isDate(p.desde) ? p.desde : undefined, to: isDate(p.hasta) ? p.hasta : undefined, label: `${isDate(p.desde) ? fecha(p.desde) : "inicio"} – ${isDate(p.hasta) ? fecha(p.hasta) : "hoy"}` };
  return { label: "Todo el histórico" };
}

export async function buildReport(p: ReportParams): Promise<Report> {
  const supabase = await createClient();
  const tipo = REPORT_TYPES[p.tipo ?? ""] ? p.tipo! : "periodo";
  const period = resolvePeriod(p);
  const filters: [string, string][] = [["Tipo", REPORT_TYPES[tipo]], ["Periodo", period.label]];

  let community: { id: string; name: string; code: string } | null = null;
  let manager: { id: string; full_name: string } | null = null;
  if (p.comunidad) { const { data } = await supabase.from("communities").select("id, name, code").eq("id", p.comunidad).maybeSingle(); community = data; if (data) filters.push(["Comunidad", `${data.name} (${data.code})`]); }
  if (p.gestora) { const { data } = await supabase.from("staff").select("id, full_name").eq("id", p.gestora).maybeSingle(); manager = data; if (data) filters.push(["Gestora", data.full_name]); }

  let iq = supabase.from("incidents_view").select("*").order("created_at");
  if (community) iq = iq.eq("community_id", community.id);
  if (manager) iq = iq.eq("manager_id", manager.id);
  if (period.from) iq = iq.gte("created_at", period.from);
  if (period.to) iq = iq.lte("created_at", `${period.to}T23:59:59`);

  let bq = supabase.from("budgets_view").select("*").order("created_at");
  if (community) bq = bq.eq("community_id", community.id);
  if (manager) bq = bq.eq("responsible_id", manager.id);
  if (period.from) bq = bq.gte("created_at", period.from);
  if (period.to) bq = bq.lte("created_at", `${period.to}T23:59:59`);

  let fq = supabase.from("invoices_view").select("*").order("invoice_date");
  if (community) fq = fq.eq("community_id", community.id);
  if (period.from) fq = fq.gte("invoice_date", period.from);
  if (period.to) fq = fq.lte("invoice_date", period.to);

  const [{ data: incidents }, { data: budgets }, { data: invoicesRaw }, { data: claims }] = await Promise.all([iq, bq, fq,
    supabase.from("claims_view").select("*").order("created_at")]);
  // Facturas de la gestora: las de sus incidencias o comunidades
  let invoices = invoicesRaw ?? [];
  if (manager) {
    const { data: comms } = await supabase.from("communities").select("id").eq("manager_id", manager.id);
    const ids = new Set((comms ?? []).map((c) => c.id));
    const incIds = new Set((incidents ?? []).map((i) => i.id));
    invoices = invoices.filter((f) => ids.has(f.community_id) || (f.incident_id && incIds.has(f.incident_id)));
  }
  const inc = incidents ?? [];
  const bud = budgets ?? [];
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const totalInv = sum(invoices.map((f) => Number(f.total_amount)));
  const paidInv = sum(invoices.map((f) => Number(f.paid_amount)));

  const summary: [string, string][] = [
    ["Incidencias", String(inc.length)], ["Abiertas", String(inc.filter((i) => i.is_open).length)], ["Atrasadas", String(inc.filter((i) => i.is_overdue).length)],
    ["Resueltas/cerradas", String(inc.filter((i) => ["resuelta", "cerrada"].includes(i.status)).length)],
    ["Presupuestos aprobados", `${bud.filter((b) => b.status === "aprobado").length} (${euros(sum(bud.filter((b) => b.status === "aprobado").map((b) => Number(b.total_amount))))})`],
    ["Facturado", euros(totalInv)], ["Pagado", euros(paidInv)], ["Pendiente de pago", euros(totalInv - paidInv)],
  ];

  const incidentRows = (rows: typeof inc) => rows.map((i) => [i.code, fecha(i.created_at), i.community_name, i.title, i.category_name ?? "", i.manager_name ?? "", PRIORITY[i.priority]?.label ?? i.priority, INCIDENT_STATUS[i.status]?.label ?? i.status, i.is_overdue ? "Sí" : "No"]);
  const incidentCols = ["Código", "Fecha", "Comunidad", "Título", "Categoría", "Gestora", "Prioridad", "Estado", "Atrasada"];
  const budgetSection: ReportSection = { title: "Presupuestos", columns: ["Código", "Fecha", "Comunidad", "Proveedor", "Concepto", "Estado", "Total"], numeric: [6],
    rows: bud.map((b) => [b.code, fecha(b.created_at), b.community_name, b.provider_name ?? "", b.concept, BUDGET_STATUS[b.status]?.label ?? b.status, Number(b.total_amount)]) };
  const invoiceSection: ReportSection = { title: "Facturas", columns: ["Nº factura", "Fecha", "Comunidad", "Proveedor", "Estado", "Total", "Pagado"], numeric: [5, 6],
    rows: invoices.map((f) => [f.invoice_number, fecha(f.invoice_date), f.community_name, f.provider_name, INVOICE_STATUS[f.status]?.label ?? f.status, Number(f.total_amount), Number(f.paid_amount)]) };
  const group = (key: (f: (typeof invoices)[number]) => string) => {
    const m = new Map<string, { t: number; p: number; n: number }>();
    for (const f of invoices) { const k = key(f); const e = m.get(k) ?? { t: 0, p: 0, n: 0 }; e.t += Number(f.total_amount); e.p += Number(f.paid_amount); e.n++; m.set(k, e); }
    return [...m.entries()].sort((a, b) => b[1].t - a[1].t).map(([k, e]) => [k, e.n, e.t, e.p, e.t - e.p] as (string | number)[]);
  };
  const catOf = new Map(inc.map((i) => [i.id, i.category_name ?? "Sin categoría"]));
  if (tipo === "economico" && !manager) {
    const { data: allInc } = await supabase.from("incidents_view").select("id, category_name");
    for (const i of allInc ?? []) catOf.set(i.id, i.category_name ?? "Sin categoría");
  }
  const groupCols = ["", "Facturas", "Facturado", "Pagado", "Pendiente"];

  const sections: ReportSection[] = [];
  if (tipo === "economico") {
    sections.push({ title: "Gasto por comunidad", columns: ["Comunidad", ...groupCols.slice(1)], rows: group((f) => f.community_name), numeric: [2, 3, 4] });
    sections.push({ title: "Gasto por proveedor", columns: ["Proveedor", ...groupCols.slice(1)], rows: group((f) => f.provider_name), numeric: [2, 3, 4] });
    sections.push({ title: "Gasto por categoría", columns: ["Categoría", ...groupCols.slice(1)], rows: group((f) => (f.incident_id ? catOf.get(f.incident_id) ?? "Sin categoría" : "Sin incidencia")), numeric: [2, 3, 4] });
    sections.push({ ...budgetSection, title: "Presupuestos aprobados", rows: budgetSection.rows.filter((r) => r[5] === BUDGET_STATUS.aprobado.label) });
    sections.push({ ...invoiceSection, title: "Facturas pendientes de pago", rows: invoiceSection.rows.filter((r) => r[4] !== INVOICE_STATUS.pagada.label) });
    sections.push({ ...invoiceSection, title: "Facturas pagadas", rows: invoiceSection.rows.filter((r) => r[4] === INVOICE_STATUS.pagada.label) });
  } else if (tipo === "actividad") {
    let aq = supabase.from("activity_view").select("*").order("occurred_at", { ascending: false }).limit(2000);
    if (period.from) aq = aq.gte("occurred_at", period.from);
    if (period.to) aq = aq.lte("occurred_at", `${period.to}T23:59:59`);
    if (community) aq = aq.eq("community_id", community.id);
    if (manager) aq = aq.eq("actor_id", manager.id);
    const { data: act } = await aq;
    sections.push({ title: "Movimientos registrados", columns: ["Fecha", "Persona", "Comunidad", "Incidencia", "Acción"], rows: (act ?? []).map((a) => [fecha(a.occurred_at), a.actor_name ?? "Sistema", a.community_name ?? "", a.incident_code ?? "", a.summary]) });
  } else {
    sections.push({ title: "Incidencias pendientes", columns: incidentCols, rows: incidentRows(inc.filter((i) => i.is_open)) });
    sections.push({ title: "Incidencias resueltas y cerradas", columns: incidentCols, rows: incidentRows(inc.filter((i) => !i.is_open)) });
    if (tipo === "gestora" && manager) {
      const { data: tasks } = await supabase.from("tasks").select("title, due_on, incident:incidents(code)").eq("assignee_id", manager.id).eq("done", false).order("due_on");
      const today = new Date().toISOString().slice(0, 10);
      sections.push({ title: "Tareas atrasadas", columns: ["Tarea", "Incidencia", "Fecha límite"], rows: (tasks ?? []).filter((t) => t.due_on && t.due_on < today).map((t) => [t.title, t.incident?.code ?? "", fecha(t.due_on)]) });
    }
    sections.push(budgetSection, invoiceSection);
    if (community) {
      const providers = group((f) => f.provider_name);
      sections.push({ title: "Proveedores", columns: ["Proveedor", ...groupCols.slice(1)], rows: providers, numeric: [2, 3, 4] });
      const cl = (claims ?? []).filter((c) => c.community_id === community!.id);
      if (cl.length) sections.push({ title: "Siniestros", columns: ["Código", "Aseguradora", "Expediente", "Estado"], rows: cl.map((c) => [c.code, c.insurer ?? "", c.claim_number ?? "", CLAIM_STATUS[c.status]?.label ?? c.status]) });
    }
    if (!community && !manager) {
      sections.splice(2, 0, { title: "Incidencias por comunidad", columns: ["Comunidad", "Total", "Abiertas", "Atrasadas"],
        rows: [...new Set(inc.map((i) => i.community_name))].map((c) => { const r = inc.filter((i) => i.community_name === c); return [c, r.length, r.filter((i) => i.is_open).length, r.filter((i) => i.is_overdue).length]; }) });
    }
  }
  const title = tipo === "comunidad" && community ? `Informe de la comunidad ${community.name}` : tipo === "gestora" && manager ? `Informe de gestión · ${manager.full_name}` : REPORT_TYPES[tipo];
  return { title, filters, summary: tipo === "actividad" ? [] : summary, sections };
}

export function cellText(v: string | number, numeric: boolean) {
  return numeric && typeof v === "number" ? euros(v) : String(v);
}
