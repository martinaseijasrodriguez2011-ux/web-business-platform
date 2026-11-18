"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/card";
import { Alert, Field, FormSection, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import type { ActionResult } from "@/lib/types";

type Community = { id: string; name: string; code: string; manager_id: string | null };
type StaffOpt = { id: string; short_name: string; full_name: string; active: boolean };
type Cat = { id: string; name: string; parent_id: string | null; active: boolean };

export type IncidentDefaults = Partial<{
  community_id: string; manager_id: string | null; reporter_name: string | null; reporter_unit: string | null;
  reporter_contact: string | null; title: string; description: string | null; category_id: string | null;
  subcategory_id: string | null; priority: string; provider_id: string | null; communicated_on: string | null;
  planned_on: string | null; due_on: string | null; notes: string | null; status: string;
}>;

export function IncidentForm({
  action, communities, staff, categories, providers, defaults, mode, currentStaffName, today, cancelHref,
}: {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  communities: Community[]; staff: StaffOpt[]; categories: Cat[]; providers: { id: string; name: string }[];
  defaults?: IncidentDefaults; mode: "create" | "edit"; currentStaffName: string; today: string; cancelHref: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  const [communityId, setCommunityId] = useState(defaults?.community_id ?? "");
  const [managerId, setManagerId] = useState(defaults?.manager_id ?? "");
  const [categoryId, setCategoryId] = useState(defaults?.category_id ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const parents = useMemo(() => categories.filter((c) => !c.parent_id && c.active), [categories]);
  const subs = useMemo(() => categories.filter((c) => c.parent_id === categoryId && c.active), [categories, categoryId]);

  // Al elegir comunidad en el alta, propone su gestora responsable
  function onCommunity(id: string) {
    setCommunityId(id);
    if (mode === "create") setManagerId(communities.find((c) => c.id === id)?.manager_id ?? "");
  }

  useEffect(() => {
    if (!state?.ok) return;
    if (mode === "edit") { router.refresh(); return; }
    const id = state.id!;
    (async () => {
      if (files.length) {
        const supabase = createClient();
        for (const file of files) {
          const safe = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
          const path = `incidencias/${id}/${crypto.randomUUID()}-${safe}`;
          const up = await supabase.storage.from("documentos").upload(path, file, { contentType: file.type || undefined });
          if (up.error) { setUploadError(`La incidencia se creó, pero no se pudo subir "${file.name}". Puede adjuntarlo desde la ficha.`); continue; }
          await supabase.from("documents").insert({
            incident_id: id, storage_path: path, file_name: file.name, mime_type: file.type || null, size_bytes: file.size,
            doc_type: file.type.startsWith("image/") ? "fotografia" : file.type.startsWith("video/") ? "video" : "otro",
          });
        }
      }
      router.push(`/incidencias/${id}?creada=1`);
    })();
  }, [state, mode, files, router]);

  const managerName = staff.find((s) => s.id === managerId)?.short_name;

  return (
    <form action={formAction}>
      <Card>
        <FormSection title="Datos básicos" description={mode === "create" ? `El número se asigna automáticamente. Registra: ${currentStaffName}.` : undefined}>
          <Field label="Comunidad" htmlFor="community_id" required className="sm:col-span-2">
            <Select id="community_id" name="community_id" required value={communityId} onChange={(e) => onCommunity(e.target.value)}>
              <option value="">Seleccione una comunidad…</option>
              {communities.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.code}</option>)}
            </Select>
          </Field>
          <Field label="Gestora responsable" htmlFor="manager_id" hint={mode === "create" && communityId && !managerId ? "La comunidad no tiene gestora asignada (pendiente de configurar)." : undefined}>
            <Select id="manager_id" name="manager_id" value={managerId ?? ""} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">Sin asignar</option>
              {staff.filter((s) => s.active || s.id === managerId).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </Select>
          </Field>
          <Field label="Fecha de comunicación" htmlFor="communicated_on">
            <Input id="communicated_on" name="communicated_on" type="date" defaultValue={defaults?.communicated_on ?? today} max={today} />
          </Field>
          <Field label="Nombre del vecino" htmlFor="reporter_name">
            <Input id="reporter_name" name="reporter_name" defaultValue={defaults?.reporter_name ?? ""} maxLength={200} />
          </Field>
          <Field label="Piso y puerta" htmlFor="reporter_unit">
            <Input id="reporter_unit" name="reporter_unit" defaultValue={defaults?.reporter_unit ?? ""} maxLength={60} placeholder="Ej.: 3º 2ª" />
          </Field>
          <Field label="Teléfono o contacto" htmlFor="reporter_contact" className="sm:col-span-2" hint="Solo si procede. Dato personal: regístrelo únicamente cuando sea necesario para la gestión.">
            <Input id="reporter_contact" name="reporter_contact" defaultValue={defaults?.reporter_contact ?? ""} maxLength={200} />
          </Field>
        </FormSection>

        <FormSection title="Información del problema">
          <Field label="Título" htmlFor="title" required className="sm:col-span-2">
            <Input id="title" name="title" required minLength={3} maxLength={200} defaultValue={defaults?.title ?? ""} placeholder="Ej.: Fuga de agua en el patio de luces" />
          </Field>
          <Field label="Descripción completa" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" rows={5} defaultValue={defaults?.description ?? ""} />
          </Field>
          <Field label="Categoría" htmlFor="category_id">
            <Select id="category_id" name="category_id" value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Subcategoría" htmlFor="subcategory_id" hint={categoryId && !subs.length ? "Esta categoría no tiene subcategorías configuradas." : undefined}>
            <Select id="subcategory_id" name="subcategory_id" defaultValue={defaults?.subcategory_id ?? ""} disabled={!subs.length}>
              <option value="">—</option>
              {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Prioridad" htmlFor="priority" required>
            <Select id="priority" name="priority" defaultValue={defaults?.priority ?? "normal"}>
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </Select>
          </Field>
          {mode === "create" && (
            <Field label="Estado inicial" htmlFor="status">
              <Select id="status" name="status" defaultValue="nueva">
                <option value="nueva">Nueva</option>
                <option value="pendiente_revision">Pendiente de revisión</option>
                <option value="en_curso">En curso</option>
              </Select>
            </Field>
          )}
        </FormSection>

        <FormSection title="Información adicional">
          <Field label="Proveedor" htmlFor="provider_id">
            <Select id="provider_id" name="provider_id" defaultValue={defaults?.provider_id ?? ""}>
              <option value="">Sin proveedor</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label="Fecha prevista de actuación" htmlFor="planned_on">
            <Input id="planned_on" name="planned_on" type="date" defaultValue={defaults?.planned_on ?? ""} />
          </Field>
          <Field label="Fecha límite" htmlFor="due_on" hint="Si se supera sin resolver, la incidencia aparecerá como atrasada.">
            <Input id="due_on" name="due_on" type="date" defaultValue={defaults?.due_on ?? ""} />
          </Field>
          <Field label="Observaciones" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} />
          </Field>
          {mode === "create" && (
            <Field label="Fotografías, vídeos y documentos" htmlFor="files" className="sm:col-span-2" hint="Se guardan de forma privada. También podrá añadirlos después desde la ficha.">
              <input id="files" type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.heic" onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="block w-full text-sm text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand" />
              {files.length > 0 && <ul className="mt-2 space-y-1 text-xs text-ink-2">{files.map((f) => <li key={f.name} className="flex items-center gap-1"><Paperclip size={12} /> {f.name}</li>)}</ul>}
            </Field>
          )}
        </FormSection>
      </Card>
      <div className="mt-4 space-y-3">
        {state?.error && <Alert>{state.error}</Alert>}
        {uploadError && <Alert tone="naranja">{uploadError}</Alert>}
        {state?.ok && state.message && <Alert tone="verde">{state.message}</Alert>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {managerName && mode === "create" && <span className="mr-auto text-sm text-ink-3">Se asignará a {managerName}.</span>}
          <ButtonLink href={cancelHref} variant="secondary">Cancelar</ButtonLink>
          <SubmitButton>{mode === "create" ? "Registrar incidencia" : "Guardar cambios"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
