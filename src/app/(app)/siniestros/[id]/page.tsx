import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { Card, CardBody, CardHeader, DataList, EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormModal } from "@/components/ui/form-modal";
import { Timeline, type ActivityRow } from "@/components/shared/timeline";
import { TaskList, type TaskRow } from "@/components/shared/task-list";
import { DocumentList, DOC_SELECT, type DocRow } from "@/components/shared/document-list";
import { UploadModal } from "@/components/shared/upload-modal";
import { ActivityModal } from "@/components/shared/activity-modal";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityOptions, getStaffOptions } from "@/lib/queries";
import { ahoraLocal, fecha, fechaHora, hoyISO, isoToMadridLocal } from "@/lib/format";
import { CLAIM_STATUS } from "@/lib/labels";
import { addActivity, addTask } from "@/app/(app)/incidencias/actions";
import { setClaimStatus, updateClaim } from "../actions";
import { ClaimEdit } from "./claim-edit";

export default async function SiniestroPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: c } = await supabase.from("claims_view").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: canEdit }, { data: tasks }, { data: docs }, { data: activity }, staff, communities, { data: incidents }] = await Promise.all([
    supabase.rpc("can_edit_claim", { p_claim: id }),
    supabase.from("tasks").select("id, title, done, done_at, due_on, notes, assignee_id, assignee:staff!tasks_assignee_id_fkey(short_name), done_by_staff:staff!tasks_done_by_fkey(short_name)").eq("claim_id", id).order("sort_order"),
    supabase.from("documents").select(DOC_SELECT).eq("claim_id", id).order("created_at", { ascending: false }),
    supabase.from("activity_view").select("*").eq("claim_id", id).order("occurred_at", { ascending: false }),
    getStaffOptions(), getCommunityOptions(),
    supabase.from("incidents").select("id, code, title, community_id").eq("community_id", c.community_id),
  ]);
  const editable = !!canEdit;
  const resolve = Object.fromEntries(staff.map((s) => [s.id, s.full_name]));
  return (
    <div>
      <PageHeader back={<Link href="/siniestros" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Siniestros</Link>}
        title={`Siniestro ${c.code}`} subtitle={<span className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge entity="siniestro" status={c.status} /><span>· {c.community_name} · Gestora: {c.manager_name ?? "sin asignar"}</span></span>}
        actions={<>
          <ActivityModal action={addActivity.bind(null, { claim_id: id, community_id: c.community_id, ...(c.incident_id ? { incident_id: c.incident_id } : {}) })} nowLocal={ahoraLocal()} />
          <UploadModal links={{ claim_id: id, community_id: c.community_id, incident_id: c.incident_id }} folder={`siniestros/${id}`} />
          {editable && <ClaimEdit action={updateClaim.bind(null, id)} communities={communities} incidents={incidents ?? []} staff={staff} today={hoyISO()}
            defaults={{ ...c, visit_local: isoToMadridLocal(c.visit_at) }} />}
          {editable && (
            <FormModal trigger="Cambiar estado" triggerVariant="primary" title="Estado del expediente" action={setClaimStatus.bind(null, id)} submitLabel="Guardar">
              <Field label="Estado" htmlFor="status"><Select id="status" name="status" defaultValue={c.status}>{Object.entries(CLAIM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
              <Field label="Comentario" htmlFor="comment"><Textarea id="comment" name="comment" rows={3} /></Field>
            </FormModal>
          )}
        </>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card><CardHeader title="Datos del siniestro" /><CardBody>
            <DataList items={[
              ["Comunidad", <Link key="c" href={`/comunidades/${c.community_id}`} className="text-brand hover:underline">{c.community_name}</Link>],
              ["Incidencia", c.incident_id ? <Link key="i" href={`/incidencias/${c.incident_id}`} className="text-brand hover:underline">{c.incident_code}</Link> : null],
              ["Aseguradora", c.insurer], ["Número de póliza", c.policy_number], ["Número de expediente", c.claim_number],
              ["Fecha del siniestro", fecha(c.occurred_on)], ["Fecha de comunicación", fecha(c.communicated_on)],
              ["Perito", c.adjuster_name], ["Teléfono del perito", c.adjuster_phone], ["Visita", c.visit_at ? fechaHora(c.visit_at) : null],
              ["Descripción", c.description], ["Observaciones", c.notes],
            ]} />
          </CardBody></Card>
          <Card>
            <CardHeader title="Checklist del siniestro" actions={editable && (
              <FormModal trigger={<><Plus size={16} /> Tarea</>} triggerSize="sm" title="Nueva tarea" action={addTask.bind(null, { claim_id: id })} submitLabel="Añadir">
                <Field label="Tarea" htmlFor="title" required><Input id="title" name="title" required /></Field>
                <Field label="Responsable" htmlFor="assignee_id"><Select id="assignee_id" name="assignee_id" defaultValue={c.manager_id ?? ""}><option value="">Sin asignar</option>{staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select></Field>
                <Field label="Fecha límite" htmlFor="due_on"><Input id="due_on" name="due_on" type="date" /></Field>
              </FormModal>
            )} />
            <CardBody>{tasks?.length ? <TaskList tasks={tasks as unknown as TaskRow[]} staff={staff.filter((s) => s.active)} canEdit={editable} meId={me.id} today={hoyISO()} /> : <EmptyState title="Sin tareas" />}</CardBody>
          </Card>
          <Card><CardHeader title="Historial del expediente" /><CardBody><Timeline items={(activity ?? []) as ActivityRow[]} resolve={resolve} /></CardBody></Card>
        </div>
        <Card className="h-fit"><CardHeader title="Fotografías, informes y documentos" /><CardBody><DocumentList docs={(docs ?? []) as unknown as DocRow[]} /></CardBody></Card>
      </div>
    </div>
  );
}
