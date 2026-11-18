"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormSection, Input, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

type D = Partial<{ community_id: string; incident_id: string | null; manager_id: string | null; insurer: string | null; policy_number: string | null; claim_number: string | null; occurred_on: string | null; communicated_on: string | null; description: string | null; adjuster_name: string | null; adjuster_phone: string | null; visit_local: string; notes: string | null }>;

export function ClaimForm({ action, communities, incidents, staff, defaults, mode, cancelHref, today }: {
  action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>; communities: { id: string; name: string; manager_id: string | null }[];
  incidents: { id: string; code: string; title: string; community_id: string }[]; staff: { id: string; full_name: string; active: boolean }[];
  defaults?: D; mode: "create" | "edit"; cancelHref: string; today: string;
}) {
  const router = useRouter();
  const [communityId, setCommunityId] = useState(defaults?.community_id ?? "");
  const [managerId, setManagerId] = useState(defaults?.manager_id ?? "");
  return (
    <ActionForm action={action} submitLabel={mode === "create" ? "Registrar siniestro" : "Guardar cambios"} onSuccess={(r) => router.push(`/siniestros/${r.id}`)} footer={<ButtonLink href={cancelHref} variant="secondary">Cancelar</ButtonLink>}>
      <Card>
        <FormSection title="Relación">
          <Field label="Comunidad" htmlFor="community_id" required>
            <Select id="community_id" name="community_id" required value={communityId} onChange={(e) => { setCommunityId(e.target.value); if (mode === "create") setManagerId(communities.find((c) => c.id === e.target.value)?.manager_id ?? ""); }}>
              <option value="">Seleccione…</option>{communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Incidencia relacionada" htmlFor="incident_id">
            <Select id="incident_id" name="incident_id" defaultValue={defaults?.incident_id ?? ""}>
              <option value="">Sin incidencia</option>{incidents.filter((i) => !communityId || i.community_id === communityId).map((i) => <option key={i.id} value={i.id}>{i.code} · {i.title}</option>)}
            </Select>
          </Field>
          <Field label="Gestora responsable" htmlFor="manager_id">
            <Select id="manager_id" name="manager_id" value={managerId ?? ""} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">Sin asignar</option>{staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </Select>
          </Field>
          {mode === "create" && (
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-2"><input type="checkbox" name="apply_checklist" defaultChecked /> Aplicar checklist de siniestro</label>
          )}
        </FormSection>
        <FormSection title="Seguro">
          <Field label="Aseguradora" htmlFor="insurer"><Input id="insurer" name="insurer" defaultValue={defaults?.insurer ?? ""} /></Field>
          <Field label="Número de póliza" htmlFor="policy_number"><Input id="policy_number" name="policy_number" defaultValue={defaults?.policy_number ?? ""} /></Field>
          <Field label="Número de expediente" htmlFor="claim_number"><Input id="claim_number" name="claim_number" defaultValue={defaults?.claim_number ?? ""} /></Field>
          <div />
          <Field label="Fecha del siniestro" htmlFor="occurred_on"><Input id="occurred_on" name="occurred_on" type="date" max={today} defaultValue={defaults?.occurred_on ?? ""} /></Field>
          <Field label="Fecha de comunicación" htmlFor="communicated_on"><Input id="communicated_on" name="communicated_on" type="date" max={today} defaultValue={defaults?.communicated_on ?? ""} /></Field>
          <Field label="Descripción" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" rows={4} defaultValue={defaults?.description ?? ""} /></Field>
        </FormSection>
        <FormSection title="Peritación">
          <Field label="Perito" htmlFor="adjuster_name"><Input id="adjuster_name" name="adjuster_name" defaultValue={defaults?.adjuster_name ?? ""} /></Field>
          <Field label="Teléfono de contacto" htmlFor="adjuster_phone"><Input id="adjuster_phone" name="adjuster_phone" type="tel" defaultValue={defaults?.adjuster_phone ?? ""} /></Field>
          <Field label="Fecha y hora de visita" htmlFor="visit_at"><Input id="visit_at" name="visit_at" type="datetime-local" defaultValue={defaults?.visit_local ?? ""} /></Field>
          <Field label="Observaciones" htmlFor="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes ?? ""} /></Field>
        </FormSection>
      </Card>
    </ActionForm>
  );
}
