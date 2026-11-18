"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ACTIVITY_MANUAL } from "@/lib/labels";
import type { ActionResult } from "@/lib/types";

export function ActivityForm({ action, onDone, nowLocal }: { action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>; onDone?: () => void; nowLocal: string }) {
  return (
    <ActionForm action={action} onSuccess={onDone} submitLabel="Registrar" className="grid gap-3 sm:grid-cols-2">
      <Field label="Tipo" htmlFor="kind" required>
        <Select id="kind" name="kind" defaultValue="actuacion">
          {Object.entries(ACTIVITY_MANUAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Fecha y hora" htmlFor="occurred_at" hint="Cuándo ocurrió. Por defecto, ahora.">
        <Input id="occurred_at" name="occurred_at" type="datetime-local" defaultValue={nowLocal} max={nowLocal} />
      </Field>
      <Field label="Resumen" htmlFor="summary" required className="sm:col-span-2">
        <Input id="summary" name="summary" required minLength={3} maxLength={300} placeholder="Ej.: Se contacta con el cerrajero" />
      </Field>
      <Field label="Con quién (opcional)" htmlFor="counterpart" className="sm:col-span-2">
        <Input id="counterpart" name="counterpart" maxLength={200} placeholder="Proveedor, presidente, vecino…" />
      </Field>
      <Field label="Detalle o comentario" htmlFor="body" className="sm:col-span-2">
        <Textarea id="body" name="body" rows={4} placeholder="Contenido de la llamada, del correo recibido, acuerdos…" />
      </Field>
    </ActionForm>
  );
}
