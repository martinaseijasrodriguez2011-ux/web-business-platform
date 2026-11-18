import type { NextRequest } from "next/server";
import { getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fileResponse, tableToXlsx } from "@/lib/export";
import { fecha, hoyISO } from "@/lib/format";
import { INCIDENT_STATUS, INVOICE_STATUS, PRIORITY } from "@/lib/labels";
import type { IncidentStatus, InvoiceStatus, Priority } from "@/lib/types";

/** Exportación a Excel de los listados (respeta los filtros de pantalla y RLS). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ tipo: string }> }) {
  const me = await getCurrentStaff();
  if (!me) return new Response("No autorizado", { status: 401 });
  const { tipo } = await ctx.params;
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const supabase = await createClient();
  const filters = Object.entries(sp).filter(([k]) => k !== "pagina").map(([k, v]) => [k, v] as [string, string]);

  if (tipo === "incidencias") {
    let q = supabase.from("incidents_view").select("*").order("created_at", { ascending: false }).limit(10000);
    if (sp.comunidad) q = q.eq("community_id", sp.comunidad);
    if (sp.gestora) q = q.eq("manager_id", sp.gestora);
    if (sp.proveedor) q = q.eq("provider_id", sp.proveedor);
    if (sp.categoria) q = q.eq("category_id", sp.categoria);
    if (sp.prioridad) q = q.eq("priority", sp.prioridad as Priority);
    if (sp.estado) q = q.eq("status", sp.estado as IncidentStatus);
    if (sp.vista === "atrasadas") q = q.eq("is_overdue", true);
    if (sp.vista === "abiertas") q = q.eq("is_open", true);
    if (sp.vista === "mias") q = q.eq("manager_id", me.id);
    if (sp.desde) q = q.gte("created_at", sp.desde);
    if (sp.hasta) q = q.lte("created_at", `${sp.hasta}T23:59:59`);
    const { data } = await q;
    const buf = await tableToXlsx("Incidencias", ["Código", "Fecha", "Comunidad", "Título", "Categoría", "Vecino", "Piso", "Gestora", "Proveedor", "Prioridad", "Estado", "Atrasada", "Fecha límite", "Tareas"],
      (data ?? []).map((i) => [i.code, fecha(i.created_at), i.community_name, i.title, i.category_name, i.reporter_name, i.reporter_unit, i.manager_name, i.provider_name, PRIORITY[i.priority]?.label, INCIDENT_STATUS[i.status]?.label, i.is_overdue ? "Sí" : "No", fecha(i.due_on), `${i.tasks_done}/${i.tasks_total}`]),
      filters, me.full_name);
    return fileResponse(buf, `incidencias-${hoyISO()}.xlsx`, "xlsx");
  }
  if (tipo === "comunidades") {
    const { data } = await supabase.from("communities_view").select("*").order("name");
    const buf = await tableToXlsx("Comunidades", ["Código", "Comunidad", "Gestora", "Dirección", "C.P.", "Población", "Presidente", "Abiertas", "Cerradas", "Atrasadas", "Activa"],
      (data ?? []).map((c) => [c.code, c.name, c.manager_name ?? "Pendiente de asignar", c.address, c.postal_code, c.city, c.president_name, c.open_incidents, c.closed_incidents, c.overdue_incidents, c.active ? "Sí" : "No"]),
      filters, me.full_name);
    return fileResponse(buf, `comunidades-${hoyISO()}.xlsx`, "xlsx");
  }
  if (tipo === "facturas") {
    let q = supabase.from("invoices_view").select("*").order("invoice_date", { ascending: false });
    if (sp.estado === "pendientes") q = q.neq("status", "pagada"); else if (sp.estado) q = q.eq("status", sp.estado as InvoiceStatus);
    if (sp.comunidad) q = q.eq("community_id", sp.comunidad);
    if (sp.proveedor) q = q.eq("provider_id", sp.proveedor);
    const { data } = await q;
    const buf = await tableToXlsx("Facturas", ["Nº factura", "Fecha", "Proveedor", "Comunidad", "Incidencia", "Presupuesto", "Base", "IVA %", "IVA", "Total", "Pagado", "Estado"],
      (data ?? []).map((f) => [f.invoice_number, fecha(f.invoice_date), f.provider_name, f.community_name, f.incident_code, f.budget_code, Number(f.base_amount), Number(f.vat_rate), Number(f.vat_amount), Number(f.total_amount), Number(f.paid_amount), INVOICE_STATUS[f.status]?.label]),
      filters, me.full_name, [6, 8, 9, 10]);
    return fileResponse(buf, `facturas-${hoyISO()}.xlsx`, "xlsx");
  }
  return new Response("Exportación no disponible", { status: 404 });
}
