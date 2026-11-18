import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { Card, CardBody, CardHeader, DataList, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { DocumentList, DOC_SELECT, type DocRow } from "@/components/shared/document-list";
import { UploadModal } from "@/components/shared/upload-modal";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { euros, fecha } from "@/lib/format";

export default async function ProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: p } = await supabase.from("providers").select("*, provider_specialties(categories(name))").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: incidents }, { data: budgets }, { data: invoices }, { data: docs }, { data: linked }] = await Promise.all([
    supabase.from("incidents_view").select("id, code, title, status, community_id, community_name, created_at").eq("provider_id", id).order("created_at", { ascending: false }),
    supabase.from("budgets_view").select("id, code, concept, status, total_amount, base_amount, community_id, community_name, created_at").eq("provider_id", id).order("created_at", { ascending: false }),
    supabase.from("invoices_view").select("id, invoice_number, status, total_amount, paid_amount, community_id, community_name, invoice_date").eq("provider_id", id).order("invoice_date", { ascending: false }),
    supabase.from("documents").select(DOC_SELECT).eq("provider_id", id).order("created_at", { ascending: false }),
    supabase.from("community_providers").select("service, community:communities(id, name)").eq("provider_id", id),
  ]);
  const communities = new Map<string, string>();
  for (const r of [...(incidents ?? []), ...(budgets ?? []), ...(invoices ?? [])]) communities.set(r.community_id, r.community_name);
  for (const l of linked ?? []) if (l.community) communities.set(l.community.id, l.community.name);
  const total = (invoices ?? []).reduce((a, f) => a + Number(f.total_amount), 0);
  const accepted = (budgets ?? []).filter((b) => b.status === "aprobado").length;
  const rejected = (budgets ?? []).filter((b) => b.status === "rechazado").length;

  return (
    <div>
      <PageHeader back={<Link href="/proveedores" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Proveedores</Link>}
        title={p.trade_name} subtitle={<span className="flex flex-wrap gap-1">{p.provider_specialties.map((x, i) => <Badge key={i} tone="azul" dot={false}>{x.categories?.name}</Badge>)}{!p.active && <Badge tone="gris">Inactivo</Badge>}</span>}
        actions={<><UploadModal links={{ provider_id: id }} folder={`proveedores/${id}`} /><ButtonLink href={`/proveedores/${id}/editar`} variant="secondary"><Pencil size={16} /> Editar</ButtonLink></>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[["Incidencias", incidents?.length ?? 0], ["Comunidades", communities.size], ["Presupuestos aceptados", accepted], ["Presupuestos rechazados", rejected], ["Gasto acumulado", euros(total)]].map(([k, v]) => (
          <Card key={k as string} className="p-4"><p className="text-xs text-ink-3">{k}</p><p className="tabular mt-1 text-xl font-semibold">{v}</p></Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card><CardHeader title="Presupuestos enviados" />
            {!budgets?.length ? <CardBody><p className="text-sm text-ink-3">Sin presupuestos.</p></CardBody> : (
              <Table><thead><tr><Th>Presupuesto</Th><Th>Comunidad</Th><Th className="text-right">Total</Th><Th>Estado</Th></tr></thead>
                <tbody>{budgets.map((b) => <tr key={b.id} className="hover:bg-surface-2"><Td><Link href={`/presupuestos/${b.id}`} className="font-medium hover:text-brand">{b.code}</Link><span className="block text-xs text-ink-3">{b.concept}</span></Td><Td className="text-ink-2">{b.community_name}</Td><Td className="tabular text-right">{b.base_amount === null ? "—" : euros(b.total_amount)}</Td><Td><StatusBadge entity="presupuesto" status={b.status} /></Td></tr>)}</tbody>
              </Table>)}
          </Card>
          <Card><CardHeader title="Facturas" />
            {!invoices?.length ? <CardBody><p className="text-sm text-ink-3">Sin facturas.</p></CardBody> : (
              <Table><thead><tr><Th>Factura</Th><Th>Comunidad</Th><Th>Fecha</Th><Th className="text-right">Total</Th><Th>Estado</Th></tr></thead>
                <tbody>{invoices.map((f) => <tr key={f.id} className="hover:bg-surface-2"><Td><Link href={`/facturas/${f.id}`} className="font-medium hover:text-brand">{f.invoice_number}</Link></Td><Td className="text-ink-2">{f.community_name}</Td><Td className="text-ink-3">{fecha(f.invoice_date)}</Td><Td className="tabular text-right">{euros(f.total_amount)}</Td><Td><StatusBadge entity="factura" status={f.status} /></Td></tr>)}</tbody>
              </Table>)}
          </Card>
          <Card><CardHeader title="Incidencias en las que ha intervenido" />
            {!incidents?.length ? <CardBody><p className="text-sm text-ink-3">Sin incidencias.</p></CardBody> : (
              <Table><thead><tr><Th>Incidencia</Th><Th>Comunidad</Th><Th>Estado</Th></tr></thead>
                <tbody>{incidents.map((i) => <tr key={i.id} className="hover:bg-surface-2"><Td><Link href={`/incidencias/${i.id}`} className="font-medium hover:text-brand">{i.code}</Link><span className="block text-xs text-ink-3">{i.title}</span></Td><Td className="text-ink-2">{i.community_name}</Td><Td><StatusBadge entity="incidencia" status={i.status} /></Td></tr>)}</tbody>
              </Table>)}
          </Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Datos generales" /><CardBody><DataList className="sm:grid-cols-1" items={[["Empresa", p.company_name], ["NIF/CIF", p.tax_id], ["Persona de contacto", p.contact_person], ["Teléfono", p.phone], ["Correo", p.email], ["Dirección", p.address], ["Observaciones", p.notes]]} /></CardBody></Card>
          <Card><CardHeader title="Comunidades relacionadas" /><CardBody>
            {communities.size ? <ul className="space-y-1 text-sm">{[...communities].map(([cid, name]) => <li key={cid}><Link href={`/comunidades/${cid}`} className="text-brand hover:underline">{name}</Link></li>)}</ul> : <EmptyState title="Sin comunidades" />}
          </CardBody></Card>
          <Card><CardHeader title="Documentación" /><CardBody><DocumentList docs={(docs ?? []) as unknown as DocRow[]} /></CardBody></Card>
        </div>
      </div>
    </div>
  );
}
