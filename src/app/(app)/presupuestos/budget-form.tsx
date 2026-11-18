"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormSection, Input, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", useGrouping: "always" });
function parseMoney(v: string) {
  const n = Number((v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

type Defaults = Partial<{ community_id: string; incident_id: string | null; provider_id: string | null; requested_on: string | null; received_on: string | null; valid_until: string | null; concept: string; description: string | null; base_amount: number | null; vat_rate: number; execution_term: string | null; conditions: string | null }>;

export function BudgetForm({ action, communities, incidents, providers, defaults, defaultVat, mode, cancelHref, today, amountLocked }: {
  action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  communities: { id: string; name: string }[]; incidents: { id: string; code: string; title: string; community_id: string }[];
  providers: { id: string; name: string }[]; defaults?: Defaults; defaultVat: number; mode: "create" | "edit"; cancelHref: string; today: string; amountLocked?: boolean;
}) {
  const router = useRouter();
  const [communityId, setCommunityId] = useState(defaults?.community_id ?? "");
  const [incidentId, setIncidentId] = useState(defaults?.incident_id ?? "");
  const [base, setBase] = useState(defaults?.base_amount != null ? String(defaults.base_amount).replace(".", ",") : "");
  const [vat, setVat] = useState(String(defaults?.vat_rate ?? defaultVat).replace(".", ","));
  const [status, setStatus] = useState("solicitado");
  const calc = useMemo(() => {
    const b = parseMoney(base), r = parseMoney(vat);
    if (Number.isNaN(b) || Number.isNaN(r) || base === "") return null;
    const v = Math.round(b * r) / 100;
    return { vat: v, total: Math.round((b + v) * 100) / 100 };
  }, [base, vat]);
  const filteredIncidents = incidents.filter((i) => !communityId || i.community_id === communityId);

  return (
    <ActionForm action={action} submitLabel={mode === "create" ? "Registrar presupuesto" : "Guardar cambios"}
      onSuccess={(r) => (mode === "create" ? router.push(`/presupuestos/${r.id}`) : router.refresh())}
      footer={<ButtonLink href={cancelHref} variant="secondary">Cancelar</ButtonLink>}>
      <Card>
        <FormSection title="Relación" description="Una incidencia puede tener varios presupuestos de distintos proveedores.">
          <Field label="Comunidad" htmlFor="community_id" required>
            <Select id="community_id" name="community_id" value={communityId} onChange={(e) => { setCommunityId(e.target.value); setIncidentId(""); }} disabled={mode === "edit"}>
              <option value="">Seleccione…</option>
              {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {mode === "edit" && <input type="hidden" name="community_id" value={communityId} />}
          </Field>
          <Field label="Incidencia relacionada" htmlFor="incident_id">
            <Select id="incident_id" name="incident_id" value={incidentId ?? ""} onChange={(e) => {
              setIncidentId(e.target.value);
              const inc = incidents.find((i) => i.id === e.target.value); if (inc) setCommunityId(inc.community_id);
            }}>
              <option value="">Sin incidencia</option>
              {filteredIncidents.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.title}</option>)}
            </Select>
          </Field>
          <Field label="Proveedor" htmlFor="provider_id" hint={providers.length ? undefined : "No hay proveedores dados de alta. Puede crearlos en Proveedores."}>
            <Select id="provider_id" name="provider_id" defaultValue={defaults?.provider_id ?? ""}>
              <option value="">Sin proveedor</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          {mode === "create" && (
            <Field label="Estado inicial" htmlFor="status">
              <Select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="solicitado">Solicitado (pendiente de recibir)</option>
                <option value="recibido">Recibido</option>
              </Select>
            </Field>
          )}
          <Field label="Fecha de solicitud" htmlFor="requested_on"><Input id="requested_on" name="requested_on" type="date" defaultValue={defaults?.requested_on ?? (mode === "create" ? today : "")} /></Field>
          <Field label="Fecha de recepción" htmlFor="received_on"><Input id="received_on" name="received_on" type="date" defaultValue={defaults?.received_on ?? ""} /></Field>
        </FormSection>
        <FormSection title="Contenido">
          <Field label="Concepto" htmlFor="concept" required className="sm:col-span-2"><Input id="concept" name="concept" required defaultValue={defaults?.concept ?? ""} placeholder="Ej.: Sustitución de bajante comunitaria" /></Field>
          <Field label="Descripción" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" rows={3} defaultValue={defaults?.description ?? ""} /></Field>
          <Field label="Plazo de ejecución" htmlFor="execution_term"><Input id="execution_term" name="execution_term" defaultValue={defaults?.execution_term ?? ""} placeholder="Ej.: 5 días laborables" /></Field>
          <Field label="Fecha de validez" htmlFor="valid_until"><Input id="valid_until" name="valid_until" type="date" defaultValue={defaults?.valid_until ?? ""} /></Field>
          <Field label="Condiciones" htmlFor="conditions" className="sm:col-span-2"><Textarea id="conditions" name="conditions" rows={2} defaultValue={defaults?.conditions ?? ""} placeholder="Forma de pago, garantía, exclusiones…" /></Field>
        </FormSection>
        <FormSection title="Importes" description="El IVA y el total se calculan automáticamente. Indique el tipo de IVA aplicable en cada caso.">
          <Field label="Base imponible (€)" htmlFor="base_amount" required={status === "recibido"} hint={amountLocked ? "Importe bloqueado: el presupuesto está aprobado." : undefined}>
            <Input id="base_amount" name="base_amount" inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} placeholder="0,00" readOnly={amountLocked} />
          </Field>
          <Field label="Tipo de IVA (%)" htmlFor="vat_rate" required>
            <Input id="vat_rate" name="vat_rate" inputMode="decimal" value={vat} onChange={(e) => setVat(e.target.value)} list="vat-rates" readOnly={amountLocked} />
            <datalist id="vat-rates"><option value="21" /><option value="10" /><option value="4" /><option value="0" /></datalist>
          </Field>
          <div className="rounded-lg bg-surface-2 p-4 sm:col-span-2">
            <div className="flex justify-between text-sm"><span className="text-ink-3">Importe de IVA</span><span className="tabular">{calc ? eur.format(calc.vat) : "—"}</span></div>
            <div className="mt-1 flex justify-between text-base font-semibold"><span>Total</span><span className="tabular">{calc ? eur.format(calc.total) : "—"}</span></div>
          </div>
        </FormSection>
      </Card>
    </ActionForm>
  );
}
