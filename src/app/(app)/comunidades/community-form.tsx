"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormSection, Input, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

type Defaults = Partial<{ parent_id: string | null; code: string; name: string; address: string | null; postal_code: string | null; city: string | null; manager_id: string | null; president_name: string | null; president_contact: string | null; notes: string | null; registered_on: string | null; active: boolean }>;

export function CommunityForm({ action, staff, defaults, canAssign, mode, cancelHref, parents }: {
  action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  parents: { id: string; name: string; code: string }[];
  staff: { id: string; full_name: string; active: boolean }[]; defaults?: Defaults; canAssign: boolean; mode: "create" | "edit"; cancelHref: string;
}) {
  const router = useRouter();
  return (
    <ActionForm action={action} submitLabel={mode === "create" ? "Dar de alta" : "Guardar cambios"}
      onSuccess={(r) => router.push(`/comunidades/${r.id}`)} footer={<ButtonLink href={cancelHref} variant="secondary">Cancelar</ButtonLink>}>
      <Card>
        <FormSection title="Identificación">
          <Field label="Nombre de la comunidad" htmlFor="name" required className="sm:col-span-2"><Input id="name" name="name" required defaultValue={defaults?.name ?? ""} placeholder="Ej.: C.P. Calle Mayor, 12" /></Field>
          <Field label="Código interno" htmlFor="code" required><Input id="code" name="code" required defaultValue={defaults?.code ?? ""} maxLength={40} /></Field>
          <Field label="Fecha de alta" htmlFor="registered_on"><Input id="registered_on" name="registered_on" type="date" defaultValue={defaults?.registered_on ?? ""} /></Field>
          <Field label="Gestora responsable" htmlFor="manager_id" hint={canAssign ? undefined : "Solo Dirección o Coordinación pueden cambiar la gestora responsable."}>
            {canAssign ? (
              <Select id="manager_id" name="manager_id" defaultValue={defaults?.manager_id ?? ""}>
                <option value="">Pendiente de asignar</option>
                {staff.filter((s) => s.active || s.id === defaults?.manager_id).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </Select>
            ) : (
              <>
                <Input value={staff.find((s) => s.id === defaults?.manager_id)?.full_name ?? "Pendiente de asignar"} disabled readOnly />
                <input type="hidden" name="manager_id" value={defaults?.manager_id ?? ""} />
              </>
            )}
          </Field>
          <Field label="Comunidad general" htmlFor="parent_id" hint="Solo si es una subcomunidad (escalera, parking, piscina…) que forma parte de una comunidad general.">
            <Select id="parent_id" name="parent_id" defaultValue={defaults?.parent_id ?? ""}>
              <option value="">No es subcomunidad</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.code}</option>)}
            </Select>
          </Field>
          {mode === "edit" && (
            <Field label="Situación" htmlFor="active">
              <Select id="active" name="active" defaultValue={defaults?.active === false ? "false" : "true"}>
                <option value="true">Activa</option>
                <option value="false">Baja (deja de gestionarse)</option>
              </Select>
            </Field>
          )}
        </FormSection>
        <FormSection title="Ubicación">
          <Field label="Dirección" htmlFor="address" className="sm:col-span-2"><Input id="address" name="address" defaultValue={defaults?.address ?? ""} /></Field>
          <Field label="Código postal" htmlFor="postal_code"><Input id="postal_code" name="postal_code" defaultValue={defaults?.postal_code ?? ""} maxLength={10} /></Field>
          <Field label="Población" htmlFor="city"><Input id="city" name="city" defaultValue={defaults?.city ?? ""} /></Field>
        </FormSection>
        <FormSection title="Presidencia" description="Datos de contacto: regístrelos solo si son necesarios para la gestión.">
          <Field label="Presidente/a" htmlFor="president_name"><Input id="president_name" name="president_name" defaultValue={defaults?.president_name ?? ""} /></Field>
          <Field label="Contacto del presidente/a" htmlFor="president_contact"><Input id="president_contact" name="president_contact" defaultValue={defaults?.president_contact ?? ""} /></Field>
          <Field label="Observaciones" htmlFor="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} /></Field>
        </FormSection>
      </Card>
    </ActionForm>
  );
}
