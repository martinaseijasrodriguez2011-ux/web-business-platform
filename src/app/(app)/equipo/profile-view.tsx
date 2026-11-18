import Link from "next/link";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { Timeline, type ActivityRow } from "@/components/shared/timeline";
import { createClient } from "@/lib/supabase/server";
import { corporateUrl } from "@/lib/storage";
import { euros, fecha, hoyISO } from "@/lib/format";
import { ROLE } from "@/lib/labels";
import type { Staff } from "@/lib/types";

/** Ficha de una persona del equipo (se usa en /equipo/[id] y /perfil). */
export async function ProfileView({ staff, showLimit }: { staff: Staff; showLimit: boolean }) {
  const supabase = await createClient();
  const today = hoyISO();
  const [{ data: comms }, { data: inc }, { data: tasks }, { data: budgets }, { data: activity }] = await Promise.all([
    supabase.from("communities_view").select("id, name, code, open_incidents").eq("manager_id", staff.id).eq("active", true).order("name"),
    supabase.from("incidents_view").select("id, code, title, status, priority, is_open, is_overdue, community_name, due_on").eq("manager_id", staff.id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, title, done, due_on, incident_id, claim_id, incident:incidents(code)").eq("assignee_id", staff.id),
    supabase.from("budgets_view").select("id").eq("responsible_id", staff.id).in("status", ["recibido", "pendiente_autorizacion"]),
    supabase.from("activity_view").select("*").eq("actor_id", staff.id).order("created_at", { ascending: false }).limit(15),
  ]);
  const open = (inc ?? []).filter((i) => i.is_open);
  const pendingTasks = (tasks ?? []).filter((t) => !t.done);
  const stats = [
    ["Comunidades asignadas", comms?.length ?? 0], ["Incidencias abiertas", open.length], ["Nuevas", open.filter((i) => i.status === "nueva").length],
    ["Atrasadas", (inc ?? []).filter((i) => i.is_overdue).length], ["Tareas pendientes", pendingTasks.length], ["Tareas atrasadas", pendingTasks.filter((t) => t.due_on && t.due_on < today).length],
    ["Tareas completadas", (tasks ?? []).filter((t) => t.done).length], ["Incidencias resueltas", (inc ?? []).filter((i) => ["resuelta", "cerrada"].includes(i.status)).length],
    ["Presupuestos pendientes", budgets?.length ?? 0],
  ] as const;
  const avatar = corporateUrl(staff.avatar_path);
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4">
          {avatar ? <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */
            : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-xl font-semibold text-brand">{staff.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{staff.full_name}</h1>
            <p className="text-ink-3">{staff.position}</p>
            <div className="mt-1 flex flex-wrap gap-1.5"><Badge tone={staff.role === "gestora" ? "gris" : "violeta"} dot={false}>{ROLE[staff.role]}</Badge>{!staff.active && <Badge tone="gris">Desactivado</Badge>}</div>
          </div>
          {showLimit && <div className="ml-auto rounded-lg bg-surface-2 px-4 py-3 text-sm"><p className="text-ink-3">Límite de aprobación</p><p className="tabular font-semibold">{staff.role !== "gestora" ? "Autorización superior" : staff.approval_limit != null ? euros(staff.approval_limit) : "Pendiente de configurar"}</p></div>}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([k, v]) => <Card key={k} className="p-4"><p className="tabular text-2xl font-semibold">{v}</p><p className="text-xs text-ink-3">{k}</p></Card>)}
      </div>
      <p className="text-xs text-ink-3">Estas cifras sirven para organizar y distribuir el trabajo. No constituyen una valoración del rendimiento.</p>
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Card><CardHeader title="Incidencias abiertas" actions={<Link href={`/incidencias?vista=abiertas&gestora=${staff.id}`} className="text-sm text-brand hover:underline">Ver todas</Link>} />
            {!open.length ? <EmptyState title="Sin incidencias abiertas" /> : (
              <Table><thead><tr><Th>Incidencia</Th><Th>Comunidad</Th><Th>Estado</Th><Th>Prioridad</Th><Th>Límite</Th></tr></thead>
                <tbody>{open.slice(0, 20).map((i) => <tr key={i.id} className="hover:bg-surface-2"><Td><Link href={`/incidencias/${i.id}`} className="font-medium hover:text-brand">{i.code}</Link><span className="block max-w-[260px] truncate text-xs text-ink-3">{i.title}</span></Td><Td className="text-ink-2">{i.community_name}</Td><Td><div className="flex flex-col items-start gap-1"><StatusBadge entity="incidencia" status={i.status} />{i.is_overdue && <Badge tone="rojo">Atrasada</Badge>}</div></Td><Td><PriorityBadge priority={i.priority} /></Td><Td className="text-ink-3">{fecha(i.due_on)}</Td></tr>)}</tbody>
              </Table>)}
          </Card>
          <Card><CardHeader title="Tareas pendientes" />
            {!pendingTasks.length ? <EmptyState title="Sin tareas pendientes" /> : (
              <ul className="divide-y divide-line">{pendingTasks.sort((a, b) => (a.due_on ?? "9").localeCompare(b.due_on ?? "9")).slice(0, 20).map((t) => (
                <li key={t.id}><Link href={t.incident_id ? `/incidencias/${t.incident_id}` : `/siniestros/${t.claim_id}`} className="flex justify-between gap-3 px-5 py-3 text-sm hover:bg-surface-2"><span>{t.title}<span className="block text-xs text-ink-3">{t.incident?.code ?? "Siniestro"}</span></span><span className={`tabular shrink-0 ${t.due_on && t.due_on < today ? "font-medium text-[var(--rojo-fg)]" : "text-ink-3"}`}>{fecha(t.due_on)}</span></Link></li>
              ))}</ul>)}
          </Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Comunidades asignadas" />
            <CardBody>{comms?.length ? <ul className="space-y-1.5 text-sm">{comms.map((c) => <li key={c.id} className="flex justify-between gap-2"><Link href={`/comunidades/${c.id}`} className="text-brand hover:underline">{c.name}</Link><span className="tabular text-xs text-ink-3">{c.open_incidents} abiertas</span></li>)}</ul> : <p className="text-sm text-ink-3">Pendiente de asignar comunidades.</p>}</CardBody>
          </Card>
          <Card><CardHeader title="Actividad reciente" /><CardBody><Timeline items={(activity ?? []) as ActivityRow[]} showContext /></CardBody></Card>
        </div>
      </div>
    </div>
  );
}
