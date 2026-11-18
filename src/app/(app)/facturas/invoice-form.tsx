"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Field, FormSection, Input, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const parse = (v: string) => { const n = Number((v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v).replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : NaN; };

type Budget = { id: string; code: string; concept: string; community_id: string; incident_id: string | null; provider_id: string | null; base_amount: number | null; vat_rate: number; total_amount: number };

export function InvoiceForm({ communities, incidents, budgets, providers, preset, defaultVat, today, cancelHref, action }: {
  communities: { id: string; name: string }[]; incidents: { id: string; code: string; title: string; community_id: string }[]; budgets: Budget[];
  providers: { id: string; name: string }[]; preset: { community_id?: string; incident_id?: string; budget_id?: string }; defaultVat: number; today: string; cancelHref: string;
  action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const presetBudget = budgets.find((b) => b.id === preset.budget_id);
  const [budgetId, setBudgetId] = useState(preset.budget_id ?? "");
  const [communityId, setCommunityId] = useState(presetBudget?.community_id ?? preset.community_id ?? "");
  const [incidentId, setIncidentId] = useState(presetBudget?.incident_id ?? preset.incident_id ?? "");
  const [providerId, setProviderId] = useState(presetBudget?.provider_id ?? "");
  const [base, setBase] = useState(presetBudget?.base_amount != null ? String(presetBudget.base_amount).replace(".", ",") : "");
  const [vat, setVat] = useState(String(presetBudget?.vat_rate ?? defaultVat).replace(".", ","));
  const budget = budgets.find((b) => b.id === budgetId);
  const calc = useMemo(() => { const b = parse(base), r = parse(vat); if (Number.isNaN(b) || Number.isNaN(r) || base === "") return null; const v = Math.round(b * r) / 100; return { vat: v, total: Math.round((b + v) * 100) / 100 }; }, [base, vat]);
  const diff = calc && budget ? Math.round((calc.total - Number(budget.total_amount)) * 100) / 100 : 0;

  function pickBudget(id: string) {
    setBudgetId(id);
    const b = budgets.find((x) => x.id === id);
    if (b) { setCommunityId(b.community_id); setIncidentId(b.incident_id ?? ""); if (b.provider_id) setProviderId(b.provider_id); if (b.base_amount != null) setBase(String(b.base_amount).replace(".", ",")); setVat(String(b.vat_rate).replace(".", ",")); }
  }

  return (
    <ActionForm action={action} submitLabel="Registrar factura" onSuccess={(r) => router.push(`/facturas/${r.id}`)} footer={<ButtonLink href={cancelHref} variant="secondary">Cancelar</ButtonLink>}>
      <Card>
        <FormSection title="Relación" description="Al elegir un presupuesto aprobado se completan comunidad, incidencia, proveedor e importes.">
          <Field label="Presupuesto relacionado" htmlFor="budget_id" className="sm:col-span-2">
            <Select id="budget_id" name="budget_id" value={budgetId} onChange={(e) => pickBudget(e.target.value)}>
              <option value="">Sin presupuesto</option>
              {budgets.filter((b) => !communityId || b.community_id === communityId || b.id === budgetId).map((b) => <option key={b.id} value={b.id}>{b.code} · {b.concept} · {eur.format(Number(b.total_amount))}</option>)}
            </Select>
          </Field>
          <Field label="Comunidad" htmlFor="community_id" required>
            <Select id="community_id" name="community_id" value={communityId} onChange={(e) => { setCommunityId(e.target.value); setIncidentId(""); setBudgetId(""); }} required>
              <option value="">Seleccione…</option>{communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Incidencia relacionada" htmlFor="incident_id">
            <Select id="incident_id" name="incident_id" value={incidentId} onChange={(e) => setIncidentId(e.target.value)}>
              <option value="">Sin incidencia</option>{incidents.filter((i) => !communityId || i.community_id === communityId).map((i) => <option key={i.id} value={i.id}>{i.code} · {i.title}</option>)}
            </Select>
          </Field>
          <Field label="Proveedor" htmlFor="provider_id" required>
            <Select id="provider_id" name="provider_id" value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
              <option value="">Seleccione…</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Estado inicial" htmlFor="status">
            <Select id="status" name="status" defaultValue="recibida">
              <option value="recibida">Factura recibida</option><option value="pendiente_revision">Pendiente de revisión</option><option value="pendiente_pago">Pendiente de pago</option>
            </Select>
          </Field>
        </FormSection>
        <FormSection title="Datos de la factura">
          <Field label="Número de factura" htmlFor="invoice_number" required><Input id="invoice_number" name="invoice_number" required maxLength={60} /></Field>
          <Field label="Fecha de factura" htmlFor="invoice_date" required><Input id="invoice_date" name="invoice_date" type="date" required max={today} /></Field>
          <Field label="Fecha de recepción" htmlFor="received_on" required><Input id="received_on" name="received_on" type="date" required defaultValue={today} max={today} /></Field>
          <div />
          <Field label="Base imponible (€)" htmlFor="base_amount" required><Input id="base_amount" name="base_amount" inputMode="decimal" required value={base} onChange={(e) => setBase(e.target.value)} placeholder="0,00" /></Field>
          <Field label="Tipo de IVA (%)" htmlFor="vat_rate" required><Input id="vat_rate" name="vat_rate" inputMode="decimal" required value={vat} onChange={(e) => setVat(e.target.value)} list="vat-rates" /><datalist id="vat-rates"><option value="21" /><option value="10" /><option value="4" /><option value="0" /></datalist></Field>
          <div className="rounded-lg bg-surface-2 p-4 sm:col-span-2">
            <div className="flex justify-between text-sm"><span className="text-ink-3">IVA</span><span className="tabular">{calc ? eur.format(calc.vat) : "—"}</span></div>
            <div className="mt-1 flex justify-between text-base font-semibold"><span>Total factura</span><span className="tabular">{calc ? eur.format(calc.total) : "—"}</span></div>
          </div>
          {budget && calc && diff !== 0 && <div className="sm:col-span-2"><Alert tone="naranja">El total difiere del presupuesto aprobado en {eur.format(diff)}. Revíselo y, si procede, márquela como «Incidencia o discrepancia».</Alert></div>}
          <Field label="Observaciones" htmlFor="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" rows={2} /></Field>
        </FormSection>
      </Card>
      <p className="mt-3 text-sm text-ink-3">Después de registrarla podrá adjuntar el PDF. Registrar una factura no la marca como pagada: el pago lo confirma Dirección o Coordinación.</p>
    </ActionForm>
  );
}
