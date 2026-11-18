"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError, NO_PERMISSION, s } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";

const schema = z.object({
  trade_name: z.string({ message: "Indique el nombre comercial." }).min(2, "Indique el nombre comercial.").max(200),
  company_name: z.string().max(200).nullable(),
  tax_id: z.string().max(20).nullable(),
  contact_person: z.string().max(200).nullable(),
  phone: z.string().max(60).nullable(),
  email: z.string().email("Correo no válido.").max(200).nullable(),
  address: z.string().max(300).nullable(),
  notes: z.string().max(5000).nullable(),
});

function payload(fd: FormData) {
  return {
    trade_name: s(fd, "trade_name"), company_name: s(fd, "company_name"), tax_id: s(fd, "tax_id")?.toUpperCase() ?? null,
    contact_person: s(fd, "contact_person"), phone: s(fd, "phone"), email: s(fd, "email")?.toLowerCase() ?? null, address: s(fd, "address"), notes: s(fd, "notes"),
  };
}

async function saveSpecialties(providerId: string, fd: FormData) {
  const supabase = await createClient();
  const ids = fd.getAll("specialties").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  await supabase.from("provider_specialties").delete().eq("provider_id", providerId);
  if (ids.length) await supabase.from("provider_specialties").insert(ids.map((category_id) => ({ provider_id: providerId, category_id })));
}

export async function createProvider(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = schema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: dup } = await supabase.from("providers").select("id, trade_name").ilike("trade_name", parsed.data.trade_name);
  if (dup?.length) return { ok: false, error: `Ya existe un proveedor con ese nombre: ${dup[0].trade_name}.` };
  const { data, error } = await supabase.from("providers").insert(parsed.data).select("id").single();
  if (error) return dbError(error, "No se pudo crear el proveedor.");
  await saveSpecialties(data.id, fd);
  revalidatePath("/proveedores");
  return { ok: true, id: data.id };
}

export async function updateProvider(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = schema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const active = fd.get("active");
  const { data, error } = await supabase.from("providers").update({ ...parsed.data, ...(active !== null ? { active: active === "true" } : {}) }).eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  await saveSpecialties(id, fd);
  revalidatePath(`/proveedores/${id}`);
  return { ok: true, id };
}
