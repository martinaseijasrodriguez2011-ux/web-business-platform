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
      <section className="relative hidden flex-col justify-between border-r border-line bg-white p-10 lg:flex">
        <span className="absolute inset-x-0 top-0 h-1 bg-brand-accent" aria-hidden />
        <Brand size="lg" />
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight text-ink">Organización, seguimiento y control. <span className="text-brand-accent">Todo en un mismo lugar.</span></p>
          <p className="mt-4 text-ink-2">Plataforma interna de gestión de comunidades, incidencias, presupuestos y control económico.</p>
        </div>
        <p className="text-xs text-ink-3">Acceso exclusivo para el equipo de Altayó &amp; Rodríguez.</p>
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
