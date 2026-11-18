"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { ActionResult } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Introduzca un correo válido."),
  password: z.string().min(1, "Introduzca la contraseña."),
});

export async function signIn(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Mensaje genérico: no revela si el correo existe.
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }
  const { data: staff } = await supabase.from("staff").select("id").eq("active", true).limit(1);
  if (!staff?.length) {
    await supabase.auth.signOut();
    return { ok: false, error: "Su usuario no está activo en AR Incidencias. Contacte con Dirección." };
  }
  redirect("/");
}

export async function requestPasswordReset(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { ok: false, error: "Introduzca un correo válido." };
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? env.siteUrl;
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${origin}/auth/nueva-contrasena` });
  // Respuesta idéntica exista o no la cuenta.
  return { ok: true, message: "Si el correo pertenece a una cuenta activa, recibirá un enlace para restablecer la contraseña." };
}

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres.")
      .regex(/[A-Za-z]/, "Incluya al menos una letra.")
      .regex(/\d/, "Incluya al menos un número."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden.", path: ["confirm"] });

export async function setNewPassword(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: "No se pudo guardar la contraseña. Solicite un nuevo enlace." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
