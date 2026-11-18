"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/form";
import { requestPasswordReset } from "@/app/login/actions";

export function ResetForm() {
  return (
    <ActionForm action={requestPasswordReset} submitLabel="Enviar enlace" resetOnSuccess>
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="username" />
      </Field>
    </ActionForm>
  );
}
