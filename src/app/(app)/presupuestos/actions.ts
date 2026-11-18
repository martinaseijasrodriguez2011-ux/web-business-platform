"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError, money, NO_PERMISSION, s } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const budgetSchema = z.object({
  community_id: z.string().uuid().nullable(),
  incident_id: z.string().uuid().nullable(),
  provider_id: z.string().uuid().nullable(),
  requested_on: date, received_on: date, valid_until: date,
  concept: z.string({ message: "Indique el concepto." }).min(2, "Indique el concepto.").max(300),
  description: z.string().max(10000).nullable(),
  base_amount: z.number({ message: "Base imponible no válida." }).min(0, "La base imponible no puede ser negativa.").max(9999999999).nullable(),
  vat_rate: z.number({ message: "Tipo de IVA no válido." }).min(0).max(100),
  execution_term: z.string().max(200).nullable(),
  conditions: z.string().max(5000).nullable(),
}).refine((v) => v.community_id || v.incident_id, { message: "Seleccione la comunidad o la incidencia." });

function payload(fd: FormData) {
  const base = money(fd, "base_amount");
  const vat = money(fd, "vat_rate");
  return {
    community_id: s(fd, "community_id"), incident_id: s(fd, "incident_id"), provider_id: s(fd, "provider_id"),
    requested_on: s(fd, "requested_on"), received_on: s(fd, "received_on"), valid_until: s(fd, "valid_until"),
    concept: s(fd, "concept"), description: s(fd, "description"),
    base_amount: Number.isNaN(base) ? undefined : base, vat_rate: vat === null || Number.isNaN(vat) ? undefined : vat,
    execution_term: s(fd, "execution_term"), conditions: s(fd, "conditions"),
  };
}

export async function createBudget(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = budgetSchema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const status = z.enum(["solicitado", "recibido"]).safeParse(s(fd, "status") ?? "solicitado");
  if (!status.success) return { ok: false, error: "Estado inicial no válido." };
  if (status.data === "recibido" && parsed.data.base_amount === null) return { ok: false, error: "Para un presupuesto recibido, indique la base imponible." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("budgets")
    .insert({ ...parsed.data, community_id: parsed.data.community_id ?? "", status: status.data }).select("id").single();
  if (error) return dbError(error, "No se pudo crear el presupuesto.");
  // Avance del estado de la incidencia (nunca la cierra)
  if (parsed.data.incident_id) {
    const target = status.data === "recibido" ? "presupuesto_recibido" : "presupuesto_solicitado";
    await supabase.from("incidents").update({ status: target }).eq("id", parsed.data.incident_id)
      .in("status", ["nueva", "pendiente_revision", "en_curso", "pendiente_proveedor", ...(target === "presupuesto_recibido" ? ["presupuesto_solicitado" as const] : [])]);
  }
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export async function updateBudget(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = budgetSchema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { community_id, ...rest } = parsed.data;
  const { data, error } = await supabase.from("budgets").update({ ...rest, ...(community_id ? { community_id } : {}) }).eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath(`/presupuestos/${id}`);
  return { ok: true, message: "Presupuesto actualizado." };
}

export async function markReceived(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const base = money(fd, "base_amount");
  const vat = money(fd, "vat_rate");
  if (base === null || Number.isNaN(base) || base < 0) return { ok: false, error: "Indique una base imponible válida." };
  if (vat === null || Number.isNaN(vat) || vat < 0 || vat > 100) return { ok: false, error: "Indique un tipo de IVA válido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("budgets")
    .update({ status: "recibido", base_amount: base, vat_rate: vat, received_on: s(fd, "received_on") })
    .eq("id", id).eq("status", "solicitado").select("id, incident_id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  if (data[0].incident_id) {
    await supabase.from("incidents").update({ status: "presupuesto_recibido" }).eq("id", data[0].incident_id)
      .in("status", ["nueva", "pendiente_revision", "en_curso", "pendiente_proveedor", "presupuesto_solicitado"]);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Presupuesto marcado como recibido." };
}

export async function registerPresidentAuthorization(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const name = s(fd, "authorized_by_name");
  const amount = money(fd, "amount");
  const medium = s(fd, "medium");
  if (!name) return { ok: false, error: "Indique quién autoriza." };
  if (amount === null || Number.isNaN(amount) || amount < 0) return { ok: false, error: "Indique el importe autorizado." };
  const supabase = await createClient();
  const { error } = await supabase.from("budget_authorizations").insert({
    budget_id: id, kind: "presidente", authorized_by_name: name, amount, medium: medium as never,
    authorized_on: s(fd, "authorized_on") ?? undefined, notes: s(fd, "notes"), document_id: s(fd, "document_id"),
  });
  if (error) return dbError(error);
  // Si aún no está pendiente, se marca como pendiente de autorización interna
  await supabase.from("budgets").update({ status: "pendiente_autorizacion" }).eq("id", id).in("status", ["recibido"]);
  revalidatePath(`/presupuestos/${id}`);
  return { ok: true, message: "Autorización del presidente registrada. Recuerde que no sustituye la aprobación interna." };
}

export async function approveBudget(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_budget", { p_budget: id, p_notes: s(fd, "notes") ?? undefined });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  const kind = (data as { kind?: string })?.kind;
  return { ok: true, message: kind === "autorizacion_superior" ? "Presupuesto aprobado con autorización superior." : "Presupuesto aprobado." };
}

export async function requestSuperior(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_superior_approval", { p_budget: id, p_notes: s(fd, "notes") ?? undefined });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Solicitud enviada a Dirección y Coordinación." };
}

export async function rejectBudget(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const reason = s(fd, "reason");
  if (!reason) return { ok: false, error: "Indique el motivo del rechazo." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_budget", { p_budget: id, p_reason: reason });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Presupuesto rechazado. Se conserva en el historial." };
}

export async function cancelBudget(id: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.from("budgets").update({ status: "cancelado" }).eq("id", id).in("status", ["solicitado", "recibido", "pendiente_autorizacion"]).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath(`/presupuestos/${id}`);
  return { ok: true };
}
