import type { IncidentStatus } from "@/lib/types";

// Vistas rápidas del listado de incidencias (compartidas con el panel de inicio)
export const QUICK_VIEWS: { key: string; label: string; statuses?: IncidentStatus[]; special?: "mine" | "overdue" | "open" }[] = [
  { key: "todas", label: "Todas" },
  { key: "mias", label: "Mis incidencias", special: "mine" },
  { key: "abiertas", label: "Abiertas", special: "open" },
  { key: "nuevas", label: "Nuevas", statuses: ["nueva"] },
  { key: "pendientes", label: "Pendientes de revisión", statuses: ["pendiente_revision"] },
  { key: "en_curso", label: "En curso", statuses: ["en_curso"] },
  { key: "atrasadas", label: "Atrasadas", special: "overdue" },
  { key: "proveedor", label: "Pendientes de proveedor", statuses: ["pendiente_proveedor"] },
  { key: "presupuesto_solicitado", label: "Presupuesto solicitado", statuses: ["presupuesto_solicitado"] },
  { key: "presupuesto_recibido", label: "Presupuesto recibido", statuses: ["presupuesto_recibido"] },
  { key: "aprobacion", label: "Pendientes de aprobación", statuses: ["pendiente_aprobacion"] },
  { key: "programadas", label: "Reparaciones programadas", statuses: ["reparacion_programada"] },
  { key: "factura", label: "Facturas pendientes", statuses: ["factura_pendiente"] },
  { key: "pago", label: "Pendientes de pago", statuses: ["pendiente_pago"] },
  { key: "resueltas", label: "Resueltas", statuses: ["resuelta"] },
  { key: "cerradas", label: "Cerradas", statuses: ["cerrada"] },
  { key: "canceladas", label: "Canceladas", statuses: ["cancelada"] },
];

export const SORTS: Record<string, { label: string; column: string; ascending: boolean; nullsFirst?: boolean }[]> = {
  recientes: [{ label: "Más recientes", column: "created_at", ascending: false }],
  antiguas: [{ label: "Más antiguas", column: "created_at", ascending: true }],
  urgentes: [{ label: "Más urgentes", column: "priority_rank", ascending: false }, { label: "", column: "created_at", ascending: true }],
  atrasadas: [{ label: "Más atrasadas", column: "due_on", ascending: true, nullsFirst: false }],
  comunidad: [{ label: "Comunidad", column: "community_name", ascending: true }],
  gestora: [{ label: "Gestora", column: "manager_name", ascending: true }],
  limite: [{ label: "Fecha límite", column: "due_on", ascending: true, nullsFirst: false }],
  actividad: [{ label: "Última actividad", column: "last_activity_at", ascending: false }],
};
