import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/types";

/** Traduce errores de base de datos a mensajes comprensibles. */
export function dbError(error: PostgrestError | { message: string; code?: string } | null, fallback = "No se pudo guardar."): ActionResult {
  if (!error) return { ok: false, error: fallback };
  const msg = error.message ?? "";
  if (error.code === "23505") return { ok: false, error: "Ya existe un registro con esos datos (duplicado)." };
  if (error.code === "23503") return { ok: false, error: "El registro está relacionado con datos que no existen o no se pueden eliminar." };
  if (error.code === "42501" || /row-level security/i.test(msg)) {
    const clean = msg.replace(/^LIMITE_\w+:\s*/, "");
    return { ok: false, error: /row-level security/i.test(msg) ? "No tiene permisos para realizar esta operación." : clean };
  }
  if (error.code === "P0001") return { ok: false, error: msg };
  if (error.code === "22P02") return { ok: false, error: "Algún dato tiene un formato no válido." };
  return { ok: false, error: `${fallback} (${msg})` };
}

export const NO_PERMISSION: ActionResult = { ok: false, error: "No tiene permisos para modificar este registro." };

/** Lee un campo de texto del formulario: cadena recortada o null. */
export function s(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function n(fd: FormData, key: string): number | null {
  const v = s(fd, key);
  if (v === null) return null;
  const num = Number(v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? num : NaN;
}

/** Números con decimales escritos en formato español o con punto. */
export function money(fd: FormData, key: string): number | null {
  const v = s(fd, key);
  if (v === null) return null;
  // "1.234,56" → 1234.56 · "1234.56" → 1234.56 · "1234,5" → 1234.5
  const normalized = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const num = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : NaN;
}
