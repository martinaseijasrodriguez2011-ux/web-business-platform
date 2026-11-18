"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";

export async function markAllRead() {
  const me = await requireStaff();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", me.id).is("read_at", null);
  revalidatePath("/", "layout");
}

/** Marca como leída y abre el registro vinculado (solo rutas internas). */
export async function openNotification(id: string, link: string | null) {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
  revalidatePath("/", "layout");
  redirect(link && link.startsWith("/") && !link.startsWith("//") ? link : "/notificaciones");
}
