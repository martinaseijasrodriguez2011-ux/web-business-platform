import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus, UserPlus, Link2, FileText, Receipt } from "lucide-react";
import { Card, CardBody, CardHeader, DataList, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Table, Td, Th } from "@/components/ui/table";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormModal } from "@/components/ui/form-modal";
import { Timeline, type ActivityRow } from "@/components/shared/timeline";
import { DocumentList, DOC_SELECT, type DocRow } from "@/components/shared/document-list";
import { UploadModal } from "@/components/shared/upload-modal";
import { ActivityModal } from "@/components/shared/activity-modal";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getProviderOptions, getStaffOptions, getStatusLabels } from "@/lib/queries";
import { ahoraLocal, euros, fecha, haceTiempo } from "@/lib/format";
import { addContact, linkProvider } from "../actions";
import { addActivity } from "@/app/(app)/incidencias/actions";
import type { IncidentStatus } from "@/lib/types";
import type { Database } from "@/lib/database.types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("communities").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Comunidad" };
}

const TABS = ["resumen", "incidencias", "presupuestos", "facturas", "proveedores", "documentacion", "historial"] as const;
const INC_FILTERS: Record<string, { label: string; statuses?: IncidentStatus[]; overdue?: boolean; open?: boolean }> = {
  abiertas: { label: "Abiertas", open: true },
  pendientes: { label: "Pendientes", statuses: ["nueva", "pendiente_revision", "pendiente_proveedor", "pendiente_aprobacion", "factura_pendiente", "pendiente_pago"] },
  en_curso: { label: "En curso", statuses: ["en_curso", "presupuesto_solicitado", "presupuesto_recibido", "aprobada", "reparacion_programada", "reparacion_realizada"] },
  atrasadas: { label: "Atrasadas", overdue: true },
  resueltas: { label: "Resueltas", statuses: ["resuelta"] },
  cerradas: { label: "Cerradas", statuses: ["cerrada", "cancelada"] },
  todas: { label: "Todas" },
};

export default async function ComunidadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab! : "resumen";
  const supabase = await createClient();
  const { data: c } = await supabase.from("communities_view").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const [{ data: canEdit }, counts] = await Promise.all([
    supabase.rpc("can_edit_community", { p_community: id }),
    Promise.all([
      supabase.from("incidents").select("id", { count: "exact", head: true }).eq("community_id", id),
      supabase.from("budgets").select("id", { count: "exact", head: true }).eq("community_id", id),
      supabase.from("invoices").select("id", { count: "exact", head: true }).eq("community_id", id),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("community_id", id).is("archived_at", null),
    ]),
  ]);
  const [ci, cb, cf, cd] = counts.map((r) => r.count ?? 0);
  const editable = !!canEdit;

  return (
    <div>
      <PageHeader
        back={<Link href="/comunidades" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Comunidades</Link>}
        title={c.name}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="tabular">{c.code}</span><span>·</span><span>{[c.address, c.postal_code, c.city].filter(Boolean).join(", ") || "Dirección pendiente"}</span><span>·</span>
          <span>Gestora: {c.manager_name ?? <Badge tone="naranja">Pendiente de asignar</Badge>}</span>
          {c.parent_id && <span>· Subcomunidad de <Link href={`/comunidades/${c.parent_id}`} className="text-brand hover:underline">{c.parent_name}</Link></span>}{!c.active && <Badge tone="gris">De baja</Badge>}</span>}
        actions={<>
          {editable && <ButtonLink href={`/comunidades/${id}/editar`} variant="secondary"><Pencil size={16} /> Editar</ButtonLink>}
          <ActivityModal action={addActivity.bind(null, { community_id: id })} nowLocal={ahoraLocal()} />
          <ButtonLink href={`/incidencias/nueva?comunidad=${id}`}><Plus size={16} /> Nueva incidencia</ButtonLink>
        </>}
      />
      <div className="mb-6">
        <Tabs basePath={`/comunidades/${id}`} active={tab} tabs={[
          { key: "resumen", label: "Resumen" }, { key: "incidencias", label: "Incidencias", count: ci },
          { key: "presupuestos", label: "Presupuestos", count: cb }, { key: "facturas", label: "Facturas y pagos", count: cf },
          { key: "proveedores", label: "Proveedores" }, { key: "documentacion", label: "Documentación", count: cd }, { key: "historial", label: "Historial" },
        ]} />
      </div>
      {tab === "resumen" && <Resumen id={id} c={c} editable={editable} />}
      {tab === "incidencias" && <Incidencias id={id} filter={sp.f ?? "abiertas"} categoria={sp.categoria} proveedor={sp.proveedor} desde={sp.desde} />}
      {tab === "presupuestos" && <Presupuestos id={id} />}
      {tab === "facturas" && <Facturas id={id} />}
      {tab === "proveedores" && <Proveedores id={id} editable={editable} />}
      {tab === "documentacion" && <Documentacion id={id} />}
      {tab === "historial" && <Historial id={id} />}
    </div>
  );
}

type CommunityView = Database["public"]["Views"]["communities_view"]["Row"];

async function Resumen({ id, c, editable }: { id: string; c: CommunityView; editable: boolean }) {
  const supabase = await createClient();
  const [{ data: contacts }, { data: subs }] = await Promise.all([
    supabase.from("community_contacts").select("*").eq("community_id", id).order("created_at"),
    supabase.from("communities_view").select("id, name, code, manager_name, open_incidents").eq("parent_id", id).order("code"),
  ]);
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader title="Información general" />
        <CardBody>
          <DataList items={[
            ["Nombre", c.name], ["Código interno", c.code], ["Dirección", c.address], ["Código postal", c.postal_code], ["Población", c.city],
            ["Gestora responsable", c.manager_name ?? "Pendiente de asignar"],
            ["Comunidad general", c.parent_id ? <Link key="p" href={`/comunidades/${c.parent_id}`} className="text-brand hover:underline">{c.parent_name} ({c.parent_code})</Link> : (c.subcommunities ?? 0) > 0 ? `Es comunidad general de ${c.subcommunities} subcomunidades` : null], ["Presidente/a", c.president_name], ["Contacto del presidente/a", c.president_contact],
            ["Fecha de alta", fecha(c.registered_on)], ["Última actividad", haceTiempo(c.last_activity_at)], ["Observaciones", c.notes],
          ]} />
          {(subs?.length ?? 0) > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Subcomunidades ({subs!.length})</h3>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {subs!.map((s) => (
                  <li key={s.id}><Link href={`/comunidades/${s.id}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface-2">
                    <span><span className="font-medium">{s.name}</span><span className="text-ink-3"> · {s.code} · {s.manager_name ?? "sin gestora"}</span></span>
                    <span className="tabular text-xs text-ink-3">{s.open_incidents} abiertas</span>
                  </Link></li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Abiertas", c.open_incidents], ["Atrasadas", c.overdue_incidents], ["Urgentes", c.urgent_incidents], ["Cerradas", c.closed_incidents]].map(([k, v]) => (
              <div key={k as string} className="rounded-lg bg-surface-2 p-3"><p className="text-xs text-ink-3">{k as string}</p><p className="tabular text-xl font-semibold">{v as number}</p></div>
            ))}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Contactos" actions={editable && (
          <FormModal trigger={<><UserPlus size={16} /> Añadir</>} triggerSize="sm" title="Nuevo contacto" action={addContact.bind(null, id)} submitLabel="Guardar">
            <Field label="Nombre" htmlFor="name" required><Input id="name" name="name" required /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cargo o relación" htmlFor="role"><Input id="role" name="role" placeholder="Vicepresidente, conserje…" /></Field>
              <Field label="Piso y puerta" htmlFor="unit"><Input id="unit" name="unit" /></Field>
              <Field label="Teléfono" htmlFor="phone"><Input id="phone" name="phone" type="tel" /></Field>
              <Field label="Correo" htmlFor="email"><Input id="email" name="email" type="email" /></Field>
            </div>
            <Field label="Observaciones" htmlFor="notes"><Textarea id="notes" name="notes" rows={2} /></Field>
          </FormModal>
        )} />
        <CardBody>
          {contacts?.length ? (
            <ul className="divide-y divide-line">
              {contacts.map((ct) => (
                <li key={ct.id} className="py-2.5 text-sm">
                  <p className="font-medium">{ct.name}{ct.role && <span className="font-normal text-ink-3"> · {ct.role}</span>}</p>
                  <p className="text-xs text-ink-3">{[ct.unit, ct.phone, ct.email].filter(Boolean).join(" · ")}</p>
                  {ct.notes && <p className="text-xs text-ink-2">{ct.notes}</p>}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-3">No hay contactos registrados.</p>}
        </CardBody>
      </Card>
    </div>
  );
}

async function Incidencias({ id, filter, categoria, proveedor, desde }: { id: string; filter: string; categoria?: string; proveedor?: string; desde?: string }) {
  const supabase = await createClient();
  const f = INC_FILTERS[filter] ?? INC_FILTERS.abiertas;
  let q = supabase.from("incidents_view").select("*").eq("community_id", id).order("created_at", { ascending: false });
  if (f.open) q = q.eq("is_open", true);
  if (f.overdue) q = q.eq("is_overdue", true);
  if (f.statuses) q = q.in("status", f.statuses);
  if (categoria) q = q.eq("category_id", categoria);
  if (proveedor) q = q.eq("provider_id", proveedor);
  if (desde) q = q.gte("created_at", desde);
  const [{ data }, labels, categories, providers] = await Promise.all([q, getStatusLabels("incidencia"), getCategories("incidencia"), getProviderOptions()]);
  const base = `/comunidades/${id}?tab=incidencias`;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        {Object.entries(INC_FILTERS).map(([k, v]) => (
          <Link key={k} href={`${base}&f=${k}`} className={`rounded-full border px-3 py-1 text-sm ${filter === k ? "border-brand bg-brand text-white" : "border-line text-ink-2 hover:border-line-strong"}`}>{v.label}</Link>
        ))}
        <form className="ml-auto flex flex-wrap gap-2" action={`/comunidades/${id}`}>
          <input type="hidden" name="tab" value="incidencias" /><input type="hidden" name="f" value={filter} />
          <Select name="categoria" defaultValue={categoria ?? ""} className="w-40" aria-label="Categoría"><option value="">Categoría</option>{categories.filter((c) => !c.parent_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select name="proveedor" defaultValue={proveedor ?? ""} className="w-40" aria-label="Proveedor"><option value="">Proveedor</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
          <Input name="desde" type="date" defaultValue={desde ?? ""} className="w-40" aria-label="Desde" title="Creadas desde" />
          <button className="h-10 rounded-lg border border-line-strong px-3 text-sm">Aplicar</button>
        </form>
      </div>
      {!data?.length ? <EmptyState title="Sin incidencias con este filtro" /> : (
        <Table>
          <thead><tr><Th>Incidencia</Th><Th>Estado</Th><Th>Prioridad</Th><Th>Categoría</Th><Th>Gestora</Th><Th>Creada</Th></tr></thead>
          <tbody>{data.map((i) => (
            <tr key={i.id} className="hover:bg-surface-2">
              <Td><Link href={`/incidencias/${i.id}`} className="font-medium hover:text-brand"><span className="tabular block text-xs text-ink-3">{i.code}</span>{i.title}</Link></Td>
              <Td><div className="flex flex-col items-start gap-1"><StatusBadge entity="incidencia" status={i.status} custom={labels.map} />{i.is_overdue && <Badge tone="rojo">Atrasada</Badge>}</div></Td>
              <Td><PriorityBadge priority={i.priority} /></Td>
              <Td className="text-ink-2">{i.category_name ?? "—"}</Td>
              <Td className="text-ink-2">{i.manager_name ?? "—"}</Td>
              <Td className="text-ink-3">{fecha(i.created_at)}</Td>
            </tr>))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function Presupuestos({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("budgets_view").select("*").eq("community_id", id).order("created_at", { ascending: false });
  return (
    <Card>
      <CardHeader title="Presupuestos" actions={<ButtonLink href={`/presupuestos/nuevo?comunidad=${id}`} size="sm" variant="secondary"><FileText size={16} /> Nuevo presupuesto</ButtonLink>} />
      {!data?.length ? <EmptyState title="Sin presupuestos" /> : (
        <Table>
          <thead><tr><Th>Presupuesto</Th><Th>Incidencia</Th><Th>Proveedor</Th><Th className="text-right">Total</Th><Th>Estado</Th><Th>Fecha</Th></tr></thead>
          <tbody>{data.map((b) => (
            <tr key={b.id} className="hover:bg-surface-2">
              <Td><Link href={`/presupuestos/${b.id}`} className="font-medium hover:text-brand">{b.code}</Link><span className="block text-xs text-ink-3">{b.concept}</span></Td>
              <Td>{b.incident_id ? <Link href={`/incidencias/${b.incident_id}`} className="text-ink-2 hover:text-brand">{b.incident_code}</Link> : "—"}</Td>
              <Td className="text-ink-2">{b.provider_name ?? "—"}</Td>
              <Td className="tabular text-right font-medium">{euros(b.total_amount)}</Td>
              <Td><StatusBadge entity="presupuesto" status={b.status} /></Td>
              <Td className="text-ink-3">{fecha(b.received_on ?? b.requested_on ?? b.created_at)}</Td>
            </tr>))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function Facturas({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("invoices_view").select("*").eq("community_id", id).order("invoice_date", { ascending: false });
  const total = (data ?? []).reduce((a, f) => a + Number(f.total_amount), 0);
  const paid = (data ?? []).reduce((a, f) => a + Number(f.paid_amount), 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Gasto facturado", euros(total)], ["Pagado", euros(paid)], ["Pendiente de pago", euros(total - paid)]].map(([k, v]) => (
          <Card key={k} className="p-4"><p className="text-sm text-ink-3">{k}</p><p className="tabular mt-1 text-xl font-semibold">{v}</p></Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Facturas y pagos" actions={<ButtonLink href={`/facturas/nueva?comunidad=${id}`} size="sm" variant="secondary"><Receipt size={16} /> Registrar factura</ButtonLink>} />
        {!data?.length ? <EmptyState title="Sin facturas" /> : (
          <Table>
            <thead><tr><Th>Factura</Th><Th>Proveedor</Th><Th>Fecha</Th><Th className="text-right">Total</Th><Th className="text-right">Pagado</Th><Th>Estado</Th></tr></thead>
            <tbody>{data.map((f) => (
              <tr key={f.id} className="hover:bg-surface-2">
                <Td><Link href={`/facturas/${f.id}`} className="font-medium hover:text-brand">{f.invoice_number}</Link>{f.incident_code && <span className="block text-xs text-ink-3">{f.incident_code}</span>}</Td>
                <Td className="text-ink-2">{f.provider_name}</Td><Td className="text-ink-3">{fecha(f.invoice_date)}</Td>
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

async function Proveedores({ id, editable }: { id: string; editable: boolean }) {
  const supabase = await createClient();
  const [{ data: linked }, { data: fromIncidents }, { data: fromBudgets }, { data: fromInvoices }, providers] = await Promise.all([
    supabase.from("community_providers").select("service, provider:providers(id, trade_name, phone, email)").eq("community_id", id),
    supabase.from("incidents").select("provider:providers(id, trade_name, phone, email)").eq("community_id", id).not("provider_id", "is", null),
    supabase.from("budgets").select("provider:providers(id, trade_name, phone, email)").eq("community_id", id).not("provider_id", "is", null),
    supabase.from("invoices").select("total_amount, provider:providers(id, trade_name, phone, email)").eq("community_id", id),
    getProviderOptions(),
  ]);
  type P = { id: string; trade_name: string; phone: string | null; email: string | null };
  const map = new Map<string, { p: P; service?: string | null; spent: number; sources: Set<string> }>();
  const add = (p: P | null, source: string, spent = 0, service?: string | null) => {
    if (!p) return;
    const e = map.get(p.id) ?? { p, spent: 0, sources: new Set<string>() };
    e.spent += spent; e.sources.add(source); if (service) e.service = service;
    map.set(p.id, e);
  };
  for (const l of linked ?? []) add(l.provider as P, "Habitual", 0, l.service);
  for (const i of fromIncidents ?? []) add(i.provider as P, "Incidencias");
  for (const b of fromBudgets ?? []) add(b.provider as P, "Presupuestos");
  for (const f of fromInvoices ?? []) add(f.provider as P, "Facturas", Number(f.total_amount));
  const rows = [...map.values()].sort((a, b) => b.spent - a.spent);
  return (
    <Card>
      <CardHeader title="Proveedores de la comunidad" subtitle="Proveedores habituales y los que han intervenido en incidencias, presupuestos o facturas."
        actions={editable && providers.length > 0 && (
          <FormModal trigger={<><Link2 size={16} /> Vincular proveedor habitual</>} triggerSize="sm" title="Vincular proveedor habitual" action={linkProvider.bind(null, id)} submitLabel="Vincular">
            <Field label="Proveedor" htmlFor="provider_id" required><Select id="provider_id" name="provider_id">{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <Field label="Servicio" htmlFor="service"><Input id="service" name="service" placeholder="Mantenimiento de ascensor, limpieza…" /></Field>
          </FormModal>
        )} />
      {!rows.length ? <EmptyState title="Sin proveedores vinculados" /> : (
        <Table>
          <thead><tr><Th>Proveedor</Th><Th>Contacto</Th><Th>Relación</Th><Th className="text-right">Facturado</Th></tr></thead>
          <tbody>{rows.map(({ p, service, spent, sources }) => (
            <tr key={p.id} className="hover:bg-surface-2">
              <Td><Link href={`/proveedores/${p.id}`} className="font-medium hover:text-brand">{p.trade_name}</Link>{service && <span className="block text-xs text-ink-3">{service}</span>}</Td>
              <Td className="text-ink-2">{[p.phone, p.email].filter(Boolean).join(" · ") || "—"}</Td>
              <Td className="text-xs text-ink-3">{[...sources].join(", ")}</Td>
              <Td className="tabular text-right">{euros(spent)}</Td>
            </tr>))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

async function Documentacion({ id }: { id: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select(DOC_SELECT).eq("community_id", id).order("created_at", { ascending: false });
  return (
    <Card>
      <CardHeader title="Documentación" subtitle="Actas, contratos, presupuestos, facturas, informes, fotografías y documentos Word/Excel de la comunidad y de sus incidencias."
        actions={<UploadModal links={{ community_id: id }} folder={`comunidades/${id}`} label="Añadir documento" triggerSize="sm" />} />
      <CardBody><DocumentList docs={(data ?? []) as unknown as DocRow[]} /></CardBody>
    </Card>
  );
}

async function Historial({ id }: { id: string }) {
  const supabase = await createClient();
  const [{ data }, staff] = await Promise.all([
    supabase.from("activity_view").select("*").eq("community_id", id).order("occurred_at", { ascending: false }).limit(300),
    getStaffOptions(),
  ]);
  const resolve = Object.fromEntries(staff.map((s) => [s.id, s.full_name]));
  return (
    <Card>
      <CardHeader title="Historial de la comunidad" subtitle="Cronología completa de actuaciones, incidencias, presupuestos, facturas y pagos." />
      <CardBody><Timeline items={(data ?? []) as ActivityRow[]} resolve={resolve} showContext /></CardBody>
    </Card>
  );
}
