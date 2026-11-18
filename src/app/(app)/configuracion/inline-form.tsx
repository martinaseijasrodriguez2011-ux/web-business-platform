"use client";

import { ActionForm } from "@/components/ui/action-form";
import type { ActionResult } from "@/lib/types";

export function ActionFormInline({ action, children }: { action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>; children: React.ReactNode }) {
  return <ActionForm action={action} submitLabel="Guardar">{children}</ActionForm>;
}
