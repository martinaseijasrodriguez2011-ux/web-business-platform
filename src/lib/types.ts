export type StaffRole = "direccion" | "coordinacion" | "gestora";
export type Tone = "gris" | "azul" | "naranja" | "rojo" | "verde" | "violeta";

export type Staff = {
  id: string;
  full_name: string;
  short_name: string;
  position: string;
  role: StaffRole;
  email: string | null;
  user_id: string | null;
  active: boolean;
  approval_limit: number | null;
  can_edit_all: boolean;
  avatar_path: string | null;
  phone: string | null;
  invited_at: string | null;
};

import type { Database } from "@/lib/database.types";
type Enums = Database["public"]["Enums"];
export type IncidentStatus = Enums["incident_status"];
export type Priority = Enums["incident_priority"];
export type BudgetStatus = Enums["budget_status"];
export type InvoiceStatus = Enums["invoice_status"];
export type ClaimStatus = Enums["claim_status"];
export type CalendarKind = Enums["calendar_kind"];

export type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };
