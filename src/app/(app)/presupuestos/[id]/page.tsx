import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Receipt, CheckCircle2, ShieldAlert, XCircle, BadgeCheck, Inbox } from "lucide-react";
import { Card, CardBody, CardHeader, DataList, EmptyState, PageHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormModal } from "@/components/ui/form-modal";
import { Table, Td, Th } from "@/components/ui/table";
import { DocumentList, DOC_SELECT, type DocRow } from "@/components/shared/document-list";
import { UploadModal } from "@/components/shared/upload-modal";
import { Timeline, type ActivityRow } from "@/components/shared/timeline";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStaffOptions } from "@/lib/queries";
import { euros, fecha, fechaHora, hoyISO } from "@/lib/format";
import { AUTH_KIND, AUTH_MEDIUM } from "@/lib/labels";
import { approveBudget, markReceived, registerPresidentAuthorization, rejectBudget, requestSuperior } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("budgets").select("code").eq("id", id).maybeSingle();
  return { title: data?.code ?? "Presupuesto" };
}

type Check = { total: number; status: string; is_supervisor: boolean; is_responsible: boolean; my_limit: number | null; has_president_authorization: boolean; can_approve: boolean; needs_superior: boolean };

export default async function PresupuestoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: b } = await supabase.from("budgets_view").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();
  const [{ data: checkRaw }, { data: canEdit }, { data: auths }, { data: docs }, { data: siblings }, { data: invoices }, { data: activity }, staff] = await Promise.all([
    supabase.rpc("budget_approval_check", { p_budget: id }),
    supabase.rpc("can_edit_budget", { p_budget: id }),
    supabase.from("budget_authorizations").select("*, staff:staff!budget_authorizations_staff_id_fkey(short_name), registrar:staff!budget_authorizations_registered_by_fkey(short_name), document:documents(file_name)").eq("budget_id", id).order("created_at"),
    supabase.from("documents").select(DOC_SELECT).eq("budget_id", id).order("created_at", { ascending: false }),
    b.incident_id ? supabase.from("budgets_view").select("id, code, provider_name, total_amount, base_amount, execution_term, valid_until, conditions, status, selected").eq("incident_id", b.incident_id).order("created_at") : Promise.resolve({ data: [] as never[] }),
    supabase.from("invoices_view").select("id, invoice_number, total_amount, paid_amount, status, invoice_date").eq("budget_id", id),
    supabase.from("activity_view").select("*").eq("budget_id", id).order("occurred_at", { ascending: false }),
    getStaffOptions(),
  ]);
  const check = checkRaw as Check;
  const editable = !!canEdit;
  const pendingApproval = ["solicitado", "recibido", "pendiente_autorizacion"].includes(b.status);
  const docRows = (docs ?? []) as unknown as DocRow[];
  const resolve = Object.fromEntries(staff.map((s) => [s.id, s.full_name]));

  return (
    <div>
      <PageHeader
        back={<Link href={b.incident_id ? `/incidencias/${b.incident_id}` : "/presupuestos"} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> {b.incident_code ?? "Presupuestos"}</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><span className="tabular text-ink-3">{b.code}</span>{b.concept}</span>}
        subtitle={<span className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge entity="presupuesto" status={b.status} />{b.selected && <Badge tone="verde" dot={false}>Seleccionado</Badge>}
          {b.requires_superior && b.status === "pendiente_autorizacion" && <Badge tone="naranja">Requiere autorización superior</Badge>}
          <span>· {b.community_name} · Responsable: {b.responsible_name ?? "sin asignar"}</span></span>}
        actions={<>
          {editable && b.status !== "aprobado" && <ButtonLink href={`/presupuestos/${id}/editar`} variant="secondary"><Pencil size={16} /> Editar</ButtonLink>}
          <UploadModal links={{ budget_id: id, incident_id: b.incident_id, community_id: b.community_id }} folder={`presupuestos/${id}`} defaultType="presupuesto" />
          {b.status === "aprobado" && <ButtonLink href={`/facturas/nueva?presupuesto=${id}`}><Receipt size={16} /> Registrar factura</ButtonLink>}
        </>}
      />

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos del presupuesto" />
            <CardBody className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-surface-2 p-4"><p className="text-xs text-ink-3">Base imponible</p><p className="tabular text-lg font-semibold">{euros(b.base_amount)}</p></div>
                <div className="rounded-lg bg-surface-2 p-4"><p className="text-xs text-ink-3">IVA ({Number(b.vat_rate)} %)</p><p className="tabular text-lg font-semibold">{b.base_amount === null ? "—" : euros(b.vat_amount)}</p></div>
                <div className="rounded-lg bg-brand-soft p-4"><p className="text-xs text-ink-3">Total</p><p className="tabular text-lg font-semibold text-brand">{b.base_amount === null ? "—" : euros(b.total_amount)}</p></div>
              </div>
              <DataList items={[
                ["Comunidad", <Link key="c" href={`/comunidades/${b.community_id}`} className="text-brand hover:underline">{b.community_name}</Link>],
                ["Incidencia", b.incident_id ? <Link key="i" href={`/incidencias/${b.incident_id}`} className="text-brand hover:underline">{b.incident_code} · {b.incident_title}</Link> : null],
                ["Proveedor", b.provider_id ? <Link key="p" href={`/proveedores/${b.provider_id}`} className="text-brand hover:underline">{b.provider_name}</Link> : null],
                ["Fecha de solicitud", fecha(b.requested_on)], ["Fecha de recepción", fecha(b.received_on)], ["Validez", fecha(b.valid_until)],
                ["Plazo de ejecución", b.execution_term], ["Condiciones", b.conditions], ["Descripción", b.description],
                ...(b.status === "aprobado" ? [["Aprobado por", `${b.approved_by_name} · ${fechaHora(b.approved_at)} · ${AUTH_KIND[b.approval_kind ?? ""] ?? ""}`] as [string, string]] : []),
                ...(b.rejected_reason ? [["Motivo del rechazo", b.rejected_reason] as [string, string]] : []),
              ]} />
            </CardBody>
          </Card>

          {(siblings?.length ?? 0) > 1 && (
            <Card>
              <CardHeader title="Comparativa con otros presupuestos de la incidencia" subtitle="El sistema no selecciona automáticamente ningún presupuesto." />
              <Table>
                <thead><tr><Th>Presupuesto</Th><Th>Proveedor</Th><Th className="text-right">Total</Th><Th>Plazo</Th><Th>Validez</Th><Th>Condiciones</Th><Th>Estado</Th></tr></thead>
                <tbody>{siblings!.map((s) => (
                  <tr key={s.id} className={s.id === id ? "bg-brand-soft" : "hover:bg-surface-2"}>
                    <Td><Link href={`/presupuestos/${s.id}`} className="font-medium hover:text-brand">{s.code}</Link></Td>
                    <Td className="text-ink-2">{s.provider_name ?? "—"}</Td>
                    <Td className="tabular text-right font-medium">{s.base_amount === null ? "—" : euros(s.total_amount)}</Td>
                    <Td className="text-ink-2">{s.execution_term ?? "—"}</Td><Td className="text-ink-2">{fecha(s.valid_until)}</Td>
                    <Td className="max-w-[200px] truncate text-xs text-ink-3">{s.conditions ?? "—"}</Td>
                    <Td><StatusBadge entity="presupuesto" status={s.status} /></Td>
                  </tr>))}
                </tbody>
              </Table>
            </Card>
          )}

          <Card>
            <CardHeader title="Registro de autorizaciones" subtitle="La autorización del presidente y la aprobación interna son registros distintos." />
            {!auths?.length ? <CardBody><p className="text-sm text-ink-3">Sin autorizaciones registradas.</p></CardBody> : (
              <Table>
                <thead><tr><Th>Tipo</Th><Th>Quién autoriza</Th><Th>Fecha</Th><Th className="text-right">Importe</Th><Th>Medio</Th><Th>Registrado por</Th></tr></thead>
                <tbody>{auths.map((a) => (
                  <tr key={a.id}>
                    <Td><Badge tone={a.kind === "presidente" ? "violeta" : "verde"} dot={false}>{AUTH_KIND[a.kind]}</Badge></Td>
                    <Td>{a.authorized_by_name ?? a.staff?.short_name}{a.notes && <span className="block text-xs text-ink-3">{a.notes}</span>}{a.document?.file_name && <span className="block text-xs text-ink-3">Justificante: {a.document.file_name}</span>}</Td>
                    <Td className="text-ink-2">{fecha(a.authorized_on)}</Td>
                    <Td className="tabular text-right">{euros(a.amount)}</Td>
                    <Td className="text-ink-2">{AUTH_MEDIUM[a.medium ?? ""] ?? "—"}</Td>
                    <Td className="text-xs text-ink-3">{a.registrar?.short_name} · {fechaHora(a.created_at)}</Td>
                  </tr>))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card><CardHeader title="Historial del presupuesto" /><CardBody><Timeline items={(activity ?? []) as ActivityRow[]} resolve={resolve} /></CardBody></Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Aprobación" />
            <CardBody className="space-y-4">
              <ol className="space-y-2 text-sm">
                {[
                  ["Presupuesto recibido", b.status !== "solicitado" && b.base_amount !== null],
                  ["Autorización del presidente registrada", check.has_president_authorization],
                  ["Aprobación interna según límites", b.status === "aprobado"],
                  ["Factura recibida", (invoices?.length ?? 0) > 0],
                  ["Pago confirmado", (invoices ?? []).some((f) => f.status === "pagada")],
                ].map(([label, done], i) => (
                  <li key={i} className="flex items-center gap-2">
                    {done ? <CheckCircle2 size={18} className="text-[var(--verde-dot)]" /> : <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-line-strong text-[10px] text-ink-3">{i + 1}</span>}
                    <span className={done ? "text-ink" : "text-ink-3"}>{label as string}</span>
                  </li>
                ))}
              </ol>

              {pendingApproval && (
                <div className="space-y-3 border-t border-line pt-4">
                  {b.status === "solicitado" && editable && (
                    <FormModal trigger={<><Inbox size={16} /> Marcar como recibido</>} title="Presupuesto recibido" action={markReceived.bind(null, id)} submitLabel="Guardar" triggerVariant="secondary">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Base imponible (€)" htmlFor="base_amount" required><Input id="base_amount" name="base_amount" inputMode="decimal" required defaultValue={b.base_amount ?? ""} /></Field>
                        <Field label="IVA (%)" htmlFor="vat_rate" required><Input id="vat_rate" name="vat_rate" inputMode="decimal" required defaultValue={Number(b.vat_rate)} /></Field>
                        <Field label="Fecha de recepción" htmlFor="received_on"><Input id="received_on" name="received_on" type="date" defaultValue={hoyISO()} /></Field>
                      </div>
                      <p className="text-xs text-ink-3">Recuerde adjuntar el documento del presupuesto.</p>
                    </FormModal>
                  )}

                  {editable && (
                    <FormModal trigger={<><BadgeCheck size={16} /> Registrar autorización del presidente</>} title="Autorización del presidente" description="Registra que el presidente ha autorizado el gasto. No sustituye la aprobación interna ni el control de límites." action={registerPresidentAuthorization.bind(null, id)} submitLabel="Registrar">
                      <Field label="Quién autoriza" htmlFor="authorized_by_name" required><Input id="authorized_by_name" name="authorized_by_name" required defaultValue={""} placeholder="Nombre del presidente/a" /></Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Fecha" htmlFor="authorized_on" required><Input id="authorized_on" name="authorized_on" type="date" required defaultValue={hoyISO()} max={hoyISO()} /></Field>
                        <Field label="Importe autorizado (€)" htmlFor="amount" required><Input id="amount" name="amount" inputMode="decimal" required defaultValue={b.base_amount === null ? "" : Number(b.total_amount)} /></Field>
                      </div>
                      <Field label="Medio de autorización" htmlFor="medium" required>
                        <Select id="medium" name="medium" defaultValue="email">{Object.entries(AUTH_MEDIUM).filter(([k]) => k !== "sistema").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                      </Field>
                      <Field label="Documento justificante" htmlFor="document_id" hint={docRows.length ? undefined : "Adjunte antes el justificante (correo, escrito…) en Documentos para poder vincularlo."}>
                        <Select id="document_id" name="document_id"><option value="">Sin documento</option>{docRows.map((d) => <option key={d.id} value={d.id}>{d.file_name}</option>)}</Select>
                      </Field>
                      <Field label="Observaciones" htmlFor="notes"><Textarea id="notes" name="notes" rows={2} /></Field>
                    </FormModal>
                  )}

                  {check.can_approve && (
                    <>
                      {!check.has_president_authorization && <Alert tone="naranja">No consta la autorización del presidente. Verifique si es necesaria antes de aprobar.</Alert>}
                      <FormModal trigger={<><CheckCircle2 size={16} /> {check.is_supervisor && b.requires_superior ? "Conceder autorización superior" : "Aprobar presupuesto"}</>} triggerVariant="success"
                        title="Aprobar presupuesto" description={`Total: ${euros(b.total_amount)}. La aprobación queda registrada con su nombre, fecha y hora.`} action={approveBudget.bind(null, id)} submitLabel="Confirmar aprobación" submitVariant="success">
                        <Field label="Observaciones (opcional)" htmlFor="notes"><Textarea id="notes" name="notes" rows={2} /></Field>
                      </FormModal>
                    </>
                  )}

                  {!check.is_supervisor && check.is_responsible && check.needs_superior && b.base_amount !== null && !b.requires_superior && (
                    <>
                      <Alert tone="naranja">{check.my_limit === null ? "Su límite económico está pendiente de configurar." : `El total (${euros(b.total_amount)}) supera su límite de aprobación (${euros(check.my_limit)}).`} Debe solicitar autorización superior.</Alert>
                      <FormModal trigger={<><ShieldAlert size={16} /> Solicitar autorización superior</>} triggerVariant="primary" title="Solicitar autorización superior" description="Se avisará a Dirección y Coordinación." action={requestSuperior.bind(null, id)} submitLabel="Enviar solicitud">
                        <Field label="Comentario" htmlFor="notes"><Textarea id="notes" name="notes" rows={3} /></Field>
                      </FormModal>
                    </>
                  )}
                  {!check.is_supervisor && b.requires_superior && <Alert tone="azul">Pendiente de autorización por Dirección o Coordinación.</Alert>}
                  {!check.is_supervisor && !check.is_responsible && <p className="text-xs text-ink-3">La aprobación corresponde a la gestora responsable ({b.responsible_name ?? "sin asignar"}) o a Dirección/Coordinación.</p>}
                  {b.base_amount === null && <p className="text-xs text-ink-3">Para aprobarlo, primero indique la base imponible.</p>}

                  {editable && (
                    <FormModal trigger={<><XCircle size={16} /> Rechazar</>} triggerVariant="ghost" title="Rechazar presupuesto" description="El presupuesto se conserva en el historial como rechazado." action={rejectBudget.bind(null, id)} submitLabel="Rechazar" submitVariant="danger">
                      <Field label="Motivo" htmlFor="reason" required><Textarea id="reason" name="reason" rows={3} required /></Field>
                    </FormModal>
                  )}
                </div>
              )}
              {b.status === "aprobado" && check.is_supervisor && (invoices?.length ?? 0) === 0 && (
                <div className="border-t border-line pt-4">
                  <FormModal trigger={<><XCircle size={16} /> Anular aprobación</>} triggerVariant="ghost" title="Anular aprobación" description="Solo Dirección/Coordinación. Queda registrado en el historial." action={rejectBudget.bind(null, id)} submitLabel="Anular" submitVariant="danger">
                    <Field label="Motivo" htmlFor="reason" required><Textarea id="reason" name="reason" rows={3} required /></Field>
                  </FormModal>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Facturas" />
            <CardBody>
              {invoices?.length ? invoices.map((f) => (
                <Link key={f.id} href={`/facturas/${f.id}`} className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-surface-2">
                  <span><span className="font-medium">{f.invoice_number}</span><span className="block text-xs text-ink-3">{fecha(f.invoice_date)} · {euros(f.total_amount)}</span></span>
                  <StatusBadge entity="factura" status={f.status} />
                </Link>
              )) : <EmptyState title="Sin facturas" description={b.status === "aprobado" ? "Registre la factura cuando la reciba." : "La factura se registra tras la aprobación y la reparación."} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documentos" actions={<UploadModal links={{ budget_id: id, incident_id: b.incident_id, community_id: b.community_id }} folder={`presupuestos/${id}`} defaultType="presupuesto" label="Añadir" triggerSize="sm" />} />
            <CardBody><DocumentList docs={docRows} /></CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
