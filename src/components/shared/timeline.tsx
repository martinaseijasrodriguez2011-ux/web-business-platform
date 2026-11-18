import {
  Phone, Mail, MessageSquare, Wrench, FilePlus, CheckCircle2, RotateCcw, ArrowRightLeft, PencilLine, FileText,
  BadgeCheck, Receipt, Banknote, ShieldAlert, Building2, ListChecks, Footprints, Users, CircleDot,
} from "lucide-react";
import Link from "next/link";
import { fecha, fechaHora, hora } from "@/lib/format";
import { EmptyState } from "@/components/ui/card";
import { cx } from "@/components/ui/cx";

export type ActivityRow = {
  id: string; kind: string; occurred_at: string; created_at: string; summary: string; body: string | null;
  actor_name: string | null; counterpart: string | null; changes: Record<string, { old: unknown; new: unknown }> | null;
  incident_id: string | null; incident_code?: string | null; community_name?: string | null; corrects_id: string | null;
  document_id: string | null;
};

const ICONS: Record<string, { icon: typeof Phone; tone: string }> = {
  llamada: { icon: Phone, tone: "azul" },
  correo: { icon: Mail, tone: "azul" },
  conversacion: { icon: Users, tone: "azul" },
  comentario: { icon: MessageSquare, tone: "gris" },
  actuacion: { icon: Wrench, tone: "azul" },
  visita: { icon: Footprints, tone: "azul" },
  correccion: { icon: PencilLine, tone: "naranja" },
  incidencia_creada: { icon: FilePlus, tone: "violeta" },
  cambio_estado: { icon: ArrowRightLeft, tone: "violeta" },
  cambio_datos: { icon: PencilLine, tone: "gris" },
  tarea_completada: { icon: CheckCircle2, tone: "verde" },
  tarea_reabierta: { icon: RotateCcw, tone: "naranja" },
  documento: { icon: FileText, tone: "gris" },
  presupuesto_creado: { icon: FileText, tone: "azul" },
  presupuesto_estado: { icon: FileText, tone: "naranja" },
  autorizacion: { icon: BadgeCheck, tone: "verde" },
  factura_registrada: { icon: Receipt, tone: "azul" },
  factura_estado: { icon: Receipt, tone: "naranja" },
  pago_confirmado: { icon: Banknote, tone: "verde" },
  siniestro_creado: { icon: ShieldAlert, tone: "violeta" },
  siniestro_estado: { icon: ShieldAlert, tone: "naranja" },
  comunidad_creada: { icon: Building2, tone: "violeta" },
  comunidad_actualizada: { icon: Building2, tone: "gris" },
  checklist_aplicado: { icon: ListChecks, tone: "azul" },
};

const toneCls: Record<string, string> = {
  azul: "bg-[var(--azul-bg)] text-[var(--azul-fg)]",
  verde: "bg-[var(--verde-bg)] text-[var(--verde-fg)]",
  naranja: "bg-[var(--naranja-bg)] text-[var(--naranja-fg)]",
  gris: "bg-[var(--gris-bg)] text-[var(--gris-fg)]",
  violeta: "bg-[var(--violeta-bg)] text-[var(--violeta-fg)]",
};

const FIELD: Record<string, string> = {
  title: "Título", description: "Descripción", priority: "Prioridad", manager_id: "Gestora responsable",
  provider_id: "Proveedor", category_id: "Categoría", subcategory_id: "Subcategoría", planned_on: "Fecha prevista",
  due_on: "Fecha límite", communicated_on: "Fecha de comunicación", reporter_name: "Vecino", reporter_unit: "Piso y puerta",
  reporter_contact: "Contacto", notes: "Observaciones", community_id: "Comunidad", name: "Nombre", address: "Dirección",
  code: "Código", president_name: "Presidente", president_contact: "Contacto del presidente", base_amount: "Base imponible",
  vat_rate: "Tipo de IVA", concept: "Concepto", invoice_number: "Nº de factura", invoice_date: "Fecha de factura",
  received_on: "Fecha de recepción", requested_on: "Fecha de solicitud", valid_until: "Validez", execution_term: "Plazo",
  conditions: "Condiciones", insurer: "Aseguradora", policy_number: "Póliza", claim_number: "Expediente",
  adjuster_name: "Perito", adjuster_phone: "Teléfono del perito", visit_at: "Visita", occurred_on: "Fecha del siniestro",
  postal_code: "Código postal", city: "Población", active: "Activa", registered_on: "Fecha de alta", status: "Estado",
  importe: "Importe", medio: "Medio", fecha: "Fecha", budget_id: "Presupuesto", incident_id: "Incidencia", rejected_reason: "Motivo del rechazo",
};

function show(v: unknown, resolve?: Record<string, string>) {
  if (v === null || v === undefined || v === "") return "(vacío)";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  const s = String(v);
  if (resolve?.[s]) return resolve[s];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return fecha(s);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return fechaHora(s);
  return s.length > 140 ? s.slice(0, 140) + "…" : s;
}

/** Cronología de movimientos. Muestra fecha, hora, persona, acción y cambios. */
export function Timeline({ items, resolve, showContext, docUrls }: { items: ActivityRow[]; resolve?: Record<string, string>; showContext?: boolean; docUrls?: Record<string, string | null> }) {
  if (!items.length) return <EmptyState title="Sin movimientos" description="Aquí aparecerá cada actuación registrada." />;
  return (
    <ol className="relative">
      {items.map((a, idx) => {
        const meta = ICONS[a.kind] ?? { icon: CircleDot, tone: "gris" };
        const Icon = meta.icon;
        const changes = a.changes && !/estado$/.test(a.kind) && a.kind !== "autorizacion" && a.kind !== "pago_confirmado" ? Object.entries(a.changes).filter(([, v]) => v && typeof v === "object" && "new" in v) : [];
        return (
          <li key={a.id} className="relative flex gap-4 pb-6 last:pb-0">
            {idx < items.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-px bg-line" aria-hidden />}
            <span className={cx("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", toneCls[meta.tone])}>
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-ink">{a.summary}</span>
                {a.counterpart && <span className="text-xs text-ink-3">con {a.counterpart}</span>}
              </div>
              <p className="mt-0.5 text-xs text-ink-3">
                <time dateTime={a.occurred_at}>{fecha(a.occurred_at)} · {hora(a.occurred_at)}</time>
                {" · "}{a.actor_name ?? "Sistema"}
                {a.occurred_at.slice(0, 16) !== a.created_at.slice(0, 16) && Math.abs(new Date(a.created_at).getTime() - new Date(a.occurred_at).getTime()) > 120000 && (
                  <> · registrado el {fechaHora(a.created_at)}</>
                )}
                {showContext && a.incident_id && a.incident_code && (
                  <> · <Link href={`/incidencias/${a.incident_id}`} className="text-brand hover:underline">{a.incident_code}</Link></>
                )}
              </p>
              {a.body && <p className="mt-2 whitespace-pre-line rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">{a.body}</p>}
              {changes.length > 0 && (
                <ul className="mt-2 space-y-1 rounded-lg border border-line px-3 py-2 text-xs">
                  {changes.map(([k, v]) => (
                    <li key={k} className="text-ink-2">
                      <span className="font-medium text-ink">{FIELD[k] ?? k}:</span>{" "}
                      <span className="text-ink-3 line-through decoration-ink-3/40">{show(v.old, resolve)}</span>{" → "}
                      <span>{show(v.new, resolve)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {a.document_id && docUrls?.[a.document_id] && (
                <a href={docUrls[a.document_id]!} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-brand hover:underline">Abrir documento</a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
