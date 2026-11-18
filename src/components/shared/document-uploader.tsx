"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input, Select } from "@/components/ui/form";
import { DOC_TYPES } from "@/lib/labels";

export type DocLinks = {
  community_id?: string | null;
  incident_id?: string | null;
  budget_id?: string | null;
  invoice_id?: string | null;
  claim_id?: string | null;
  provider_id?: string | null;
  task_id?: string | null;
};

const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.heif,.webp,.mp4,.mov,.txt,.eml,.msg,.csv";
const MAX = 50 * 1024 * 1024;

function guessType(name: string, mime: string) {
  const n = name.toLowerCase();
  if (mime.startsWith("image/") || /\.(heic|heif)$/.test(n)) return "fotografia";
  if (mime.startsWith("video/")) return "video";
  if (/\.docx?$/.test(n)) return "word";
  if (/\.xlsx?$|\.csv$/.test(n)) return "excel";
  if (/\.(eml|msg)$/.test(n)) return "correo";
  return "otro";
}

function safeName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
}

/**
 * Sube archivos directamente al almacenamiento privado (sin enlaces públicos)
 * y registra sus metadatos. El servidor valida permisos mediante RLS.
 */
export function DocumentUploader({ links, folder, defaultType, onDone, compact }: { links: DocLinks; folder: string; defaultType?: string; onDone?: () => void; compact?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState(defaultType ?? "");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function upload() {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    try {
      for (const file of files) {
        if (file.size > MAX) throw new Error(`"${file.name}" supera el máximo de 50 MB.`);
        const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
        const up = await supabase.storage.from("documentos").upload(path, file, { contentType: file.type || undefined, upsert: false });
        if (up.error) throw new Error(`No se pudo subir "${file.name}": ${up.error.message}`);
        const { error: e } = await supabase.from("documents").insert({
          ...links,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          doc_type: docType || guessType(file.name, file.type),
          description: description.trim() || null,
        });
        if (e) throw new Error(`No se pudo registrar "${file.name}": ${e.message}`);
      }
      setFiles([]);
      setDescription("");
      if (input.current) input.current.value = "";
      router.refresh();
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface-2 text-center hover:border-brand ${compact ? "px-4 py-4" : "px-6 py-8"}`}>
        <Upload size={20} className="text-ink-3" />
        <span className="text-sm text-ink-2">Seleccione o arrastre archivos (PDF, Word, Excel, fotografías, vídeo)</span>
        <span className="text-xs text-ink-3">Máximo 50 MB por archivo</span>
        <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </label>
      {files.length > 0 && (
        <ul className="space-y-1 text-sm">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-2 text-ink-2"><Paperclip size={14} /> {f.name}</li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de documento" htmlFor="doc_type">
          <Select id="doc_type" value={docType} onChange={(e) => setDocType(e.target.value)}>
            <option value="">Detectar automáticamente</option>
            {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Descripción (opcional)" htmlFor="doc_desc">
          <Input id="doc_desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
        </Field>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end">
        <Button type="button" onClick={upload} disabled={!files.length || busy}>{busy ? "Subiendo…" : `Subir ${files.length || ""} archivo${files.length === 1 ? "" : "s"}`}</Button>
      </div>
    </div>
  );
}
