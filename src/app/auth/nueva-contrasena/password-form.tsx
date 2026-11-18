"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { setNewPassword } from "@/app/login/actions";

export function PasswordForm() {
  return (
    <ActionForm action={setNewPassword} submitLabel="Guardar y entrar" className="space-y-4">
      <Field label="Nueva contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Repita la contraseña" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
    </ActionForm>
  );
}
