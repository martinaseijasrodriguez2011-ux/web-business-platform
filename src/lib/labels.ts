import type { Tone } from "@/lib/types";

/**
 * Etiquetas por defecto. Las etiquetas visibles se leen de la tabla
 * status_labels (editable en Configuración); estas sirven de respaldo.
 */
export const INCIDENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  nueva: { label: "Nueva", tone: "gris" },
  pendiente_revision: { label: "Pendiente de revisión", tone: "naranja" },
  en_curso: { label: "En curso", tone: "azul" },
  pendiente_proveedor: { label: "Pendiente de proveedor", tone: "naranja" },
  presupuesto_solicitado: { label: "Presupuesto solicitado", tone: "azul" },
  presupuesto_recibido: { label: "Presupuesto recibido", tone: "azul" },
  pendiente_aprobacion: { label: "Pendiente de aprobación", tone: "naranja" },
  aprobada: { label: "Aprobada", tone: "azul" },
  reparacion_programada: { label: "Reparación programada", tone: "azul" },
  reparacion_realizada: { label: "Reparación realizada", tone: "verde" },
  factura_pendiente: { label: "Factura pendiente", tone: "naranja" },
  pendiente_pago: { label: "Pendiente de pago", tone: "naranja" },
  resuelta: { label: "Resuelta", tone: "verde" },
  cerrada: { label: "Cerrada", tone: "verde" },
  cancelada: { label: "Cancelada", tone: "gris" },
};

export const BUDGET_STATUS: Record<string, { label: string; tone: Tone }> = {
  solicitado: { label: "Solicitado", tone: "gris" },
  recibido: { label: "Recibido", tone: "azul" },
  pendiente_autorizacion: { label: "Pendiente de autorización", tone: "naranja" },
  aprobado: { label: "Aprobado", tone: "verde" },
  rechazado: { label: "Rechazado", tone: "rojo" },
  cancelado: { label: "Cancelado", tone: "gris" },
};

export const INVOICE_STATUS: Record<string, { label: string; tone: Tone }> = {
  recibida: { label: "Factura recibida", tone: "azul" },
  pendiente_revision: { label: "Pendiente de revisión", tone: "naranja" },
  pendiente_pago: { label: "Pendiente de pago", tone: "naranja" },
  pagada: { label: "Pagada", tone: "verde" },
  discrepancia: { label: "Incidencia o discrepancia", tone: "rojo" },
};

export const CLAIM_STATUS: Record<string, { label: string; tone: Tone }> = {
  pendiente_comunicar: { label: "Pendiente de comunicar", tone: "naranja" },
  comunicado: { label: "Comunicado", tone: "azul" },
  pendiente_perito: { label: "Pendiente de perito", tone: "naranja" },
  visita_programada: { label: "Visita programada", tone: "azul" },
  pendiente_valoracion: { label: "Pendiente de valoración", tone: "naranja" },
  aceptado: { label: "Aceptado", tone: "verde" },
  rechazado: { label: "Rechazado", tone: "rojo" },
  en_reparacion: { label: "En reparación", tone: "azul" },
  finalizado: { label: "Finalizado", tone: "verde" },
  cerrado: { label: "Cerrado", tone: "verde" },
};

export const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  baja: { label: "Baja", tone: "gris" },
  normal: { label: "Normal", tone: "azul" },
  alta: { label: "Alta", tone: "naranja" },
  urgente: { label: "Urgente", tone: "rojo" },
};

export const ROLE: Record<string, string> = {
  direccion: "Dirección",
  coordinacion: "Coordinación",
  gestora: "Gestión",
};

export const AUTH_KIND: Record<string, string> = {
  presidente: "Autorización del presidente",
  aprobacion_interna: "Aprobación interna (dentro del límite)",
  autorizacion_superior: "Autorización superior (Dirección/Coordinación)",
};

export const AUTH_MEDIUM: Record<string, string> = {
  email: "Correo electrónico",
  telefono: "Teléfono",
  whatsapp: "WhatsApp",
  presencial: "Presencial",
  escrito: "Escrito firmado",
  acta_junta: "Acta de junta",
  sistema: "Registro en AR Incidencias",
  otro: "Otro",
};

export const ACTIVITY_MANUAL: Record<string, string> = {
  actuacion: "Actuación",
  llamada: "Llamada",
  correo: "Correo recibido / enviado",
  conversacion: "Conversación (proveedor / presidente)",
  visita: "Visita",
  comentario: "Comentario interno",
};

export const DOC_TYPES: Record<string, string> = {
  acta: "Acta",
  contrato: "Contrato",
  presupuesto: "Presupuesto",
  factura: "Factura",
  informe: "Informe",
  fotografia: "Fotografía",
  video: "Vídeo",
  word: "Documento Word",
  excel: "Hoja Excel",
  correo: "Correo",
  otro: "Otro",
};

export const CALENDAR_KIND: Record<string, string> = {
  reparacion: "Reparación",
  visita_proveedor: "Visita de proveedor",
  visita_perito: "Visita de perito",
  fecha_limite: "Fecha límite",
  seguimiento: "Seguimiento",
  recordatorio: "Recordatorio",
  otro: "Otro",
};

export const OPEN_INCIDENT_EXCLUDED = ["resuelta", "cerrada", "cancelada"];
