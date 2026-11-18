import { FileText, FileSpreadsheet, Image as ImageIcon, File, Film, Mail } from "lucide-react";
import { signedUrl } from "@/lib/storage";
import { fechaHora, tamano } from "@/lib/format";
import { DOC_TYPES } from "@/lib/labels";
import { EmptyState } from "@/components/ui/card";

export type DocRow = {
  id: string; storage_path: string; file_name: string; mime_type: string | null; size_bytes: number | null;
  doc_type: string; description: string | null; created_at: string; archived_at: string | null;
  uploader?: { short_name: string } | null;
};

function Icon({ doc }: { doc: DocRow }) {
  const m = doc.mime_type ?? "";
  if (m.startsWith("image/")) return <ImageIcon size={18} />;
  if (m.startsWith("video/")) return <Film size={18} />;
  if (doc.doc_type === "excel") return <FileSpreadsheet size={18} />;
  if (doc.doc_type === "correo") return <Mail size={18} />;
  if (m === "application/pdf" || doc.doc_type === "word") return <FileText size={18} />;
  return <File size={18} />;
}

/** Lista de documentos con enlaces temporales (10 min) y miniaturas de imágenes. */
export async function DocumentList({ docs }: { docs: DocRow[] }) {
  const visible = docs.filter((d) => !d.archived_at);
  if (!visible.length) return <EmptyState title="Sin documentos" description="Todavía no se ha adjuntado ningún archivo." />;
  const urls = await Promise.all(visible.map((d) => signedUrl(d.storage_path)));
  const downloads = await Promise.all(visible.map((d) => signedUrl(d.storage_path, 600, d.file_name)));
  return (
    <ul className="divide-y divide-line">
      {visible.map((d, i) => {
        const isImage = (d.mime_type ?? "").startsWith("image/") && !/hei[cf]/i.test(d.mime_type ?? "");
        const previewable = isImage || d.mime_type === "application/pdf" || (d.mime_type ?? "").startsWith("video/");
        return (
          <li key={d.id} className="flex items-center gap-3 py-3">
            {isImage && urls[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[i]!} alt="" className="h-12 w-12 shrink-0 rounded-md border border-line object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-3"><Icon doc={d} /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{d.file_name}</p>
              <p className="truncate text-xs text-ink-3">
                {DOC_TYPES[d.doc_type] ?? d.doc_type} · {tamano(d.size_bytes)} · {d.uploader?.short_name ?? "—"} · {fechaHora(d.created_at)}
                {d.description ? ` · ${d.description}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              {previewable && urls[i] && <a href={urls[i]!} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Ver</a>}
              {downloads[i] && <a href={downloads[i]!} className="text-brand hover:underline">Descargar</a>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const DOC_SELECT = "id, storage_path, file_name, mime_type, size_bytes, doc_type, description, created_at, archived_at, uploader:staff!documents_uploaded_by_fkey(short_name)";
