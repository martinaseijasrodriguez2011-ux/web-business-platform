"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { dbError, NO_PERMISSION, s } from "@/lib/action-utils";
import { madridLocalToISO } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

const KINDS = ["reparacion", "visita_proveedor", "visita_perito", "fecha_limite", "seguimiento", "recordatorio", "otro"] as const;

export async function addCalendarEvent(
  target: { incident_id?: string; community_id?: string; claim_id?: string },
  _: ActionResult | null, fd: FormData,
): Promise<ActionResult> {
  await requireStaff();
  const kind = z.enum(KINDS).safeParse(s(fd, "kind") ?? "otro");
  const title = s(fd, "title");
  if (!kind.success) return { ok: false, error: "Tipo de evento no válido." };
  if (!title) return { ok: false, error: "Indique un título." };
  const startsRaw = s(fd, "starts_at");
  const allDay = /^\d{4}-\d{2}-\d{2}$/.test(startsRaw ?? "");
  const starts = allDay ? madridLocalToISO(`${startsRaw}T09:00`) : startsRaw ? madridLocalToISO(startsRaw) : null;
  if (!starts) return { ok: false, error: "Indique la fecha y hora de inicio." };
  const endsRaw = s(fd, "ends_at");
  const ends = endsRaw ? madridLocalToISO(endsRaw) : null;
  if (ends && ends < starts) return { ok: false, error: "La hora de fin no puede ser anterior al inicio." };
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").insert({
    ...target,
    community_id: target.community_id ?? s(fd, "community_id"),
    incident_id: target.incident_id ?? s(fd, "incident_id"),
    kind: kind.data, title, starts_at: starts, ends_at: ends, all_day: allDay,
    staff_id: s(fd, "staff_id"), notes: s(fd, "notes"),
  });
  if (error) return dbError(error);
  revalidatePath("/", "layout");
  return { ok: true, message: "Evento programado." };
}

export async function cancelCalendarEvent(id: string): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_events").update({ cancelled: true }).eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath("/calendario");
  return { ok: true };
}
