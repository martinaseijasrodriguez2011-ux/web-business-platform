import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { createClient } from "@/lib/supabase/server";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Establecer contraseña" };

export default async function NuevaContrasenaPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?error=enlace");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Brand className="mb-10" />
        <h1 className="text-2xl font-semibold tracking-tight">Establecer contraseña</h1>
        <p className="mt-1 text-sm text-ink-3">Mínimo 10 caracteres, con letras y números.</p>
        <div className="mt-6"><PasswordForm /></div>
      </div>
    </main>
  );
}
