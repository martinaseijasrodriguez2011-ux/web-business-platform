"use client";

import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ClaimForm } from "../claim-form";
import type { ActionResult } from "@/lib/types";

export function ClaimEdit(props: Omit<React.ComponentProps<typeof ClaimForm>, "mode" | "cancelHref"> & { action: (p: ActionResult | null, fd: FormData) => Promise<ActionResult> }) {
  return (
    <Modal trigger={<><Pencil size={16} /> Editar</>} title="Editar siniestro" size="lg">
      <ClaimForm {...props} mode="edit" cancelHref="#" />
    </Modal>
  );
}
