import { cx } from "./cx";
import type { Tone } from "@/lib/types";
import { BUDGET_STATUS, CLAIM_STATUS, INCIDENT_STATUS, INVOICE_STATUS, PRIORITY } from "@/lib/labels";

const toneClass: Record<Tone, string> = {
  gris: "bg-[var(--gris-bg)] text-[var(--gris-fg)]",
  azul: "bg-[var(--azul-bg)] text-[var(--azul-fg)]",
  naranja: "bg-[var(--naranja-bg)] text-[var(--naranja-fg)]",
  rojo: "bg-[var(--rojo-bg)] text-[var(--rojo-fg)]",
  verde: "bg-[var(--verde-bg)] text-[var(--verde-fg)]",
  violeta: "bg-[var(--violeta-bg)] text-[var(--violeta-fg)]",
};
const dotClass: Record<Tone, string> = {
  gris: "bg-[var(--gris-dot)]",
  azul: "bg-[var(--azul-dot)]",
  naranja: "bg-[var(--naranja-dot)]",
  rojo: "bg-[var(--rojo-dot)]",
  verde: "bg-[var(--verde-dot)]",
  violeta: "bg-[var(--violeta-dot)]",
};

export function Badge({ tone = "gris", children, dot = true, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", toneClass[tone], className)}>
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", dotClass[tone])} />}
      {children}
    </span>
  );
}

type Labels = Record<string, { label: string; tone: Tone }>;
const maps: Record<string, Labels> = {
  incidencia: INCIDENT_STATUS,
  presupuesto: BUDGET_STATUS,
  factura: INVOICE_STATUS,
  siniestro: CLAIM_STATUS,
};

/** Etiqueta de estado. `custom` permite usar las etiquetas configuradas. */
export function StatusBadge({ entity, status, custom }: { entity: keyof typeof maps; status: string; custom?: Labels }) {
  const s = custom?.[status] ?? maps[entity][status] ?? { label: status, tone: "gris" as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY[priority] ?? PRIORITY.normal;
  return (
    <Badge tone={p.tone} className={priority === "urgente" ? "ring-1 ring-[var(--rojo-dot)] font-semibold uppercase tracking-wide" : ""}>
      {p.label}
    </Badge>
  );
}

export function OverdueBadge() {
  return <Badge tone="rojo">Atrasada</Badge>;
}
