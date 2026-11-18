"use client";

import { Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { DocumentUploader, type DocLinks } from "./document-uploader";

export function UploadModal({ links, folder, label = "Añadir documento", defaultType, triggerVariant = "secondary", triggerSize = "md" }: { links: DocLinks; folder: string; label?: string; defaultType?: string; triggerVariant?: "primary" | "secondary" | "ghost"; triggerSize?: "sm" | "md" }) {
  return (
    <Modal trigger={<><Paperclip size={16} /> {label}</>} title="Añadir documentos" description="Los archivos se guardan de forma privada y quedan registrados en el historial." triggerVariant={triggerVariant} triggerSize={triggerSize}>
      {(close) => <DocumentUploader links={links} folder={folder} defaultType={defaultType} onDone={close} />}
    </Modal>
  );
}
