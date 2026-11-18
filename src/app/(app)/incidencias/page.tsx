import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/form";
import { cx } from "@/components/ui/cx";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getCommunityOptions, getProviderOptions, getStaffOptions, getStatusLabels } from "@/lib/queries";
import { fecha, haceTiempo } from "@/lib/format";
import { QUICK_VIEWS, SORTS } from "./views";
import type { IncidentStatus, Priority } from "@/lib/types";

export const metadata = { title: "Incidencias" };

type SP = Record<string, string | undefined>;
const PAGE = 50;

const OPEN_FILTER = "(resuelta,cerrada,cancelada)";

export default async function IncidenciasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const view = QUICK_VIEWS.find((v) => v.key === sp.vista) ?? QUICK_VIEWS[0];
  const sortKey = sp.orden && SORTS[sp.orden] ? sp.orden : "recientes";
  const page = Math.max(1, Number(sp.pagina) || 1);
  const supabase = await createClient();

  const [communities, staff, categories, providers, labels, countsRes] = await Promise.all([
    getCommunityOptions(), getStaffOptions(), getCategories("incidencia"), getProviderOptions(), getStatusLabels("incidencia"),
    supabase.from("incidents_view").select("status, is_overdue, is_open, manager_id"),
  ]);

  // Contadores de las vistas rápidas (siempre actualizados)
  const rows = countsRes.data ?? [];
  const counts: Record<string, number> = {};
  for (const v of QUICK_VIEWS) {
    counts[v.key] = rows.filter((r) =>
      v.special === "mine" ? r.manager_id === me.id
        : v.special === "overdue" ? r.is_overdue
        : v.special === "open" ? r.is_open
        : v.statuses ? v.statuses.includes(r.status) : true,
    ).length;
  }

  let q = supabase.from("incidents_view").select("*", { count: "exact" });
  if (view.special === "mine") q = q.eq("manager_id", me.id);
  if (view.special === "overdue") q = q.eq("is_overdue", true);
  if (view.special === "open") q = q.not("status", "in", OPEN_FILTER);
  if (view.statuses) q = q.in("status", view.statuses);
  if (sp.comunidad) q = q.eq("community_id", sp.comunidad);
  if (sp.gestora) q = q.eq("manager_id", sp.gestora);
  if (sp.proveedor) q = q.eq("provider_id", sp.proveedor);
  if (sp.categoria) q = q.eq("category_id", sp.categoria);
  if (sp.prioridad) q = q.eq("priority", sp.prioridad as Priority);
  if (sp.estado) q = q.eq("status", sp.estado as IncidentStatus);
  if (sp.desde) q = q.gte("created_at", sp.desde);
  if (sp.hasta) q = q.lte("created_at", `${sp.hasta}T23:59:59`);
  if (sp.vecino) q = q.or(`reporter_name.ilike.%${sp.vecino.replace(/[%,()]/g, "")}%,reporter_unit.ilike.%${sp.vecino.replace(/[%,()]/g, "")}%`);
  if (sp.numero) q = q.ilike("code", `%${sp.numero.replace(/[%,()]/g, "")}%`);
  for (const o of SORTS[sortKey]) q = q.order(o.column, { ascending: o.ascending, nullsFirst: o.nullsFirst });
  q = q.range((page - 1) * PAGE, page * PAGE - 1);
  const { data: incidents, count } = await q;

  const baseParams = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "pagina") as [string, string][]);
  const viewHref = (key: string) => {
    const p = new URLSearchParams(baseParams);
    if (key === "todas") p.delete("vista"); else p.set("vista", key);
    return `/incidencias?${p}`;
  };
  const pageHref = (n: number) => { const p = new URLSearchParams(baseParams); p.set("pagina", String(n)); return `/incidencias?${p}`; };
  const hasFilters = ["comunidad", "gestora", "proveedor", "categoria", "prioridad", "estado", "desde", "hasta", "vecino", "numero"].some((k) => sp[k]);
  const exportParams = new URLSearchParams(baseParams);

  return (
    <div>
      <PageHeader
        title="Incidencias"
        subtitle="Registro, seguimiento y resolución de todas las incidencias de las comunidades."
        actions={<>
          <ButtonLink href={`/api/exportar/incidencias?${exportParams}`} variant="secondary"><Download size={16} /> Excel</ButtonLink>
          <ButtonLink href="/incidencias/nueva"><Plus size={16} /> Nueva incidencia</ButtonLink>
        </>}
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {QUICK_VIEWS.map((v) => (
          <Link key={v.key} href={viewHref(v.key)}
            className={cx("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
              view.key === v.key ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong",
              v.special === "overdue" && counts[v.key] > 0 && view.key !== v.key && "border-[var(--rojo-dot)] text-[var(--rojo-fg)]")}>
            {v.label}
            <span className={cx("tabular rounded-full px-1.5 text-xs", view.key === v.key ? "bg-white/20" : "bg-gray-100")}>{counts[v.key]}</span>
          </Link>
        ))}
      </div>

      <Card className="mb-4">
        <form className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" action="/incidencias">
          {sp.vista && <input type="hidden" name="vista" value={sp.vista} />}
          <Select name="comunidad" defaultValue={sp.comunidad ?? ""} aria-label="Comunidad">
            <option value="">Todas las comunidades</option>
            {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select name="gestora" defaultValue={sp.gestora ?? ""} aria-label="Gestora">
            <option value="">Todas las gestoras</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </Select>
          <Select name="proveedor" defaultValue={sp.proveedor ?? ""} aria-label="Proveedor">
            <option value="">Todos los proveedores</option>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select name="categoria" defaultValue={sp.categoria ?? ""} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categories.filter((c) => !c.parent_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select name="prioridad" defaultValue={sp.prioridad ?? ""} aria-label="Prioridad">
            <option value="">Cualquier prioridad</option>
            <option value="urgente">Urgente</option><option value="alta">Alta</option><option value="normal">Normal</option><option value="baja">Baja</option>
          </Select>
          <Select name="estado" defaultValue={sp.estado ?? ""} aria-label="Estado">
            <option value="">Cualquier estado</option>
            {labels.list.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </Select>
          <Input name="numero" placeholder="Nº de incidencia" defaultValue={sp.numero ?? ""} aria-label="Número de incidencia" />
          <Input name="vecino" placeholder="Vecino o piso" defaultValue={sp.vecino ?? ""} aria-label="Vecino" />
          <Input name="desde" type="date" defaultValue={sp.desde ?? ""} aria-label="Creada desde" title="Creada desde" />
          <Input name="hasta" type="date" defaultValue={sp.hasta ?? ""} aria-label="Creada hasta" title="Creada hasta" />
          <Select name="orden" defaultValue={sortKey} aria-label="Ordenar">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Orden: {v[0].label}</option>)}
          </Select>
          <div className="flex gap-2">
            <button type="submit" className="h-10 flex-1 rounded-lg bg-brand px-4 text-sm font-medium text-white">Filtrar</button>
            {hasFilters && <Link href={sp.vista ? `/incidencias?vista=${sp.vista}` : "/incidencias"} className="flex h-10 items-center rounded-lg border border-line-strong px-3 text-sm text-ink-2">Limpiar</Link>}
          </div>
        </form>
      </Card>

      <Card>
        {!incidents?.length ? (
          <EmptyState title="No hay incidencias con estos criterios" description={hasFilters ? "Pruebe a cambiar o limpiar los filtros." : "Cuando se registre una incidencia aparecerá aquí."}
            action={<ButtonLink href="/incidencias/nueva"><Plus size={16} /> Nueva incidencia</ButtonLink>} />
        ) : (
          <>
            <Table>
              <thead>
                <tr><Th>Incidencia</Th><Th>Comunidad</Th><Th>Estado</Th><Th>Prioridad</Th><Th>Gestora</Th><Th>Progreso</Th><Th>Fecha límite</Th><Th>Actividad</Th></tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id} className="group hover:bg-surface-2">
                    <Td className="max-w-[320px]">
                      <Link href={`/incidencias/${i.id}`} className="block">
                        <span className="tabular text-xs font-medium text-ink-3">{i.code}</span>
                        <span className="block truncate font-medium text-ink group-hover:text-brand">{i.title}</span>
                        {(i.reporter_name || i.reporter_unit) && <span className="block truncate text-xs text-ink-3">{[i.reporter_name, i.reporter_unit].filter(Boolean).join(" · ")}</span>}
                      </Link>
                    </Td>
                    <Td><Link href={`/comunidades/${i.community_id}`} className="text-ink-2 hover:text-brand">{i.community_name}</Link></Td>
                    <Td><div className="flex flex-col items-start gap-1"><StatusBadge entity="incidencia" status={i.status} custom={labels.map} />{i.is_overdue && <Badge tone="rojo">Atrasada</Badge>}</div></Td>
                    <Td><PriorityBadge priority={i.priority} /></Td>
                    <Td className="text-ink-2">{i.manager_name ?? <span className="text-ink-3">Sin asignar</span>}</Td>
                    <Td className="tabular text-xs text-ink-2">{i.tasks_total ? `${i.tasks_done}/${i.tasks_total}` : "—"}</Td>
                    <Td className={cx("tabular text-sm", i.is_overdue ? "font-medium text-[var(--rojo-fg)]" : "text-ink-2")}>{fecha(i.due_on ?? i.planned_on)}</Td>
                    <Td className="text-xs text-ink-3">{haceTiempo(i.last_activity_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="flex items-center justify-between px-4 py-3 text-sm text-ink-3">
              <span>{count} incidencia{count === 1 ? "" : "s"}</span>
              <div className="flex gap-2">
                {page > 1 && <Link href={pageHref(page - 1)} className="rounded-md border border-line px-3 py-1 hover:bg-surface-2">Anterior</Link>}
                {(count ?? 0) > page * PAGE && <Link href={pageHref(page + 1)} className="rounded-md border border-line px-3 py-1 hover:bg-surface-2">Siguiente</Link>}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
