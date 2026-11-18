"use client";

import { MessageSquarePlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ActivityForm } from "./activity-form";
import type { ActionResult } from "@/lib/types";

export function ActivityModal({ action, nowLocal, triggerVariant = "secondary" }: { action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult>; nowLocal: string; triggerVariant?: "primary" | "secondary" }) {
  return (
    <Modal trigger={<><MessageSquarePlus size={16} /> Añadir actuación</>} title="Registrar actuación" description="Llamadas, correos, conversaciones con proveedores o presidentes, visitas y comentarios." triggerVariant={triggerVariant}>
      {(close) => <ActivityForm action={action} onDone={close} nowLocal={nowLocal} />}
    </Modal>
  );
}
