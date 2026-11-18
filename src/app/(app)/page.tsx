import Link from "next/link";
import {
  Inbox, Sparkles, Clock, Activity, AlarmClock, Truck, FileQuestion, ShieldCheck, Receipt, CheckCircle2, AlertTriangle, ArrowRight,
} from "lucide-react";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { StatCard } from "@/components/shared/stat-card";
import { HBarChart, MonthlyLine, type Datum } from "@/components/shared/charts";
import { Timeline, type ActivityRow } from "@/components/shared/timeline";
import { isSupervisor, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStatusLabels } from "@/lib/queries";
import { euros, fecha, hoyISO, saludo } from "@/lib/format";
import { cx } from "@/components/ui/cx";

export const metadata = { title: "Inicio" };

type Stats = Record<string, number>;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ vista?: string; error?: string }> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const supervisor = isSupervisor(me);
  const personal = supervisor ? sp.vista === "mia" : sp.vista !== "global";
  const scope = personal ? me.id : null;
  const supabase = await createClient();
  await supabase.rpc("generate_reminders");

  const today = hoyISO();
  const soonDate = new Date(`${today}T12:00:00Z`);
  soonDate.setUTCDate(soonDate.getUTCDate() + 3);
  const soon = soonDate.toISOString().slice(0, 10);

  let incQ = supabase.from("incidents_view").select("id, code, title, status, priority, is_open, is_overdue, community_id, community_name, manager_id, manager_name, category_name, created_at, due_on, planned_on");
  if (scope) incQ = incQ.eq("manager_id", scope);

  let tasksQ = supabase.from("tasks").select("id, title, due_on, incident_id, claim_id, assignee_id, incident:incidents(code, title, status)").eq("done", false).not("due_on", "is", null).lte("due_on", soon).order("due_on");
  if (scope) tasksQ = tasksQ.eq("assignee_id", scope);

  let budgetsQ = supabase.from("budgets_view").select("id, code, concept, total_amount, status, requires_superior, community_name, responsible_id, responsible_name").eq("status", "pendiente_autorizacion").order("created_at");
  if (scope) budgetsQ = budgetsQ.eq("responsible_id", scope);

  const [statsRes, incRes, tasksRes, budgetsRes, invoicesRes, activityRes, labels, staffRes] = await Promise.all([
    supabase.rpc("dashboard_stats", { p_staff: scope ?? undefined }),
    incQ,
    tasksQ,
    budgetsQ,
    supabase.from("invoices_view").select("id, invoice_number, provider_name, community_id, community_name, total_amount, paid_amount, status, incident_id, invoice_date"),
    supabase.from("activity_view").select("*").order("created_at", { ascending: false }).limit(scope ? 200 : 15),
    getStatusLabels("incidencia"),
    supabase.from("staff").select("id, short_name, full_name, role, active").order("role").order("short_name"),
  ]);

  const stats = (statsRes.data ?? {}) as Stats;
  const incidents = incRes.data ?? [];
  const open = incidents.filter((i) => i.is_open);
  const invoices = invoicesRes.data ?? [];
  const pendingInvoices = invoices.filter((f) => f.status !== "pagada");
  const myIncidentIds = new Set(incidents.map((i) => i.id));
  const activity = ((activityRes.data ?? []) as ActivityRow[]).filter((a) => !scope || (a.incident_id && myIncidentIds.has(a.incident_id)) || (a as ActivityRow & { actor_id?: string }).actor_id === scope).slice(0, 12);

  const attention = [
    ...open.filter((i) => i.priority === "urgente").map((i) => ({ ...i, reason: "Urgente", rank: 0 })),
    ...open.filter((i) => i.is_overdue && i.priority !== "urgente").map((i) => ({ ...i, reason: "Atrasada", rank: 1 })),
  ].sort((a, b) => a.rank - b.rank || (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999")).slice(0, 8);

  const base = (extra: string) => `/incidencias?${extra}${scope ? `&gestora=${scope}` : ""}`;
  const cards = [
    { label: "Total de incidencias", value: stats.total ?? 0, icon: Inbox, tone: "gris", href: base("") },
    { label: "Nuevas", value: stats.nuevas ?? 0, icon: Sparkles, tone: "violeta", href: base("vista=nuevas") },
    { label: "Pendientes de revisión", value: stats.pendientes ?? 0, icon: Clock, tone: "naranja", href: base("vista=pendientes") },
    { label: "En curso", value: stats.en_curso ?? 0, icon: Activity, tone: "azul", href: base("vista=en_curso") },
    { label: "Atrasadas", value: stats.atrasadas ?? 0, icon: AlarmClock, tone: "rojo", href: base("vista=atrasadas"), emphasis: (stats.atrasadas ?? 0) > 0 },
    { label: "Pendientes de proveedor", value: stats.pendiente_proveedor ?? 0, icon: Truck, tone: "naranja", href: base("vista=proveedor") },
    { label: "Pendientes de presupuesto", value: stats.pendiente_presupuesto ?? 0, icon: FileQuestion, tone: "azul", href: base("vista=presupuesto_solicitado") },
    { label: "Pendientes de aprobación", value: stats.pendiente_aprobacion ?? 0, icon: ShieldCheck, tone: "naranja", href: base("vista=aprobacion") },
    { label: "Facturas pendientes", value: stats.facturas_pendientes ?? 0, icon: Receipt, tone: "naranja", href: "/facturas?estado=pendientes" },
    { label: "Resueltas", value: stats.resueltas ?? 0, icon: CheckCircle2, tone: "verde", href: base("vista=resueltas") },
  ];

  // Datos de gráficos (todos derivados de la base de datos)
  const countBy = <T,>(rows: T[], key: (r: T) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of rows) { const k = key(r) ?? "Sin asignar"; m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byStatus: Datum[] = labels.list.map((l) => ({ label: l.label, value: open.filter((i) => i.status === l.key).length, tone: l.tone, href: base(`estado=${l.key}`) })).filter((d) => d.value > 0);
  const communityIds = new Map(incidents.map((i) => [i.community_name ?? "", i.community_id]));
  const byCommunity: Datum[] = countBy(open, (i) => i.community_name).slice(0, 8).map(([label, value]) => ({ label, value, href: `/comunidades/${communityIds.get(label)}?tab=incidencias` }));
  const managerIds = new Map(incidents.map((i) => [i.manager_name ?? "Sin asignar", i.manager_id]));
  const byManager: Datum[] = countBy(open, (i) => i.manager_name).map(([label, value]) => ({ label, value, href: managerIds.get(label) ? `/incidencias?vista=abiertas&gestora=${managerIds.get(label)}` : "/incidencias?vista=abiertas" }));
  const months: Datum[] = Array.from({ length: 12 }, (_, k) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (11 - k));
    const key = d.toISOString().slice(0, 7);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return {
      label: new Intl.DateTimeFormat("es-ES", { month: "short" }).format(d).replace(".", ""),
      value: incidents.filter((i) => i.created_at.slice(0, 7) === key).length,
      href: `/incidencias?desde=${key}-01&hasta=${key}-${last}${scope ? `&gestora=${scope}` : ""}`,
    };
  });
  const invoiceScope = scope ? invoices.filter((f) => f.incident_id && myIncidentIds.has(f.incident_id)) : invoices;
  const spendByCommunity = new Map<string, { v: number; id: string }>();
  for (const f of invoiceScope) { const e = spendByCommunity.get(f.community_name) ?? { v: 0, id: f.community_id }; e.v += Number(f.total_amount); spendByCommunity.set(f.community_name, e); }
  const spendCommunity: Datum[] = [...spendByCommunity.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 8).map(([label, e]) => ({ label, value: e.v, href: `/comunidades/${e.id}?tab=facturas` }));
  const catByIncident = new Map(incidents.map((i) => [i.id, i.category_name ?? "Sin categoría"]));
  const spendByCat = new Map<string, number>();
  for (const f of invoiceScope) { const k = f.incident_id ? catByIncident.get(f.incident_id) ?? "Sin categoría" : "Sin incidencia"; spendByCat.set(k, (spendByCat.get(k) ?? 0) + Number(f.total_amount)); }
  const spendCategory: Datum[] = [...spendByCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value, href: "/informes" }));

  const team = (staffRes.data ?? []).filter((s) => s.active).map((s) => {
    const mine = incidents.filter((i) => i.manager_id === s.id);
    return { ...s, open: mine.filter((i) => i.is_open).length, overdue: mine.filter((i) => i.is_overdue).length, urgent: mine.filter((i) => i.is_open && i.priority === "urgente").length };
  });

  return (
    <div className="space-y-6">
      {sp.error === "permisos" && <div className="rounded-lg bg-[var(--rojo-bg)] px-4 py-3 text-sm text-[var(--rojo-fg)]">No tiene permisos para acceder a esa sección.</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{saludo()}, {me.short_name}</h1>
          <p className="mt-1 text-sm text-ink-3">{personal ? "Este es el resumen de su trabajo en AR Incidencias." : "Este es el resumen de la actividad de AR Incidencias."}</p>
        </div>
        <div className="flex rounded-lg border border-line bg-surface p-1 text-sm">
          <Link href={supervisor ? "/" : "/?vista=global"} className={cx("rounded-md px-3 py-1.5", !personal ? "bg-brand text-white" : "text-ink-2 hover:bg-gray-100")}>{supervisor ? "Visión global" : "Todo el despacho"}</Link>
          <Link href={supervisor ? "/?vista=mia" : "/"} className={cx("rounded-md px-3 py-1.5", personal ? "bg-brand text-white" : "text-ink-2 hover:bg-gray-100")}>Mi trabajo</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader title="Necesita atención" subtitle="Lo más urgente primero." />
          <div className="divide-y divide-line">
            {attention.length === 0 && tasksRes.data?.length === 0 && budgetsRes.data?.length === 0 && pendingInvoices.length === 0 ? (
              <EmptyState title="Nada urgente" description="No hay incidencias urgentes ni atrasadas, ni vencimientos próximos." />
            ) : (
              <>
                {attention.map((i) => (
                  <Link key={i.id} href={`/incidencias/${i.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                    <AlertTriangle size={18} className={i.reason === "Urgente" ? "text-[var(--rojo-dot)]" : "text-[var(--naranja-dot)]"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.code} · {i.title}</p>
                      <p className="truncate text-xs text-ink-3">{i.community_name} · {i.manager_name ?? "Sin asignar"}{i.due_on ? ` · límite ${fecha(i.due_on)}` : ""}</p>
                    </div>
                    {i.reason === "Urgente" ? <PriorityBadge priority="urgente" /> : <Badge tone="rojo">Atrasada</Badge>}
                  </Link>
                ))}
                {(budgetsRes.data ?? []).filter((b) => !supervisor || personal || b.requires_superior || b.responsible_id === me.id).slice(0, 5).map((b) => (
                  <Link key={b.id} href={`/presupuestos/${b.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                    <ShieldCheck size={18} className="text-[var(--naranja-dot)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.code} · {b.concept}</p>
                      <p className="truncate text-xs text-ink-3">{b.community_name} · {euros(b.total_amount)} · {b.responsible_name ?? "—"}</p>
                    </div>
                    <Badge tone="naranja">{b.requires_superior ? "Autorización superior" : "Pendiente de aprobación"}</Badge>
                  </Link>
                ))}
                {(tasksRes.data ?? []).slice(0, 6).map((t) => (
                  <Link key={t.id} href={t.incident_id ? `/incidencias/${t.incident_id}` : `/siniestros/${t.claim_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                    <AlarmClock size={18} className={t.due_on! < today ? "text-[var(--rojo-dot)]" : "text-[var(--azul-dot)]"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="truncate text-xs text-ink-3">{t.incident?.code ?? "Siniestro"}{t.incident?.title ? ` · ${t.incident.title}` : ""}</p>
                    </div>
                    <Badge tone={t.due_on! < today ? "rojo" : "azul"}>{t.due_on! < today ? "Tarea atrasada" : `Vence ${fecha(t.due_on)}`}</Badge>
                  </Link>
                ))}
                {(supervisor && !personal) && pendingInvoices.length > 0 && (
                  <Link href="/facturas?estado=pendientes" className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                    <Receipt size={18} className="text-[var(--naranja-dot)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{pendingInvoices.length} factura{pendingInvoices.length === 1 ? "" : "s"} pendiente{pendingInvoices.length === 1 ? "" : "s"} de pago</p>
                      <p className="text-xs text-ink-3">Importe pendiente: {euros(pendingInvoices.reduce((a, f) => a + Number(f.total_amount) - Number(f.paid_amount), 0))}</p>
                    </div>
                    <ArrowRight size={16} className="text-ink-3" />
                  </Link>
                )}
              </>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Actividad reciente" actions={<Link href="/informes?tipo=actividad" className="text-sm text-brand hover:underline">Ver más</Link>} />
          <CardBody><Timeline items={activity} showContext resolve={Object.fromEntries((staffRes.data ?? []).map((s) => [s.id, s.full_name]))} /></CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Incidencias abiertas por estado" /><CardBody><HBarChart data={byStatus} /></CardBody></Card>
        <Card><CardHeader title="Evolución mensual" subtitle="Incidencias registradas en los últimos 12 meses" /><CardBody><MonthlyLine data={months} /></CardBody></Card>
        <Card><CardHeader title="Incidencias abiertas por comunidad" subtitle="Las 8 con más incidencias abiertas" /><CardBody><HBarChart data={byCommunity} /></CardBody></Card>
        {!personal && <Card><CardHeader title="Incidencias abiertas por gestora" /><CardBody><HBarChart data={byManager} /></CardBody></Card>}
        <Card><CardHeader title="Gasto facturado por comunidad" subtitle="Total de facturas registradas" /><CardBody><HBarChart data={spendCommunity} money /></CardBody></Card>
        <Card><CardHeader title="Gasto facturado por categoría" /><CardBody><HBarChart data={spendCategory} money /></CardBody></Card>
      </div>

      {supervisor && !personal && (
        <Card>
          <CardHeader title="Carga de trabajo del equipo" subtitle="Información para organizar y distribuir el trabajo. No constituye una valoración del rendimiento." />
          <Table>
            <thead><tr><Th>Persona</Th><Th className="text-center">Abiertas</Th><Th className="text-center">Urgentes</Th><Th className="text-center">Atrasadas</Th><Th></Th></tr></thead>
            <tbody>{team.map((t) => (
              <tr key={t.id} className="hover:bg-surface-2">
                <Td><Link href={`/equipo/${t.id}`} className="font-medium hover:text-brand">{t.full_name}</Link></Td>
                <Td className="tabular text-center">{t.open}</Td>
                <Td className={cx("tabular text-center", t.urgent > 0 && "font-semibold text-[var(--rojo-fg)]")}>{t.urgent}</Td>
                <Td className={cx("tabular text-center", t.overdue > 0 && "font-semibold text-[var(--rojo-fg)]")}>{t.overdue}</Td>
                <Td className="text-right"><Link href={`/incidencias?vista=abiertas&gestora=${t.id}`} className="text-sm text-brand hover:underline">Ver incidencias</Link></Td>
              </tr>))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
