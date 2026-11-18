import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Banknote, Lock } from "lucide-react";
import { Card, CardBody, CardHeader, DataList, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormModal } from "@/components/ui/form-modal";
import { Table, Td, Th } from "@/components/ui/table";
import { DocumentList, DOC_SELECT, type DocRow } from "@/components/shared/document-list";
import { UploadModal } from "@/components/shared/upload-modal";
import { Timeline, type ActivityRow } from "@/components/shared/timeline";
import { isSupervisor, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStaffOptions } from "@/lib/queries";
import { euros, fecha, fechaHora, hoyISO } from "@/lib/format";
import { confirmPayment, setInvoiceStatus, updateInvoiceNotes } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select("invoice_number").eq("id", id).maybeSingle();
  return { title: data ? `Factura ${data.invoice_number}` : "Factura" };
}

export default async function FacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: f } = await supabase.from("invoices_view").select("*").eq("id", id).maybeSingle();
  if (!f) notFound();
  const [{ data: payments }, { data: docs }, { data: activity }, { data: budget }, staff] = await Promise.all([
    supabase.from("payments").select("*, staff:staff!payments_confirmed_by_fkey(full_name)").eq("invoice_id", id).order("paid_on"),
    supabase.from("documents").select(DOC_SELECT).eq("invoice_id", id).order("created_at", { ascending: false }),
    supabase.from("activity_view").select("*").eq("invoice_id", id).order("occurred_at", { ascending: false }),
    f.budget_id ? supabase.from("budgets").select("code, total_amount, status").eq("id", f.budget_id).maybeSingle() : Promise.resolve({ data: null }),
    getStaffOptions(),
  ]);
  const supervisor = isSupervisor(me);
  const outstanding = Math.round((Number(f.total_amount) - Number(f.paid_amount)) * 100) / 100;
  const diff = budget ? Math.round((Number(f.total_amount) - Number(budget.total_amount)) * 100) / 100 : 0;
  const resolve = Object.fromEntries(staff.map((s) => [s.id, s.full_name]));

  return (
    <div>
      <PageHeader
        back={<Link href="/facturas" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Facturas</Link>}
        title={`Factura ${f.invoice_number}`}
        subtitle={<span className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge entity="factura" status={f.status} /><span>· {f.provider_name} · {f.community_name}</span></span>}
        actions={<>
          <UploadModal links={{ invoice_id: id, incident_id: f.incident_id, community_id: f.community_id, budget_id: f.budget_id }} folder={`facturas/${id}`} defaultType="factura" label="Adjuntar PDF" />
          {f.status !== "pagada" && (
            <FormModal trigger="Cambiar estado" title="Estado de la factura" action={setInvoiceStatus.bind(null, id)} submitLabel="Guardar">
              <Field label="Estado" htmlFor="status"><Select id="status" name="status" defaultValue={f.status}>
                <option value="recibida">Factura recibida</option><option value="pendiente_revision">Pendiente de revisión</option>
                <option value="pendiente_pago">Pendiente de pago</option><option value="discrepancia">Incidencia o discrepancia</option>
              </Select></Field>
              <Field label="Comentario" htmlFor="comment" hint="Obligatorio si hay discrepancia."><Textarea id="comment" name="comment" rows={3} /></Field>
            </FormModal>
          )}
        </>}
      />
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos de la factura" actions={f.status !== "pagada" && (
              <FormModal trigger="Corregir datos" triggerSize="sm" triggerVariant="ghost" title="Corregir datos de la factura" description="Los cambios quedan registrados con el valor anterior y el nuevo." action={updateInvoiceNotes.bind(null, id)} submitLabel="Guardar">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Fecha" htmlFor="invoice_date"><Input id="invoice_date" name="invoice_date" type="date" defaultValue={f.invoice_date} /></Field>
                  <Field label="Base (€)" htmlFor="base_amount"><Input id="base_amount" name="base_amount" inputMode="decimal" defaultValue={Number(f.base_amount)} /></Field>
                  <Field label="IVA (%)" htmlFor="vat_rate"><Input id="vat_rate" name="vat_rate" inputMode="decimal" defaultValue={Number(f.vat_rate)} /></Field>
                </div>
                <Field label="Observaciones" htmlFor="notes"><Textarea id="notes" name="notes" rows={3} defaultValue={f.notes ?? ""} /></Field>
              </FormModal>
            )} />
            <CardBody className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-surface-2 p-4"><p className="text-xs text-ink-3">Base imponible</p><p className="tabular text-lg font-semibold">{euros(f.base_amount)}</p></div>
                <div className="rounded-lg bg-surface-2 p-4"><p className="text-xs text-ink-3">IVA ({Number(f.vat_rate)} %)</p><p className="tabular text-lg font-semibold">{euros(f.vat_amount)}</p></div>
                <div className="rounded-lg bg-brand-soft p-4"><p className="text-xs text-ink-3">Total</p><p className="tabular text-lg font-semibold text-brand">{euros(f.total_amount)}</p></div>
              </div>
              {budget && diff !== 0 && <Alert tone="naranja">El total de la factura difiere del presupuesto {budget.code} ({euros(budget.total_amount)}) en {euros(diff)}.</Alert>}
              <DataList items={[
                ["Proveedor", <Link key="p" href={`/proveedores/${f.provider_id}`} className="text-brand hover:underline">{f.provider_name}</Link>],
                ["Comunidad", <Link key="c" href={`/comunidades/${f.community_id}`} className="text-brand hover:underline">{f.community_name}</Link>],
                ["Incidencia", f.incident_id ? <Link key="i" href={`/incidencias/${f.incident_id}`} className="text-brand hover:underline">{f.incident_code}</Link> : null],
                ["Presupuesto", f.budget_id ? <Link key="b" href={`/presupuestos/${f.budget_id}`} className="text-brand hover:underline">{f.budget_code}</Link> : null],
                ["Fecha de factura", fecha(f.invoice_date)], ["Fecha de recepción", fecha(f.received_on)], ["Observaciones", f.notes],
              ]} />
            </CardBody>
          </Card>
          <Card><CardHeader title="Historial" /><CardBody><Timeline items={(activity ?? []) as ActivityRow[]} resolve={resolve} /></CardBody></Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Pagos" subtitle={f.status === "pagada" ? "Factura pagada." : `Pendiente: ${euros(outstanding)}`} />
            <CardBody className="space-y-4">
              {payments?.length ? (
                <Table className="-mx-5">
                  <thead><tr><Th>Fecha</Th><Th className="text-right">Importe</Th><Th>Confirmado por</Th></tr></thead>
                  <tbody>{payments.map((p) => <tr key={p.id}><Td>{fecha(p.paid_on)}</Td><Td className="tabular text-right">{euros(p.amount)}</Td><Td className="text-xs">{p.staff?.full_name}<span className="block text-ink-3">{fechaHora(p.created_at)}</span>{p.notes && <span className="block text-ink-3">{p.notes}</span>}</Td></tr>)}</tbody>
                </Table>
              ) : <p className="text-sm text-ink-3">No hay pagos registrados.</p>}
              {f.status !== "pagada" && (supervisor ? (
                f.status === "discrepancia" ? <Alert tone="rojo">Resuelva la discrepancia (cambie el estado) antes de confirmar el pago.</Alert> : (
                  <FormModal trigger={<><Banknote size={16} /> Confirmar pago</>} triggerVariant="success" title="Confirmar pago" description={`Factura ${f.invoice_number} · ${f.provider_name}`} action={confirmPayment.bind(null, id)} submitLabel="Confirmar pago" submitVariant="success">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Importe pagado (€)" htmlFor="amount" required><Input id="amount" name="amount" inputMode="decimal" required defaultValue={outstanding} /></Field>
                      <Field label="Fecha del pago" htmlFor="paid_on" required><Input id="paid_on" name="paid_on" type="date" required defaultValue={hoyISO()} max={hoyISO()} /></Field>
                    </div>
                    <Field label="Observaciones" htmlFor="notes"><Textarea id="notes" name="notes" rows={2} placeholder="Transferencia, referencia…" /></Field>
                    <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" name="confirm" className="mt-1" required /> Confirmo que el pago se ha realizado. Quedará registrado a mi nombre ({me.full_name}).</label>
                  </FormModal>
                )
              ) : (
                <p className="flex items-center gap-2 rounded-lg bg-surface-2 p-3 text-sm text-ink-3"><Lock size={16} /> Solo Silvia Rodríguez (Dirección) y Begoña López (Coordinación) pueden confirmar pagos.</p>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Documentos" actions={<UploadModal links={{ invoice_id: id, incident_id: f.incident_id, community_id: f.community_id }} folder={`facturas/${id}`} defaultType="factura" label="Añadir" triggerSize="sm" />} />
            <CardBody><DocumentList docs={(docs ?? []) as unknown as DocRow[]} /></CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
