import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/types";

/** Persona conectada (ficha del equipo). Se resuelve una vez por petición. */
export const getCurrentStaff = cache(async (): Promise<Staff | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase.from("staff").select("*").eq("user_id", uid).eq("active", true).maybeSingle();
  return (data as Staff) ?? null;
});

/** Exige sesión y ficha activa; si no, envía al acceso. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login?error=sin_acceso");
  return staff;
}

export function isSupervisor(staff: Pick<Staff, "role"> | null) {
  return staff?.role === "direccion" || staff?.role === "coordinacion";
}

export async function requireSupervisor(): Promise<Staff> {
  const staff = await requireStaff();
  if (!isSupervisor(staff)) redirect("/?error=permisos");
  return staff;
}
