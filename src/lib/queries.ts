import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tone } from "@/lib/types";

export type Option = { id: string; name: string };

export const getStaffOptions = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("id, full_name, short_name, role, active").order("role").order("short_name");
  return (data ?? []) as { id: string; full_name: string; short_name: string; role: string; active: boolean }[];
});

export const getCommunityOptions = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("communities").select("id, name, code, manager_id").eq("active", true).order("name");
  return (data ?? []) as { id: string; name: string; code: string; manager_id: string | null }[];
});

export const getProviderOptions = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("providers").select("id, trade_name").eq("active", true).order("trade_name");
  return (data ?? []).map((p) => ({ id: p.id, name: p.trade_name })) as Option[];
});

export const getCategories = cache(async (scope: "incidencia" | "proveedor") => {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, name, parent_id, active, sort_order").eq("scope", scope).order("sort_order").order("name");
  return (data ?? []) as { id: string; name: string; parent_id: string | null; active: boolean; sort_order: number }[];
});

/** Etiquetas de estado configuradas (Configuración → Estados). */
export const getStatusLabels = cache(async (entity: "incidencia" | "presupuesto" | "factura" | "siniestro") => {
  const supabase = await createClient();
  const { data } = await supabase.from("status_labels").select("key, label, tone, sort_order, active").eq("entity", entity).order("sort_order");
  const map: Record<string, { label: string; tone: Tone }> = {};
  for (const r of data ?? []) map[r.key] = { label: r.label, tone: r.tone as Tone };
  return { map, list: (data ?? []) as { key: string; label: string; tone: Tone; active: boolean }[] };
});

export const getSettings = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("*").single();
  return data;
});
