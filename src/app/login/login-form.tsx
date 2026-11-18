"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { signIn } from "./actions";

export function LoginForm() {
  return (
    <ActionForm action={signIn} submitLabel="Entrar" className="space-y-4">
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
    </ActionForm>
  );
}
