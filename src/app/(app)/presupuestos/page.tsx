import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { Select } from "@/components/ui/form";
import { cx } from "@/components/ui/cx";
import { isSupervisor, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityOptions, getProviderOptions, getStaffOptions } from "@/lib/queries";
import { euros, fecha } from "@/lib/format";
import { BUDGET_STATUS } from "@/lib/labels";
import type { BudgetStatus } from "@/lib/types";

export const metadata = { title: "Presupuestos" };

export default async function PresupuestosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("budgets_view").select("*").order("created_at", { ascending: false }).limit(500);
  if (sp.estado === "superior") q = q.eq("requires_superior", true).eq("status", "pendiente_autorizacion");
  else if (sp.estado) q = q.eq("status", sp.estado as BudgetStatus);
  if (sp.comunidad) q = q.eq("community_id", sp.comunidad);
  if (sp.proveedor) q = q.eq("provider_id", sp.proveedor);
  if (sp.gestora) q = q.eq("responsible_id", sp.gestora);
  const [{ data }, communities, providers, staff, { data: all }, { data: limits }] = await Promise.all([
    q, getCommunityOptions(), getProviderOptions(), getStaffOptions(), supabase.from("budgets").select("status, requires_superior"),
    supabase.rpc("limits_enabled"),
  ]);
  const count = (k: string) => (all ?? []).filter((b) => (k === "superior" ? b.requires_superior && b.status === "pendiente_autorizacion" : b.status === k)).length;
  const chips = [["", "Todos", (all ?? []).length], ["solicitado", "Solicitados", count("solicitado")], ["recibido", "Recibidos", count("recibido")],
    ["pendiente_autorizacion", "Pendientes de autorización", count("pendiente_autorizacion")], ["superior", "Requieren autorización superior", count("superior")],
    ["aprobado", "Aprobados", count("aprobado")], ["rechazado", "Rechazados", count("rechazado")], ["cancelado", "Cancelados", count("cancelado")]] as const;
  const keep = (extra: Record<string, string>) => { const p = new URLSearchParams(Object.entries({ ...sp, ...extra }).filter(([, v]) => v) as [string, string][]); return `/presupuestos?${p}`; };

  return (
    <div>
      <PageHeader title="Presupuestos" subtitle={`Solicitud, comparación, autorización y aprobación de presupuestos.${isSupervisor(me) || !limits ? "" : ` Su límite de aprobación: ${me.approval_limit != null ? euros(me.approval_limit) : "pendiente de configurar"}.`}`}
        actions={<ButtonLink href="/presupuestos/nuevo"><Plus size={16} /> Nuevo presupuesto</ButtonLink>} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {chips.map(([k, label, n]) => (
          <Link key={k} href={keep({ estado: k })} className={cx("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm", (sp.estado ?? "") === k ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2")}>
            {label}<span className={cx("tabular rounded-full px-1.5 text-xs", (sp.estado ?? "") === k ? "bg-white/20" : "bg-gray-100")}>{n}</span>
          </Link>
        ))}
      </div>
      <Card className="mb-4">
        <form className="grid gap-3 p-4 sm:grid-cols-4">
          {sp.estado && <input type="hidden" name="estado" value={sp.estado} />}
          <Select name="comunidad" defaultValue={sp.comunidad ?? ""} aria-label="Comunidad"><option value="">Todas las comunidades</option>{communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select name="proveedor" defaultValue={sp.proveedor ?? ""} aria-label="Proveedor"><option value="">Todos los proveedores</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Select name="gestora" defaultValue={sp.gestora ?? ""} aria-label="Gestora responsable"><option value="">Todas las gestoras</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select>
          <button className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white">Filtrar</button>
        </form>
      </Card>
      <Card>
        {!data?.length ? <EmptyState title="No hay presupuestos" description="Cree un presupuesto desde una incidencia o con el botón «Nuevo presupuesto»." /> : (
          <Table>
            <thead><tr><Th>Presupuesto</Th><Th>Comunidad / incidencia</Th><Th>Proveedor</Th><Th className="text-right">Total</Th><Th>Responsable</Th><Th>Estado</Th><Th>Autorizaciones</Th></tr></thead>
            <tbody>{data.map((b) => (
              <tr key={b.id} className="hover:bg-surface-2">
                <Td><Link href={`/presupuestos/${b.id}`} className="font-medium hover:text-brand">{b.code}</Link><span className="block max-w-[240px] truncate text-xs text-ink-3">{b.concept}</span></Td>
                <Td><span className="block">{b.community_name}</span>{b.incident_code && <Link href={`/incidencias/${b.incident_id}`} className="text-xs text-ink-3 hover:text-brand">{b.incident_code}</Link>}</Td>
                <Td className="text-ink-2">{b.provider_name ?? "—"}</Td>
                <Td className="tabular text-right font-medium">{b.base_amount === null ? "—" : euros(b.total_amount)}</Td>
                <Td className="text-ink-2">{b.responsible_name ?? "—"}</Td>
                <Td><div className="flex flex-col items-start gap-1"><StatusBadge entity="presupuesto" status={b.status} />{b.requires_superior && b.status === "pendiente_autorizacion" && <Badge tone="naranja" dot={false}>Autorización superior</Badge>}</div></Td>
                <Td className="text-xs text-ink-2">
                  {b.has_president_authorization ? "Presidente ✓" : "Presidente —"}
                  {b.status === "aprobado" && <span className="block">{b.approval_kind === "autorizacion_superior" ? "Aut. superior" : "Aprob. interna"} · {b.approved_by_name} · {fecha(b.approved_at)}</span>}
                </Td>
              </tr>))}
            </tbody>
          </Table>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-3">{Object.values(BUDGET_STATUS).length} estados posibles. Los presupuestos rechazados y cancelados se conservan.</p>
    </div>
  );
}
