import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Confirma enlaces de invitación y de recuperación (token_hash) y lleva a la
 * pantalla para establecer contraseña. Solo redirige a rutas internas.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  // Sin parámetros: el enlace trae los tokens en el fragmento (#…), que el
  // navegador conserva al redirigir; se procesan en /auth/enlace.
  if (!tokenHash && !code && !searchParams.get("error")) {
    return NextResponse.redirect(new URL("/auth/enlace", origin));
  }
  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (!ok) return NextResponse.redirect(new URL("/login?error=enlace", origin));
  const next = type === "invite" || type === "recovery" ? "/auth/nueva-contrasena" : "/";
  return NextResponse.redirect(new URL(next, origin));
}
