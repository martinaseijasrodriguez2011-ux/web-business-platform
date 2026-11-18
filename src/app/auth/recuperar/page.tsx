import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Brand className="mb-10" />
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-ink-3">Le enviaremos un enlace seguro de un solo uso.</p>
        <div className="mt-6"><ResetForm /></div>
        <p className="mt-6 text-center text-sm"><Link href="/login" className="text-brand hover:underline">Volver al acceso</Link></p>
      </div>
    </main>
  );
}
