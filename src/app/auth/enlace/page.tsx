"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Brand } from "@/components/layout/brand";
import { Alert } from "@/components/ui/form";

/**
 * Enlaces de invitación o recuperación con los tokens en el fragmento (#…),
 * formato que usan las plantillas de correo por defecto de Supabase.
 * El fragmento no llega al servidor, así que se procesa en el navegador.
 */
export default function EnlacePage() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    if (!access_token || !refresh_token) {
      setError(params.get("error_description")?.replace(/\+/g, " ") ?? "El enlace no es válido o ha caducado. Solicite uno nuevo.");
      return;
    }
    createClient().auth.setSession({ access_token, refresh_token }).then(({ error: e }) => {
      if (e) { setError("El enlace no es válido o ha caducado. Solicite uno nuevo."); return; }
      window.history.replaceState(null, "", window.location.pathname);
      window.location.replace(type === "invite" || type === "recovery" ? "/auth/nueva-contrasena" : "/");
    });
  }, []);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Brand className="mb-10" />
        {error ? (
          <div className="space-y-4"><Alert>{error}</Alert><Link href="/login" className="text-sm text-brand hover:underline">Ir al acceso</Link></div>
        ) : <p className="text-sm text-ink-3">Comprobando el enlace…</p>}
      </div>
    </main>
  );
}
