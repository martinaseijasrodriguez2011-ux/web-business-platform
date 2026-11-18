import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { Select } from "@/components/ui/form";
import { cx } from "@/components/ui/cx";
import { isSupervisor, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityOptions, getProviderOptions } from "@/lib/queries";
import { euros, fecha } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/types";

export const metadata = { title: "Facturas y pagos" };

export default async function FacturasPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("invoices_view").select("*").order("invoice_date", { ascending: false }).limit(500);
  if (sp.estado === "pendientes") q = q.neq("status", "pagada");
  else if (sp.estado) q = q.eq("status", sp.estado as InvoiceStatus);
  if (sp.comunidad) q = q.eq("community_id", sp.comunidad);
  if (sp.proveedor) q = q.eq("provider_id", sp.proveedor);
  const [{ data }, communities, providers, { data: all }] = await Promise.all([q, getCommunityOptions(), getProviderOptions(), supabase.from("invoices_view").select("status, total_amount, paid_amount")]);
  const sum = (rows: { total_amount: number; paid_amount: number }[], f: (r: { total_amount: number; paid_amount: number }) => number) => rows.reduce((a, r) => a + f(r), 0);
  const allRows = (all ?? []) as unknown as { status: string; total_amount: number; paid_amount: number }[];
  const pending = allRows.filter((r) => r.status !== "pagada");
  const chips: [string, string, number][] = [["", "Todas", allRows.length], ["pendientes", "Pendientes de pago", pending.length],
    ...(["recibida", "pendiente_revision", "pendiente_pago", "discrepancia", "pagada"] as const).map((k) => [k, ({ recibida: "Recibidas", pendiente_revision: "Pendientes de revisión", pendiente_pago: "Pendientes de pago (revisadas)", discrepancia: "Con discrepancia", pagada: "Pagadas" })[k], allRows.filter((r) => r.status === k).length] as [string, string, number])];
  const keep = (extra: Record<string, string>) => `/facturas?${new URLSearchParams(Object.entries({ ...sp, ...extra }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <div>
      <PageHeader title="Facturas y pagos" subtitle={isSupervisor(me) ? "Puede confirmar pagos desde la ficha de cada factura." : "Todas las gestoras registran facturas. Solo Dirección y Coordinación confirman pagos."}
        actions={<><ButtonLink href={`/api/exportar/facturas?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`} variant="secondary"><Download size={16} /> Excel</ButtonLink><ButtonLink href="/facturas/nueva"><Plus size={16} /> Registrar factura</ButtonLink></>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm text-ink-3">Total facturado</p><p className="tabular mt-1 text-xl font-semibold">{euros(sum(allRows, (r) => Number(r.total_amount)))}</p></Card>
        <Card className="p-4"><p className="text-sm text-ink-3">Pagado</p><p className="tabular mt-1 text-xl font-semibold text-[var(--verde-fg)]">{euros(sum(allRows, (r) => Number(r.paid_amount)))}</p></Card>
        <Card className="p-4"><p className="text-sm text-ink-3">Pendiente de pago</p><p className="tabular mt-1 text-xl font-semibold text-[var(--naranja-fg)]">{euros(sum(pending, (r) => Number(r.total_amount) - Number(r.paid_amount)))}</p></Card>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {chips.map(([k, label, n]) => (
          <Link key={k} href={keep({ estado: k })} className={cx("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm", (sp.estado ?? "") === k ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2")}>
            {label}<span className={cx("tabular rounded-full px-1.5 text-xs", (sp.estado ?? "") === k ? "bg-white/20" : "bg-gray-100")}>{n}</span>
          </Link>
        ))}
      </div>
      <Card className="mb-4">
        <form className="grid gap-3 p-4 sm:grid-cols-3">
          {sp.estado && <input type="hidden" name="estado" value={sp.estado} />}
          <Select name="comunidad" defaultValue={sp.comunidad ?? ""} aria-label="Comunidad"><option value="">Todas las comunidades</option>{communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select name="proveedor" defaultValue={sp.proveedor ?? ""} aria-label="Proveedor"><option value="">Todos los proveedores</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <button className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white">Filtrar</button>
        </form>
      </Card>
      <Card>
        {!data?.length ? <EmptyState title="No hay facturas" /> : (
          <Table>
            <thead><tr><Th>Factura</Th><Th>Proveedor</Th><Th>Comunidad</Th><Th>Fecha</Th><Th className="text-right">Total</Th><Th className="text-right">Pagado</Th><Th>Estado</Th></tr></thead>
            <tbody>{data.map((f) => (
              <tr key={f.id} className="hover:bg-surface-2">
                <Td><Link href={`/facturas/${f.id}`} className="font-medium hover:text-brand">{f.invoice_number}</Link><span className="block text-xs text-ink-3">{[f.incident_code, f.budget_code].filter(Boolean).join(" · ")}</span></Td>
                <Td className="text-ink-2">{f.provider_name}</Td><Td className="text-ink-2">{f.community_name}</Td><Td className="text-ink-3">{fecha(f.invoice_date)}</Td>
                <Td className="tabular text-right font-medium">{euros(f.total_amount)}</Td><Td className="tabular text-right">{euros(f.paid_amount)}</Td>
                <Td><StatusBadge entity="factura" status={f.status} /></Td>
              </tr>))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
