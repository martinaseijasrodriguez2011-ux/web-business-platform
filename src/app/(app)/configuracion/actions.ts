"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupervisor } from "@/lib/auth";
import { dbError, money, NO_PERMISSION, s } from "@/lib/action-utils";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/types";

const done = (message?: string): ActionResult => { revalidatePath("/", "layout"); return { ok: true, message }; };

/* ---------- Usuarios ---------- */
export async function inviteStaff(staffId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const email = z.string().trim().toLowerCase().email("Introduzca un correo válido.").safeParse(fd.get("email"));
  if (!email.success) return { ok: false, error: email.error.issues[0].message };
  const supabase = await createClient();
  const { data: st } = await supabase.from("staff").select("id, user_id, email, active").eq("id", staffId).single();
  if (!st) return { ok: false, error: "Persona no encontrada." };
  if (!st.active) return { ok: false, error: "Active a la persona antes de invitarla." };
  if (st.user_id && st.email === email.data) return { ok: false, error: "Esta persona ya tiene acceso. Si ha olvidado la contraseña, puede recuperarla desde la pantalla de acceso." };
  if (st.user_id) return { ok: false, error: "Esta persona ya tiene una cuenta vinculada. Para cambiar su correo, contacte con el soporte técnico (requiere verificación)." };
  const { error: e1 } = await supabase.from("staff").update({ email: email.data, invited_at: new Date().toISOString() }).eq("id", staffId);
  if (e1) return dbError(e1, "No se pudo guardar el correo.");
  let admin;
  try { admin = createAdminClient(); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const origin = (await headers()).get("origin") ?? env.siteUrl;
  const { error } = await admin.auth.admin.inviteUserByEmail(email.data, { redirectTo: `${origin}/auth/confirmar` });
  if (error) {
    if (/already been registered|already exists/i.test(error.message)) {
      // La cuenta ya existía (p. ej. invitación previa): se vincula y se envía recuperación
      await admin.auth.resetPasswordForEmail(email.data, { redirectTo: `${origin}/auth/nueva-contrasena` });
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const u = list.users.find((x) => x.email?.toLowerCase() === email.data);
      if (u) await admin.from("staff").update({ user_id: u.id }).eq("id", staffId).is("user_id", null);
      return done("La cuenta ya existía: se ha vinculado y se ha enviado un enlace para establecer la contraseña.");
    }
    return { ok: false, error: `No se pudo enviar la invitación: ${error.message}` };
  }
  return done(`Invitación enviada a ${email.data}.`);
}

export async function updateStaff(staffId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const me = await requireSupervisor();
  const role = z.enum(["direccion", "coordinacion", "gestora"]).safeParse(s(fd, "role"));
  const fullName = s(fd, "full_name"); const shortName = s(fd, "short_name"); const position = s(fd, "position");
  if (!role.success || !fullName || !shortName || !position) return { ok: false, error: "Complete nombre, nombre corto, cargo y rol." };
  const active = s(fd, "active") !== "false";
  if (staffId === me.id && (!active || role.data !== me.role)) return { ok: false, error: "No puede desactivarse ni cambiar su propio rol." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("staff").update({ full_name: fullName, short_name: shortName, position, role: role.data, active }).eq("id", staffId).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  return done("Datos actualizados.");
}

export async function addStaff(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const fullName = s(fd, "full_name"); const shortName = s(fd, "short_name") ?? fullName?.split(" ")[0] ?? null;
  const role = z.enum(["direccion", "coordinacion", "gestora"]).safeParse(s(fd, "role") ?? "gestora");
  if (!fullName || !shortName || !role.success) return { ok: false, error: "Indique el nombre." };
  const supabase = await createClient();
  const { error } = await supabase.from("staff").insert({ full_name: fullName, short_name: shortName, position: s(fd, "position") ?? "Gestión de comunidades", role: role.data });
  if (error) return dbError(error);
  return done("Persona añadida. Envíele la invitación para que pueda acceder.");
}

/* ---------- Límites económicos ---------- */
export async function setApprovalLimit(staffId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const raw = s(fd, "approval_limit");
  const value = raw === null ? null : money(fd, "approval_limit");
  if (value !== null && (Number.isNaN(value) || value < 0)) return { ok: false, error: "Importe no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("staff").update({ approval_limit: value }).eq("id", staffId).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  return done(value === null ? "Límite marcado como pendiente de configurar." : "Límite actualizado. El cambio queda registrado.");
}

/* ---------- Categorías ---------- */
export async function addCategory(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const name = s(fd, "name");
  const scope = z.enum(["incidencia", "proveedor"]).safeParse(s(fd, "scope"));
  if (!name || !scope.success) return { ok: false, error: "Indique el nombre." };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name, scope: scope.data, parent_id: s(fd, "parent_id"), sort_order: 100 });
  if (error) return dbError(error);
  return done();
}

export async function updateCategory(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const name = s(fd, "name");
  if (!name) return { ok: false, error: "Indique el nombre." };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ name, active: s(fd, "active") !== "false" }).eq("id", id);
  if (error) return dbError(error);
  return done("Categoría actualizada.");
}

/* ---------- Estados ---------- */
export async function updateStatusLabel(entity: string, key: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const label = s(fd, "label");
  const tone = z.enum(["gris", "azul", "naranja", "rojo", "verde", "violeta"]).safeParse(s(fd, "tone"));
  if (!label || !tone.success) return { ok: false, error: "Indique etiqueta y color." };
  const supabase = await createClient();
  const { error } = await supabase.from("status_labels").update({ label, tone: tone.data, active: s(fd, "active") !== "false" }).eq("entity", entity).eq("key", key);
  if (error) return dbError(error);
  return done("Estado actualizado.");
}

/* ---------- Plantillas ---------- */
export async function addTemplate(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const name = s(fd, "name");
  const kind = z.enum(["reparacion", "siniestro", "otro"]).safeParse(s(fd, "kind"));
  if (!name || !kind.success) return { ok: false, error: "Indique nombre y tipo." };
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_templates").insert({ name, kind: kind.data });
  if (error) return dbError(error);
  return done();
}

export async function saveTemplateItems(templateId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const lines = (s(fd, "items") ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { ok: false, error: "La plantilla debe tener al menos una tarea." };
  if (lines.length > 60) return { ok: false, error: "Máximo 60 tareas por plantilla." };
  const supabase = await createClient();
  const { error: e1 } = await supabase.from("checklist_template_items").delete().eq("template_id", templateId);
  if (e1) return dbError(e1);
  const { error } = await supabase.from("checklist_template_items").insert(lines.map((title, i) => ({ template_id: templateId, title, sort_order: i + 1 })));
  if (error) return dbError(error);
  await supabase.from("checklist_templates").update({ name: s(fd, "name") ?? undefined, active: s(fd, "active") !== "false" }).eq("id", templateId);
  return done("Plantilla guardada. Las incidencias que ya tienen tareas no se modifican.");
}

/* ---------- Datos generales ---------- */
export async function saveSettings(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const color = s(fd, "primary_color");
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { ok: false, error: "El color debe tener el formato #RRGGBB." };
  const vat = money(fd, "default_vat_rate");
  const inactivity = Number(s(fd, "inactivity_days"));
  const dueSoon = Number(s(fd, "due_soon_days"));
  if (vat === null || Number.isNaN(vat) || vat < 0 || vat > 100) return { ok: false, error: "IVA por defecto no válido." };
  if (!Number.isInteger(inactivity) || inactivity < 1 || inactivity > 90) return { ok: false, error: "Días sin actividad: entre 1 y 90." };
  if (!Number.isInteger(dueSoon) || dueSoon < 0 || dueSoon > 30) return { ok: false, error: "Aviso de vencimiento: entre 0 y 30 días." };
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({
    company_name: s(fd, "company_name") ?? "Altayó & Rodríguez", primary_color: color, default_vat_rate: vat,
    inactivity_days: inactivity, due_soon_days: dueSoon, updated_at: new Date().toISOString(),
  }).eq("id", true);
  if (error) return dbError(error);
  return done("Configuración guardada.");
}

export async function setLogoPath(path: string | null): Promise<ActionResult> {
  await requireSupervisor();
  if (path && !path.startsWith("logo/")) return { ok: false, error: "Ruta no válida." };
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({ logo_path: path }).eq("id", true);
  if (error) return dbError(error);
  return done(path ? "Logotipo actualizado." : "Logotipo eliminado.");
}
