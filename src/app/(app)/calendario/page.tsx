import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { FormModal } from "@/components/ui/form-modal";
import { cx } from "@/components/ui/cx";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityOptions, getStaffOptions } from "@/lib/queries";
import { hora, hoyISO } from "@/lib/format";
import { CALENDAR_KIND } from "@/lib/labels";
import { addCalendarEvent } from "./actions";

export const metadata = { title: "Calendario" };

type Ev = { key: string; date: string; time?: string; title: string; kind: string; href: string; tone: string; who?: string | null };
const TONE: Record<string, string> = {
  reparacion: "bg-[var(--azul-bg)] text-[var(--azul-fg)] border-[var(--azul-dot)]",
  visita_proveedor: "bg-[var(--violeta-bg)] text-[var(--violeta-fg)] border-[var(--violeta-dot)]",
  visita_perito: "bg-[var(--violeta-bg)] text-[var(--violeta-fg)] border-[var(--violeta-dot)]",
  fecha_limite: "bg-[var(--rojo-bg)] text-[var(--rojo-fg)] border-[var(--rojo-dot)]",
  tarea: "bg-[var(--naranja-bg)] text-[var(--naranja-fg)] border-[var(--naranja-dot)]",
  seguimiento: "bg-[var(--gris-bg)] text-[var(--gris-fg)] border-[var(--gris-dot)]",
  recordatorio: "bg-[var(--gris-bg)] text-[var(--gris-fg)] border-[var(--gris-dot)]",
  otro: "bg-[var(--gris-bg)] text-[var(--gris-fg)] border-[var(--gris-dot)]",
};
const KIND_LABEL: Record<string, string> = { ...CALENDAR_KIND, tarea: "Tarea" };

function iso(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(s: string, n: number) { const d = new Date(`${s}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
function madridDate(ts: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(ts)); }

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string; gestora?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const view = sp.vista === "semana" || sp.vista === "dia" ? sp.vista : "mes";
  const today = hoyISO();
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? "") ? sp.fecha! : today;

  let from: string, to: string;
  if (view === "mes") {
    const first = `${anchor.slice(0, 7)}-01`;
    const dow = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
    from = addDays(first, -dow);
    to = addDays(from, 41);
  } else if (view === "semana") {
    const dow = (new Date(`${anchor}T12:00:00Z`).getUTCDay() + 6) % 7;
    from = addDays(anchor, -dow); to = addDays(from, 6);
  } else { from = anchor; to = anchor; }

  const supabase = await createClient();
  const [{ data: events }, { data: incidents }, { data: tasks }, { data: claims }, communities, staff] = await Promise.all([
    supabase.from("calendar_events").select("id, title, kind, starts_at, all_day, incident_id, claim_id, community_id, staff:staff!calendar_events_staff_id_fkey(short_name)").eq("cancelled", false).gte("starts_at", `${addDays(from, -1)}T00:00:00Z`).lte("starts_at", `${addDays(to, 1)}T23:59:59Z`),
    supabase.from("incidents").select("id, code, title, planned_on, due_on, manager_id, manager:staff!incidents_manager_id_fkey(short_name)").not("status", "in", "(resuelta,cerrada,cancelada)").or(`and(planned_on.gte.${from},planned_on.lte.${to}),and(due_on.gte.${from},due_on.lte.${to})`),
    supabase.from("tasks").select("id, title, due_on, incident_id, claim_id, assignee_id, assignee:staff!tasks_assignee_id_fkey(short_name)").eq("done", false).gte("due_on", from).lte("due_on", to),
    supabase.from("claims").select("id, code, visit_at, adjuster_name, manager_id").not("visit_at", "is", null).gte("visit_at", `${addDays(from, -1)}T00:00:00Z`).lte("visit_at", `${addDays(to, 1)}T23:59:59Z`),
    getCommunityOptions(), getStaffOptions(),
  ]);

  const all: Ev[] = [];
  for (const e of events ?? []) all.push({ key: `e${e.id}`, date: madridDate(e.starts_at), time: e.all_day ? undefined : hora(e.starts_at), title: e.title, kind: e.kind, who: e.staff?.short_name,
    href: e.incident_id ? `/incidencias/${e.incident_id}` : e.claim_id ? `/siniestros/${e.claim_id}` : e.community_id ? `/comunidades/${e.community_id}` : "/calendario", tone: e.kind });
  for (const i of incidents ?? []) {
    if (sp.gestora && i.manager_id !== sp.gestora) continue;
    if (i.planned_on && i.planned_on >= from && i.planned_on <= to) all.push({ key: `p${i.id}`, date: i.planned_on, title: `${i.code} · Actuación prevista: ${i.title}`, kind: "reparacion", href: `/incidencias/${i.id}`, tone: "reparacion", who: i.manager?.short_name });
    if (i.due_on && i.due_on >= from && i.due_on <= to) all.push({ key: `d${i.id}`, date: i.due_on, title: `${i.code} · Fecha límite: ${i.title}`, kind: "fecha_limite", href: `/incidencias/${i.id}`, tone: "fecha_limite", who: i.manager?.short_name });
  }
  for (const t of tasks ?? []) {
    if (sp.gestora && t.assignee_id !== sp.gestora) continue;
    all.push({ key: `t${t.id}`, date: t.due_on!, title: t.title, kind: "tarea", href: t.incident_id ? `/incidencias/${t.incident_id}` : `/siniestros/${t.claim_id}`, tone: "tarea", who: t.assignee?.short_name });
  }
  for (const c of claims ?? []) {
    if (sp.gestora && c.manager_id !== sp.gestora) continue;
    all.push({ key: `c${c.id}`, date: madridDate(c.visit_at!), time: hora(c.visit_at), title: `${c.code} · Visita del perito${c.adjuster_name ? ` (${c.adjuster_name})` : ""}`, kind: "visita_perito", href: `/siniestros/${c.id}`, tone: "visita_perito" });
  }
  all.sort((a, b) => (a.date + (a.time ?? "00:00")).localeCompare(b.date + (b.time ?? "00:00")));
  const byDay = new Map<string, Ev[]>();
  for (const e of all) { if (e.date < from || e.date > to) continue; byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]); }

  const step = view === "mes" ? null : view === "semana" ? 7 : 1;
  const prev = step ? addDays(anchor, -step) : (() => { const d = new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); return iso(d); })();
  const next = step ? addDays(anchor, step) : (() => { const d = new Date(`${anchor.slice(0, 7)}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); return iso(d); })();
  const qs = (o: Record<string, string>) => `/calendario?${new URLSearchParams({ vista: view, fecha: anchor, ...(sp.gestora ? { gestora: sp.gestora } : {}), ...o })}`;
  const title = view === "mes" ? new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${anchor}T12:00:00Z`))
    : view === "semana" ? `Semana del ${from.split("-").reverse().join("/")} al ${to.split("-").reverse().join("/")}`
    : new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${anchor}T12:00:00Z`));
  const days = Array.from({ length: view === "mes" ? 42 : view === "semana" ? 7 : 1 }, (_, i) => addDays(from, i));

  const Item = ({ e, compact }: { e: Ev; compact?: boolean }) => (
    <Link href={e.href} title={`${KIND_LABEL[e.kind] ?? e.kind}: ${e.title}`} className={cx("block truncate rounded border-l-2 px-1.5 py-0.5 text-xs hover:brightness-95", TONE[e.tone] ?? TONE.otro)}>
      {e.time && <span className="tabular mr-1 font-medium">{e.time}</span>}{e.title}{!compact && e.who && <span className="opacity-70"> · {e.who}</span>}
    </Link>
  );

  return (
    <div>
      <PageHeader title="Calendario" subtitle="Reparaciones, visitas, fechas límite, tareas y recordatorios vinculados a incidencias, comunidades y siniestros."
        actions={
          <FormModal trigger={<><Plus size={16} /> Nuevo evento</>} triggerVariant="primary" title="Nuevo evento" action={addCalendarEvent.bind(null, {})} submitLabel="Guardar">
            <Field label="Tipo" htmlFor="kind"><Select id="kind" name="kind" defaultValue="seguimiento">{Object.entries(CALENDAR_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Título" htmlFor="title" required><Input id="title" name="title" required /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inicio" htmlFor="starts_at" required><Input id="starts_at" name="starts_at" type="datetime-local" required /></Field>
              <Field label="Fin" htmlFor="ends_at"><Input id="ends_at" name="ends_at" type="datetime-local" /></Field>
            </div>
            <Field label="Comunidad" htmlFor="community_id"><Select id="community_id" name="community_id"><option value="">—</option>{communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
            <Field label="Responsable" htmlFor="staff_id"><Select id="staff_id" name="staff_id"><option value="">—</option>{staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select></Field>
            <Field label="Notas" htmlFor="notes"><Textarea id="notes" name="notes" rows={2} /></Field>
            <p className="text-xs text-ink-3">Para vincular el evento a una incidencia, prográmelo desde la ficha de la incidencia.</p>
          </FormModal>
        } />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="flex items-center gap-1">
            <Link href={qs({ fecha: prev })} className="rounded-lg border border-line p-2 hover:bg-surface-2" aria-label="Anterior"><ChevronLeft size={16} /></Link>
            <Link href={qs({ fecha: today })} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2">Hoy</Link>
            <Link href={qs({ fecha: next })} className="rounded-lg border border-line p-2 hover:bg-surface-2" aria-label="Siguiente"><ChevronRight size={16} /></Link>
          </div>
          <h2 className="text-lg font-semibold capitalize">{title}</h2>
          <form className="ml-auto flex gap-2" action="/calendario">
            <input type="hidden" name="vista" value={view} /><input type="hidden" name="fecha" value={anchor} />
            <Select name="gestora" defaultValue={sp.gestora ?? ""} className="w-48" aria-label="Gestora"><option value="">Todo el equipo</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</Select>
            <button className="h-10 rounded-lg border border-line-strong px-3 text-sm">Ver</button>
          </form>
          <div className="flex rounded-lg border border-line p-1 text-sm">
            {(["dia", "semana", "mes"] as const).map((v) => <Link key={v} href={qs({ vista: v })} className={cx("rounded-md px-3 py-1", view === v ? "bg-brand text-white" : "text-ink-2")}>{v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}</Link>)}
          </div>
        </div>
        {view === "mes" ? (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-7">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <div key={d} className="border-b border-line bg-surface-2 px-2 py-2 text-xs font-semibold uppercase text-ink-3">{d}</div>)}
              {days.map((d) => {
                const evs = byDay.get(d) ?? [];
                const otherMonth = d.slice(0, 7) !== anchor.slice(0, 7);
                return (
                  <div key={d} className={cx("min-h-28 border-b border-r border-line p-1.5", otherMonth && "bg-surface-2/60")}>
                    <Link href={qs({ vista: "dia", fecha: d })} className={cx("tabular mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", d === today ? "bg-brand font-semibold text-white" : otherMonth ? "text-ink-3" : "text-ink-2 hover:bg-gray-100")}>{Number(d.slice(8))}</Link>
                    <div className="space-y-0.5">{evs.slice(0, 3).map((e) => <Item key={e.key} e={e} compact />)}{evs.length > 3 && <Link href={qs({ vista: "dia", fecha: d })} className="block px-1 text-xs text-ink-3 hover:text-brand">+{evs.length - 3} más</Link>}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={cx("grid", view === "semana" ? "md:grid-cols-7" : "grid-cols-1")}>
            {days.map((d) => (
              <div key={d} className="min-h-40 border-b border-r border-line p-3">
                <p className={cx("mb-2 text-sm font-medium capitalize", d === today && "text-brand")}>{new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}</p>
                <div className="space-y-1">{(byDay.get(d) ?? []).map((e) => <Item key={e.key} e={e} />)}{!(byDay.get(d) ?? []).length && <p className="text-xs text-ink-3">Sin eventos</p>}</div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 p-4 text-xs text-ink-2">
          {[["reparacion", "Reparación / actuación prevista"], ["visita_perito", "Visitas (proveedor, perito)"], ["fecha_limite", "Fecha límite"], ["tarea", "Tarea"], ["seguimiento", "Seguimiento / recordatorio"]].map(([k, l]) => (
            <span key={k} className={cx("rounded border-l-2 px-2 py-0.5", TONE[k])}>{l}</span>
          ))}
        </div>
      </Card>
    </div>
  );
}
