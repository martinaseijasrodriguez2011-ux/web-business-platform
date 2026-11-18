"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireSupervisor } from "@/lib/auth";
import { dbError, money, NO_PERMISSION, s } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";
import type { Database } from "@/lib/database.types";

const date = z.string({ message: "Indique la fecha." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida.");
const invoiceSchema = z.object({
  invoice_number: z.string({ message: "Indique el número de factura." }).min(1).max(60),
  provider_id: z.string({ message: "Seleccione el proveedor." }).uuid("Seleccione el proveedor."),
  community_id: z.string().uuid().nullable(),
  incident_id: z.string().uuid().nullable(),
  budget_id: z.string().uuid().nullable(),
  invoice_date: date,
  received_on: date,
  base_amount: z.number({ message: "Indique la base imponible." }).min(0, "La base imponible no puede ser negativa."),
  vat_rate: z.number({ message: "Indique el tipo de IVA." }).min(0).max(100),
  notes: z.string().max(5000).nullable(),
}).refine((v) => v.community_id || v.incident_id || v.budget_id, { message: "Seleccione la comunidad." });

function payload(fd: FormData) {
  const base = money(fd, "base_amount");
  const vat = money(fd, "vat_rate");
  return {
    invoice_number: s(fd, "invoice_number"), provider_id: s(fd, "provider_id"), community_id: s(fd, "community_id"),
    incident_id: s(fd, "incident_id"), budget_id: s(fd, "budget_id"), invoice_date: s(fd, "invoice_date"), received_on: s(fd, "received_on"),
    base_amount: base === null || Number.isNaN(base) ? undefined : base, vat_rate: vat === null || Number.isNaN(vat) ? undefined : vat, notes: s(fd, "notes"),
  };
}

export async function createInvoice(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = invoiceSchema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const status = z.enum(["recibida", "pendiente_revision", "pendiente_pago"]).safeParse(s(fd, "status") ?? "recibida");
  if (!status.success) return { ok: false, error: "Estado inicial no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices")
    .insert({ ...parsed.data, community_id: parsed.data.community_id ?? "", status: status.data }).select("id, incident_id").single();
  if (error) return dbError(error, "No se pudo registrar la factura.");
  if (data.incident_id) {
    await supabase.from("incidents").update({ status: "pendiente_pago" }).eq("id", data.incident_id)
      .in("status", ["aprobada", "reparacion_programada", "reparacion_realizada", "factura_pendiente"]);
  }
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

export async function setInvoiceStatus(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const status = z.enum(["recibida", "pendiente_revision", "pendiente_pago", "discrepancia"]).safeParse(s(fd, "status"));
  if (!status.success) return { ok: false, error: "Seleccione un estado. El estado «Pagada» solo se alcanza confirmando el pago." };
  const comment = s(fd, "comment");
  if (status.data === "discrepancia" && !comment) return { ok: false, error: "Describa la discrepancia." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").update({ status: status.data }).eq("id", id).select("id, incident_id, community_id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  if (comment) await supabase.from("activity").insert({ kind: "comentario", invoice_id: id, incident_id: data[0].incident_id, community_id: data[0].community_id, summary: "Comentario sobre la factura", body: comment });
  revalidatePath(`/facturas/${id}`);
  return { ok: true, message: "Estado actualizado." };
}

export async function updateInvoiceNotes(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const base = money(fd, "base_amount");
  const vat = money(fd, "vat_rate");
  const update: Database["public"]["Tables"]["invoices"]["Update"] = { notes: s(fd, "notes") };
  if (base !== null && !Number.isNaN(base)) update.base_amount = base;
  if (vat !== null && !Number.isNaN(vat)) update.vat_rate = vat;
  const invDate = s(fd, "invoice_date");
  if (invDate) update.invoice_date = invDate;
  const { data, error } = await supabase.from("invoices").update(update).eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath(`/facturas/${id}`);
  return { ok: true, message: "Factura actualizada." };
}

/** Solo Dirección y Coordinación (comprobado también en la base de datos). */
export async function confirmPayment(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const amount = money(fd, "amount");
  const paidOn = s(fd, "paid_on");
  if (amount === null || Number.isNaN(amount) || amount <= 0) return { ok: false, error: "Indique el importe pagado." };
  if (!paidOn) return { ok: false, error: "Indique la fecha del pago." };
  if (fd.get("confirm") !== "on") return { ok: false, error: "Marque la casilla de confirmación." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_payment", { p_invoice: id, p_amount: amount, p_paid_on: paidOn, p_notes: s(fd, "notes") ?? undefined });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: (data as { fully_paid?: boolean })?.fully_paid ? "Pago confirmado. La factura consta como pagada." : "Pago parcial registrado." };
}
