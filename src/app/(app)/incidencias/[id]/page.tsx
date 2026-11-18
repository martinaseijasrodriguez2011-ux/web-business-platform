import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, FileText, Receipt, ShieldAlert, ListChecks, Plus, CalendarPlus } from "lucide-react";
import { Card, CardBody, CardHeader, DataList, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormModal } from "@/components/ui/form-modal";
import { Table, Td, Th } from "@/components/ui/table";
import { Timeline, type ActivityRow } from "@/components/shared/timeline";
import { TaskList, type TaskRow } from "@/components/shared/task-list";
import { DocumentList, DOC_SELECT, type DocRow } from "@/components/shared/document-list";
import { UploadModal } from "@/components/shared/upload-modal";
import { ActivityModal } from "@/components/shared/activity-modal";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStaffOptions, getStatusLabels } from "@/lib/queries";
import { ahoraLocal, euros, fecha, fechaHora, hoyISO } from "@/lib/format";
import { addActivity, addTask, applyChecklist, changeIncidentStatus } from "../actions";
import { addCalendarEvent } from "@/app/(app)/calendario/actions";
import { CALENDAR_KIND } from "@/lib/labels";
import { signedUrl } from "@/lib/storage";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("incidents").select("code").eq("id", id).maybeSingle();
  return { title: data?.code ?? "Incidencia" };
}

export default async function IncidenciaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creada?: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const { creada } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();

  const { data: inc } = await supabase.from("incidents_view").select("*").eq("id", id).maybeSingle();
  if (!inc) notFound();

  const [{ data: canEdit }, activityRes, tasksRes, docsRes, budgetsRes, invoicesRes, claimsRes, templatesRes, staff, labels, eventsRes, providersRes, categoriesRes] = await Promise.all([
    supabase.rpc("can_edit_incident", { p_incident: id }),
    supabase.from("activity_view").select("*").eq("incident_id", id).order("occurred_at", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, title, done, done_at, due_on, notes, assignee_id, sort_order, assignee:staff!tasks_assignee_id_fkey(short_name), done_by_staff:staff!tasks_done_by_fkey(short_name)").eq("incident_id", id).order("sort_order"),
    supabase.from("documents").select(DOC_SELECT).eq("incident_id", id).order("created_at", { ascending: false }),
    supabase.from("budgets_view").select("*").eq("incident_id", id).order("created_at"),
    supabase.from("invoices_view").select("*").eq("incident_id", id).order("invoice_date"),
    supabase.from("claims").select("id, code, status, insurer, claim_number").eq("incident_id", id),
    supabase.from("checklist_templates").select("id, name, kind").eq("active", true).order("name"),
    getStaffOptions(),
    getStatusLabels("incidencia"),
    supabase.from("calendar_events").select("id, title, kind, starts_at, all_day").eq("incident_id", id).eq("cancelled", false).order("starts_at"),
    supabase.from("providers").select("id, trade_name"),
    supabase.from("categories").select("id, name"),
  ]);

  const tasks = (tasksRes.data ?? []) as unknown as TaskRow[];
  const docs = (docsRes.data ?? []) as unknown as DocRow[];
  const activity = (activityRes.data ?? []) as ActivityRow[];
  const budgets = budgetsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const pending = tasks.filter((t) => !t.done);
  const today = hoyISO();
  const resolve: Record<string, string> = {};
  for (const s of staff) resolve[s.id] = s.full_name;
  for (const p of providersRes.data ?? []) resolve[p.id] = p.trade_name;
  for (const c of categoriesRes.data ?? []) resolve[c.id] = c.name;
  for (const [k, v] of Object.entries(labels.map)) resolve[k] = v.label;
  const docUrls: Record<string, string | null> = {};
  await Promise.all(docs.slice(0, 30).map(async (d) => { docUrls[d.id] = await signedUrl(d.storage_path); }));

  const nextDates = [
    inc.planned_on && { label: "Actuación prevista", date: inc.planned_on },
    inc.due_on && { label: "Fecha límite", date: inc.due_on },
    inc.next_task_due && { label: "Próxima tarea", date: inc.next_task_due },
    ...(eventsRes.data ?? []).filter((e) => e.starts_at >= new Date().toISOString()).slice(0, 2).map((e) => ({ label: e.title, date: e.starts_at })),
  ].filter(Boolean) as { label: string; date: string }[];
  const editable = !!canEdit;
  const minBudget = budgets.filter((b) => b.status !== "rechazado" && b.status !== "cancelado" && b.base_amount !== null);

  return (
    <div>
      <PageHeader
        back={<Link href="/incidencias" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Incidencias</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><span className="tabular text-ink-3">{inc.code}</span><span>{inc.title}</span></span>}
        subtitle={
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge entity="incidencia" status={inc.status} custom={labels.map} />
            <PriorityBadge priority={inc.priority} />
            {inc.is_overdue && <Badge tone="rojo">Atrasada</Badge>}
            <span className="text-ink-3">·</span>
            <Link href={`/comunidades/${inc.community_id}`} className="text-ink-2 hover:text-brand">{inc.community_name}</Link>
            <span className="text-ink-3">· Gestora: {inc.manager_name ?? "sin asignar"} · Creada el {fechaHora(inc.created_at)} por {inc.created_by_name ?? "—"}</span>
          </span>
        }
        actions={
          <>
            {editable && <ButtonLink href={`/incidencias/${id}/editar`} variant="secondary"><Pencil size={16} /> Editar</ButtonLink>}
            <ActivityModal action={addActivity.bind(null, { incident_id: id })} nowLocal={ahoraLocal()} />
            <UploadModal links={{ incident_id: id, community_id: inc.community_id }} folder={`incidencias/${id}`} />
            {editable && (
              <FormModal trigger="Cambiar estado" title="Cambiar estado" triggerVariant="primary" action={changeIncidentStatus.bind(null, id)} submitLabel="Actualizar estado">
                <Field label="Nuevo estado" htmlFor="status" required>
                  <Select id="status" name="status" defaultValue={inc.status}>
                    {labels.list.filter((l) => l.active || l.key === inc.status).map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                  </Select>
                </Field>
                <Field label="Comentario" htmlFor="comment" hint="Obligatorio para cerrar o cancelar.">
                  <Textarea id="comment" name="comment" rows={3} />
                </Field>
                <label className="flex items-start gap-2 text-sm text-ink-2">
                  <input type="checkbox" name="confirm_close" className="mt-1" />
                  Si cierro la incidencia, confirmo que he revisado el resultado de la actuación.
                </label>
              </FormModal>
            )}
          </>
        }
      />

      {creada && <div className="mb-4"><Alert tone="verde">Incidencia {inc.code} registrada correctamente.</Alert></div>}
      {!editable && <div className="mb-4"><Alert tone="azul">Puede consultar esta incidencia y registrar actuaciones. La modificación corresponde a la gestora responsable o a Dirección/Coordinación.</Alert></div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Resumen" />
            <CardBody className="space-y-5">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-3">Qué ha pasado</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-ink">{inc.description || <span className="text-ink-3">Sin descripción.</span>}</p>
              </div>
              <DataList items={[
                ["Quién lo ha comunicado", [inc.reporter_name, inc.reporter_unit].filter(Boolean).join(" · ") || null],
                ["Contacto", inc.reporter_contact],
                ["Dónde", inc.community_name],
                ["Quién lo gestiona", inc.manager_name],
                ["Categoría", [inc.category_name, inc.subcategory_name].filter(Boolean).join(" › ") || null],
                ["Proveedor", inc.provider_id ? <Link href={`/proveedores/${inc.provider_id}`} className="text-brand hover:underline">{inc.provider_name}</Link> : null],
                ["Fecha de comunicación", fecha(inc.communicated_on)],
                ["Observaciones", inc.notes],
              ]} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-surface-2 p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-ink-3">Qué falta por hacer</h3>
                  {pending.length ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {pending.slice(0, 4).map((t) => <li key={t.id} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--naranja-dot)]" />{t.title}</li>)}
                      {pending.length > 4 && <li className="text-xs text-ink-3">y {pending.length - 4} tareas más</li>}
                    </ul>
                  ) : <p className="mt-2 text-sm text-ink-3">{tasks.length ? "Todas las tareas completadas." : "Sin tareas definidas."}</p>}
                </div>
                <div className="rounded-lg bg-surface-2 p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-ink-3">Próximas fechas</h3>
                  {nextDates.length ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {nextDates.map((d, i) => <li key={i} className="flex justify-between gap-2"><span className="text-ink-2">{d.label}</span><span className={`tabular ${d.date.slice(0, 10) < today ? "font-medium text-[var(--rojo-fg)]" : ""}`}>{d.date.length > 10 ? fechaHora(d.date) : fecha(d.date)}</span></li>)}
                    </ul>
                  ) : <p className="mt-2 text-sm text-ink-3">Sin fechas programadas.</p>}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Checklist de trabajo"
              subtitle="Completar el checklist no cierra la incidencia: el cierre se confirma manualmente."
              actions={editable && <>
                {templatesRes.data?.length ? (
                  <FormModal trigger={<><ListChecks size={16} /> Aplicar plantilla</>} triggerSize="sm" title="Aplicar plantilla de checklist" action={applyChecklist.bind(null, { incident_id: id })} submitLabel="Aplicar">
                    <Field label="Plantilla" htmlFor="template_id" required>
                      <Select id="template_id" name="template_id">{templatesRes.data.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
                    </Field>
                    <p className="text-xs text-ink-3">Las tareas se añaden a las existentes y se asignan a la gestora responsable.</p>
                  </FormModal>
                ) : null}
                <FormModal trigger={<><Plus size={16} /> Tarea</>} triggerSize="sm" title="Nueva tarea" action={addTask.bind(null, { incident_id: id })} submitLabel="Añadir">
                  <Field label="Tarea" htmlFor="title" required><Input id="title" name="title" required /></Field>
                  <Field label="Responsable" htmlFor="assignee_id">
                    <Select id="assignee_id" name="assignee_id" defaultValue={inc.manager_id ?? ""}>
                      <option value="">Sin asignar</option>
                      {staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Fecha límite" htmlFor="due_on"><Input id="due_on" name="due_on" type="date" /></Field>
                  <Field label="Comentarios" htmlFor="notes"><Textarea id="notes" name="notes" rows={2} /></Field>
                </FormModal>
              </>}
            />
            <CardBody>
              {tasks.length ? <TaskList tasks={tasks} staff={staff.filter((s) => s.active)} canEdit={editable} meId={me.id} today={today} />
                : <EmptyState title="Sin tareas" description={editable ? "Aplique la plantilla de reparación o añada tareas manualmente." : "La gestora responsable todavía no ha definido tareas."} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Presupuestos"
              subtitle={budgets.length > 1 ? "Comparativa de presupuestos. La elección corresponde a las personas autorizadas." : undefined}
              actions={<ButtonLink href={`/presupuestos/nuevo?incidencia=${id}`} size="sm" variant="secondary"><FileText size={16} /> Crear presupuesto</ButtonLink>}
            />
            {budgets.length ? (
              <Table>
                <thead><tr><Th>Presupuesto</Th><Th>Proveedor</Th><Th className="text-right">Base</Th><Th className="text-right">Total</Th><Th>Plazo</Th><Th>Validez</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  {budgets.map((b) => (
                    <tr key={b.id} className={b.selected ? "bg-[var(--verde-bg)]/40" : "hover:bg-surface-2"}>
                      <Td><Link href={`/presupuestos/${b.id}`} className="font-medium text-ink hover:text-brand">{b.code}</Link><span className="block max-w-[220px] truncate text-xs text-ink-3">{b.concept}</span></Td>
                      <Td className="text-ink-2">{b.provider_name ?? "—"}</Td>
                      <Td className="tabular text-right">{euros(b.base_amount)}</Td>
                      <Td className="tabular text-right font-medium">
                        {euros(b.total_amount)}
                        {minBudget.length > 1 && b.base_amount !== null && Number(b.total_amount) === Math.min(...minBudget.map((x) => Number(x.total_amount))) && <span className="block text-xs font-normal text-ink-3">el más económico</span>}
                      </Td>
                      <Td className="text-ink-2">{b.execution_term ?? "—"}</Td>
                      <Td className="text-ink-2">{fecha(b.valid_until)}</Td>
                      <Td><div className="flex flex-col items-start gap-1"><StatusBadge entity="presupuesto" status={b.status} />{b.selected && <Badge tone="verde" dot={false}>Seleccionado</Badge>}</div></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : <CardBody><p className="text-sm text-ink-3">No hay presupuestos asociados.</p></CardBody>}
          </Card>

          <Card>
            <CardHeader title="Facturas" actions={<ButtonLink href={`/facturas/nueva?incidencia=${id}`} size="sm" variant="secondary"><Receipt size={16} /> Registrar factura</ButtonLink>} />
            {invoices.length ? (
              <Table>
                <thead><tr><Th>Factura</Th><Th>Proveedor</Th><Th>Fecha</Th><Th className="text-right">Total</Th><Th className="text-right">Pagado</Th><Th>Estado</Th></tr></thead>
                <tbody>
                  {invoices.map((f) => (
                    <tr key={f.id} className="hover:bg-surface-2">
                      <Td><Link href={`/facturas/${f.id}`} className="font-medium text-ink hover:text-brand">{f.invoice_number}</Link></Td>
                      <Td className="text-ink-2">{f.provider_name}</Td>
                      <Td className="text-ink-2">{fecha(f.invoice_date)}</Td>
                      <Td className="tabular text-right font-medium">{euros(f.total_amount)}</Td>
                      <Td className="tabular text-right">{euros(f.paid_amount)}</Td>
                      <Td><StatusBadge entity="factura" status={f.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : <CardBody><p className="text-sm text-ink-3">No hay facturas asociadas.</p></CardBody>}
          </Card>

          <Card>
            <CardHeader title="Cronología" subtitle="Historial completo e inalterable de la incidencia." />
            <CardBody><Timeline items={activity} resolve={resolve} docUrls={docUrls} /></CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Documentos" subtitle={`${docs.filter((d) => !d.archived_at).length} archivo(s)`} actions={<UploadModal links={{ incident_id: id, community_id: inc.community_id }} folder={`incidencias/${id}`} label="Añadir" triggerSize="sm" />} />
            <CardBody><DocumentList docs={docs} /></CardBody>
          </Card>

          <Card>
            <CardHeader title="Agenda" actions={
              <FormModal trigger={<><CalendarPlus size={16} /> Programar</>} triggerSize="sm" title="Programar en el calendario" action={addCalendarEvent.bind(null, { incident_id: id, community_id: inc.community_id })} submitLabel="Guardar">
                <Field label="Tipo" htmlFor="kind"><Select id="kind" name="kind" defaultValue="reparacion">{Object.entries(CALENDAR_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                <Field label="Título" htmlFor="title" required><Input id="title" name="title" required defaultValue={`${inc.code} · ${inc.title}`} /></Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Inicio" htmlFor="starts_at" required><Input id="starts_at" name="starts_at" type="datetime-local" required /></Field>
                  <Field label="Fin" htmlFor="ends_at"><Input id="ends_at" name="ends_at" type="datetime-local" /></Field>
                </div>
                <Field label="Responsable" htmlFor="staff_id"><Select id="staff_id" name="staff_id" defaultValue={inc.manager_id ?? ""}><option value="">—</option>{staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select></Field>
                <Field label="Notas" htmlFor="notes"><Textarea id="notes" name="notes" rows={2} /></Field>
              </FormModal>
            } />
            <CardBody>
              {eventsRes.data?.length ? (
                <ul className="space-y-2 text-sm">
                  {eventsRes.data.map((e) => <li key={e.id} className="flex justify-between gap-2"><span>{e.title}<span className="block text-xs text-ink-3">{CALENDAR_KIND[e.kind]}</span></span><span className="tabular shrink-0 text-ink-2">{e.all_day ? fecha(e.starts_at) : fechaHora(e.starts_at)}</span></li>)}
                </ul>
              ) : <p className="text-sm text-ink-3">Sin eventos programados.</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Siniestro" actions={!claimsRes.data?.length && <ButtonLink href={`/siniestros/nuevo?incidencia=${id}`} size="sm" variant="secondary"><ShieldAlert size={16} /> Abrir siniestro</ButtonLink>} />
            <CardBody>
              {claimsRes.data?.length ? claimsRes.data.map((c) => (
                <Link key={c.id} href={`/siniestros/${c.id}`} className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-surface-2">
                  <span><span className="font-medium">{c.code}</span><span className="block text-xs text-ink-3">{c.insurer ?? "Aseguradora pendiente"}{c.claim_number ? ` · Exp. ${c.claim_number}` : ""}</span></span>
                  <StatusBadge entity="siniestro" status={c.status} />
                </Link>
              )) : <p className="text-sm text-ink-3">Si la incidencia afecta a un seguro, abra un expediente de siniestro.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
