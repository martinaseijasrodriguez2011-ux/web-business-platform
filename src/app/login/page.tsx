import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { Alert } from "@/components/ui/form";
import { LoginForm } from "./login-form";

export const metadata = { title: "Acceso" };

const errors: Record<string, string> = {
  sin_acceso: "Su cuenta no está vinculada a un usuario activo de AR Incidencias.",
  enlace: "El enlace no es válido o ha caducado. Solicite uno nuevo.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-brand p-10 text-white lg:flex">
        <Brand inverted />
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">Organización, seguimiento y control. Todo en un mismo lugar.</p>
          <p className="mt-4 text-white/75">Plataforma interna de gestión de comunidades, incidencias, presupuestos y control económico.</p>
        </div>
        <p className="text-xs text-white/60">Acceso exclusivo para el equipo de Altayó &amp; Rodríguez.</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Brand className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-ink-3">Introduzca su usuario y contraseña.</p>
          {error && errors[error] && <div className="mt-6"><Alert>{errors[error]}</Alert></div>}
          <div className="mt-6"><LoginForm /></div>
          <p className="mt-6 text-center text-sm">
            <Link href="/auth/recuperar" className="text-brand hover:underline">¿Ha olvidado la contraseña?</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
