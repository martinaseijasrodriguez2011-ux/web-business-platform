"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Alert } from "./form";
import { Button } from "./button";
import type { ActionResult } from "@/lib/types";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * Formulario conectado a una Server Action. Muestra errores del servidor y
 * el estado de envío. La validación definitiva siempre se hace en servidor.
 */
export function ActionForm({
  action, children, submitLabel = "Guardar", className, onSuccess, resetOnSuccess, footer, submitVariant,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  onSuccess?: (r: ActionResult) => void;
  resetOnSuccess?: boolean;
  footer?: React.ReactNode;
  submitVariant?: "primary" | "danger" | "success" | "secondary";
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; });

  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccessRef.current?.(state);
    }
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <div className="mt-4"><Alert>{state.error}</Alert></div>}
      {state?.ok && state.message && <div className="mt-4"><Alert tone="verde">{state.message}</Alert></div>}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {footer}
        <SubmitButton variant={submitVariant}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function SubmitButton({ children, variant = "primary", size }: { children: React.ReactNode; variant?: "primary" | "danger" | "success" | "secondary"; size?: "sm" | "md" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} aria-busy={pending}>
      {pending ? "Guardando…" : children}
    </Button>
  );
}
