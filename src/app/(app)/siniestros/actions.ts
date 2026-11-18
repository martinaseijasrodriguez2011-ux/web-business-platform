"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError, NO_PERMISSION, s } from "@/lib/action-utils";
import { madridLocalToISO } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

const STATUSES = ["pendiente_comunicar", "comunicado", "pendiente_perito", "visita_programada", "pendiente_valoracion", "aceptado", "rechazado", "en_reparacion", "finalizado", "cerrado"] as const;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const schema = z.object({
  community_id: z.string({ message: "Seleccione la comunidad." }).uuid("Seleccione la comunidad."),
  incident_id: z.string().uuid().nullable(),
  manager_id: z.string().uuid().nullable(),
  insurer: z.string().max(200).nullable(), policy_number: z.string().max(100).nullable(), claim_number: z.string().max(100).nullable(),
  occurred_on: date, communicated_on: date,
  description: z.string().max(10000).nullable(),
  adjuster_name: z.string().max(200).nullable(), adjuster_phone: z.string().max(60).nullable(),
  visit_at: z.string().nullable(),
  notes: z.string().max(5000).nullable(),
});

function payload(fd: FormData) {
  const visit = s(fd, "visit_at");
  return {
    community_id: s(fd, "community_id"), incident_id: s(fd, "incident_id"), manager_id: s(fd, "manager_id"), insurer: s(fd, "insurer"),
    policy_number: s(fd, "policy_number"), claim_number: s(fd, "claim_number"), occurred_on: s(fd, "occurred_on"), communicated_on: s(fd, "communicated_on"),
    description: s(fd, "description"), adjuster_name: s(fd, "adjuster_name"), adjuster_phone: s(fd, "adjuster_phone"),
    visit_at: visit ? madridLocalToISO(visit) : null, notes: s(fd, "notes"),
  };
}

export async function createClaim(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = schema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const status = z.enum(STATUSES).safeParse(s(fd, "status") ?? "pendiente_comunicar");
  const supabase = await createClient();
  const { data, error } = await supabase.from("claims").insert({ ...parsed.data, status: status.success ? status.data : "pendiente_comunicar" }).select("id").single();
  if (error) return dbError(error, "No se pudo registrar el siniestro.");
  if (fd.get("apply_checklist") === "on") {
    const { data: tpl } = await supabase.from("checklist_templates").select("id").eq("kind", "siniestro").eq("active", true).limit(1).maybeSingle();
    if (tpl) await supabase.rpc("apply_checklist", { p_template: tpl.id, p_claim: data.id });
  }
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export async function updateClaim(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = schema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("claims").update(parsed.data).eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath(`/siniestros/${id}`);
  return { ok: true, id, message: "Siniestro actualizado." };
}

export async function setClaimStatus(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const status = z.enum(STATUSES).safeParse(s(fd, "status"));
  if (!status.success) return { ok: false, error: "Seleccione un estado." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("claims").update({ status: status.data }).eq("id", id).select("id, community_id, incident_id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  const comment = s(fd, "comment");
  if (comment) await supabase.from("activity").insert({ kind: "comentario", claim_id: id, incident_id: data[0].incident_id, community_id: data[0].community_id, summary: "Comentario sobre el siniestro", body: comment });
  revalidatePath(`/siniestros/${id}`);
  return { ok: true, message: "Estado actualizado." };
}
