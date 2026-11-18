import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cliente con clave de servicio. SOLO para operaciones administrativas que
 * Supabase no permite con la sesión del usuario (enviar invitaciones).
 * Nunca se importa desde componentes de cliente ("server-only").
 * Antes de usarlo, la acción debe comprobar que la persona es supervisora.
 */
export function createAdminClient() {
  if (!env.serviceRoleKey) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. Las invitaciones no están disponibles.");
  }
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
