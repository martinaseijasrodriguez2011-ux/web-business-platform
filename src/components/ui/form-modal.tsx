"use client";

import { Modal } from "./modal";
import { ActionForm } from "./action-form";
import type { ActionResult } from "@/lib/types";

/** Ventana modal con formulario conectado a una Server Action; se cierra al guardar. */
export function FormModal({
  trigger, title, description, action, children, submitLabel, triggerVariant = "secondary", triggerSize = "md", size = "md", submitVariant,
}: {
  trigger: React.ReactNode; title: string; description?: string;
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  children: React.ReactNode; submitLabel?: string;
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger" | "success"; triggerSize?: "sm" | "md"; size?: "sm" | "md" | "lg";
  submitVariant?: "primary" | "danger" | "success" | "secondary";
}) {
  return (
    <Modal trigger={trigger} title={title} description={description} triggerVariant={triggerVariant} triggerSize={triggerSize} size={size}>
      {(close) => (
        <ActionForm action={action} onSuccess={close} submitLabel={submitLabel} submitVariant={submitVariant} className="space-y-3">
          {children}
        </ActionForm>
      )}
    </Modal>
  );
}
