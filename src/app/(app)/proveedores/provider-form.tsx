"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormSection, Input, Select, Textarea } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

type D = Partial<{ trade_name: string; company_name: string | null; tax_id: string | null; contact_person: string | null; phone: string | null; email: string | null; address: string | null; notes: string | null; active: boolean }>;

export function ProviderForm({ action, specialties, selected, defaults, mode, cancelHref }: { action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>; specialties: { id: string; name: string }[]; selected?: string[]; defaults?: D; mode: "create" | "edit"; cancelHref: string }) {
  const router = useRouter();
  return (
    <ActionForm action={action} submitLabel={mode === "create" ? "Dar de alta" : "Guardar cambios"} onSuccess={(r) => router.push(`/proveedores/${r.id}`)} footer={<ButtonLink href={cancelHref} variant="secondary">Cancelar</ButtonLink>}>
      <Card>
        <FormSection title="Identificación">
          <Field label="Nombre comercial" htmlFor="trade_name" required><Input id="trade_name" name="trade_name" required defaultValue={defaults?.trade_name ?? ""} /></Field>
          <Field label="Empresa (razón social)" htmlFor="company_name"><Input id="company_name" name="company_name" defaultValue={defaults?.company_name ?? ""} /></Field>
          <Field label="NIF/CIF" htmlFor="tax_id"><Input id="tax_id" name="tax_id" defaultValue={defaults?.tax_id ?? ""} maxLength={20} /></Field>
          {mode === "edit" && <Field label="Situación" htmlFor="active"><Select id="active" name="active" defaultValue={defaults?.active === false ? "false" : "true"}><option value="true">Activo</option><option value="false">Inactivo</option></Select></Field>}
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-ink-2">Especialidades</legend>
            <div className="flex flex-wrap gap-2">
              {specialties.map((sp) => (
                <label key={sp.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand">
                  <input type="checkbox" name="specialties" value={sp.id} defaultChecked={selected?.includes(sp.id)} className="sr-only" />{sp.name}
                </label>
              ))}
            </div>
          </fieldset>
        </FormSection>
        <FormSection title="Contacto">
          <Field label="Persona de contacto" htmlFor="contact_person"><Input id="contact_person" name="contact_person" defaultValue={defaults?.contact_person ?? ""} /></Field>
          <Field label="Teléfono" htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={defaults?.phone ?? ""} /></Field>
          <Field label="Correo electrónico" htmlFor="email"><Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ""} /></Field>
          <Field label="Dirección" htmlFor="address"><Input id="address" name="address" defaultValue={defaults?.address ?? ""} /></Field>
          <Field label="Observaciones" htmlFor="notes" className="sm:col-span-2"><Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} /></Field>
        </FormSection>
      </Card>
    </ActionForm>
  );
}
