import "server-only";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/** URL pública del bucket corporativo (logotipo y fotografías de perfil). */
export function corporateUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/corporativo/${path}`;
}

/** Enlace temporal (por defecto 10 minutos) a un documento privado. */
export async function signedUrl(path: string, seconds = 600, download?: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("documentos").createSignedUrl(path, seconds, download ? { download } : undefined);
  return data?.signedUrl ?? null;
}
