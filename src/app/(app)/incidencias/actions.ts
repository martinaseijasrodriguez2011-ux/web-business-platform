"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError, NO_PERMISSION, s } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";
import { madridLocalToISO } from "@/lib/format";

const PRIORITIES = ["baja", "normal", "alta", "urgente"] as const;
const STATUSES = [
  "nueva", "pendiente_revision", "en_curso", "pendiente_proveedor", "presupuesto_solicitado", "presupuesto_recibido",
  "pendiente_aprobacion", "aprobada", "reparacion_programada", "reparacion_realizada", "factura_pendiente",
  "pendiente_pago", "resuelta", "cerrada", "cancelada",
] as const;

const uuid = z.string().uuid();
const optUuid = uuid.nullable();
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

function incidentPayload(fd: FormData) {
  return {
    community_id: s(fd, "community_id"),
    manager_id: s(fd, "manager_id"),
    reporter_name: s(fd, "reporter_name"),
    reporter_unit: s(fd, "reporter_unit"),
    reporter_contact: s(fd, "reporter_contact"),
    title: s(fd, "title"),
    description: s(fd, "description"),
    category_id: s(fd, "category_id"),
    subcategory_id: s(fd, "subcategory_id"),
    priority: s(fd, "priority") ?? "normal",
    provider_id: s(fd, "provider_id"),
    communicated_on: s(fd, "communicated_on"),
    planned_on: s(fd, "planned_on"),
    due_on: s(fd, "due_on"),
    notes: s(fd, "notes"),
  };
}

const incidentSchema = z.object({
  community_id: uuid.nullable().refine((v) => v !== null, "Seleccione la comunidad."),
  manager_id: optUuid,
  reporter_name: z.string().max(200).nullable(),
  reporter_unit: z.string().max(60).nullable(),
  reporter_contact: z.string().max(200).nullable(),
  title: z.string({ message: "Indique un título." }).min(3, "El título debe tener al menos 3 caracteres.").max(200),
  description: z.string().max(10000).nullable(),
  category_id: optUuid,
  subcategory_id: optUuid,
  priority: z.enum(PRIORITIES),
  provider_id: optUuid,
  communicated_on: optDate,
  planned_on: optDate,
  due_on: optDate,
  notes: z.string().max(5000).nullable(),
});

export async function createIncident(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = incidentSchema.safeParse(incidentPayload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const statusParsed = z.enum(["nueva", "pendiente_revision", "en_curso"]).safeParse(s(fd, "status") ?? "nueva");
  if (!statusParsed.success) return { ok: false, error: "Estado inicial no válido." };
  const status = statusParsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.from("incidents").insert({ ...parsed.data, status }).select("id").single();
  if (error) return dbError(error, "No se pudo crear la incidencia.");
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export async function updateIncident(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = incidentSchema.safeParse(incidentPayload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("incidents").update(parsed.data).eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath(`/incidencias/${id}`);
  return { ok: true, message: "Cambios guardados. Quedan registrados en el historial." };
}

export async function changeIncidentStatus(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const status = z.enum(STATUSES).safeParse(fd.get("status"));
  if (!status.success) return { ok: false, error: "Seleccione un estado." };
  const comment = s(fd, "comment");
  if (status.data === "cerrada" && fd.get("confirm_close") !== "on") {
    return { ok: false, error: "Confirme que ha revisado el resultado antes de cerrar la incidencia." };
  }
  if ((status.data === "cancelada" || status.data === "cerrada") && !comment) {
    return { ok: false, error: "Indique un comentario que justifique el cierre o la cancelación." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("incidents").update({ status: status.data }).eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  if (comment) {
    await supabase.from("activity").insert({ kind: "comentario", incident_id: id, summary: "Comentario sobre el cambio de estado", body: comment });
  }
  revalidatePath(`/incidencias/${id}`);
  return { ok: true, message: "Estado actualizado." };
}

const activitySchema = z.object({
  kind: z.enum(["actuacion", "llamada", "correo", "comentario", "visita", "conversacion"]),
  summary: z.string({ message: "Describa brevemente la actuación." }).min(3, "Describa brevemente la actuación.").max(300),
  body: z.string().max(10000).nullable(),
  counterpart: z.string().max(200).nullable(),
  occurred_at: z.string().nullable(),
});

export async function addActivity(target: { incident_id?: string; claim_id?: string; community_id?: string }, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = activitySchema.safeParse({
    kind: s(fd, "kind"), summary: s(fd, "summary"), body: s(fd, "body"), counterpart: s(fd, "counterpart"), occurred_at: s(fd, "occurred_at"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const occurredIso = parsed.data.occurred_at ? madridLocalToISO(parsed.data.occurred_at) : new Date().toISOString();
  if (!occurredIso) return { ok: false, error: "Fecha no válida." };
  const occurred = new Date(occurredIso);
  const supabase = await createClient();
  const { error } = await supabase.from("activity").insert({ ...parsed.data, ...target, occurred_at: occurred.toISOString() });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Actuación registrada." };
}

export async function addTask(target: { incident_id?: string; claim_id?: string }, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const title = s(fd, "title");
  if (!title || title.length < 2) return { ok: false, error: "Indique la tarea." };
  const supabase = await createClient();
  const { count } = await supabase.from("tasks").select("id", { count: "exact", head: true })
    .match(target.incident_id ? { incident_id: target.incident_id } : { claim_id: target.claim_id! });
  const { error } = await supabase.from("tasks").insert({
    ...target, title, assignee_id: s(fd, "assignee_id"), due_on: s(fd, "due_on"), notes: s(fd, "notes"), sort_order: (count ?? 0) + 1,
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function toggleTask(taskId: string, done: boolean): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").update({ done }).eq("id", taskId).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateTask(taskId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const title = s(fd, "title");
  if (!title) return { ok: false, error: "Indique la tarea." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks")
    .update({ title, assignee_id: s(fd, "assignee_id"), due_on: s(fd, "due_on"), notes: s(fd, "notes") })
    .eq("id", taskId).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath("/", "layout");
  return { ok: true, message: "Tarea actualizada." };
}

export async function applyChecklist(target: { incident_id?: string; claim_id?: string }, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const template = s(fd, "template_id");
  if (!template) return { ok: false, error: "Seleccione una plantilla." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_checklist", {
    p_template: template, p_incident: target.incident_id, p_claim: target.claim_id,
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: `Se han añadido ${data} tareas.` };
}
