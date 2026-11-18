import Link from "next/link";
import { Plus, Upload, Download } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/form";
import { isSupervisor, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStaffOptions } from "@/lib/queries";
import { haceTiempo } from "@/lib/format";

export const metadata = { title: "Comunidades" };

export default async function ComunidadesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("communities_view").select("*").order("name");
  if (sp.gestora === "sin") q = q.is("manager_id", null);
  else if (sp.gestora) q = q.eq("manager_id", sp.gestora);
  if (sp.estado === "baja") q = q.eq("active", false); else if (sp.estado !== "todas") q = q.eq("active", true);
  if (sp.q) {
    const t = sp.q.replace(/[%,()]/g, "");
    q = q.or(`name.ilike.%${t}%,code.ilike.%${t}%,address.ilike.%${t}%,city.ilike.%${t}%`);
  }
  const [{ data: rows }, staff] = await Promise.all([q, getStaffOptions()]);
  const unassigned = (rows ?? []).filter((r) => !r.manager_id).length;
  const sup = isSupervisor(me);

  return (
    <div>
      <PageHeader
        title="Comunidades"
        subtitle="Todas las gestoras pueden consultar todas las comunidades. Cada comunidad tiene una gestora responsable."
        actions={<>
          <ButtonLink href={`/api/exportar/comunidades`} variant="secondary"><Download size={16} /> Excel</ButtonLink>
          {sup && <ButtonLink href="/comunidades/importar" variant="secondary"><Upload size={16} /> Importar Excel</ButtonLink>}
          {sup && <ButtonLink href="/comunidades/nueva"><Plus size={16} /> Nueva comunidad</ButtonLink>}
        </>}
      />
      {unassigned > 0 && !sp.gestora && (
        <div className="mb-4 rounded-lg border border-[var(--naranja-dot)]/40 bg-[var(--naranja-bg)] px-4 py-3 text-sm text-[var(--naranja-fg)]">
          {unassigned} comunidad{unassigned === 1 ? "" : "es"} sin gestora responsable (pendiente de configurar). <Link href="/comunidades?gestora=sin" className="font-medium underline">Ver</Link>
        </div>
      )}
      <Card className="mb-4">
        <form className="grid gap-3 p-4 sm:grid-cols-[1fr_220px_180px_auto]">
          <Input name="q" placeholder="Buscar por nombre, código, dirección o población" defaultValue={sp.q ?? ""} aria-label="Buscar comunidad" />
          <Select name="gestora" defaultValue={sp.gestora ?? ""} aria-label="Gestora">
            <option value="">Todas las gestoras</option>
            <option value="sin">Sin gestora asignada</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </Select>
          <Select name="estado" defaultValue={sp.estado ?? ""} aria-label="Situación">
            <option value="">Activas</option><option value="baja">De baja</option><option value="todas">Todas</option>
          </Select>
          <button className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white">Filtrar</button>
        </form>
      </Card>
      <Card>
        {!rows?.length ? (
          <EmptyState title="No hay comunidades" description={sup ? "Dé de alta las comunidades una a una o impórtelas desde Excel, indicando la gestora responsable de cada una." : "Dirección o Coordinación darán de alta las comunidades."}
            action={sup ? <ButtonLink href="/comunidades/importar"><Upload size={16} /> Importar desde Excel</ButtonLink> : undefined} />
        ) : (
          <Table>
            <thead><tr><Th>Comunidad</Th><Th>Código</Th><Th>Gestora responsable</Th><Th className="text-center">Abiertas</Th><Th className="text-center">Cerradas</Th><Th>Última actividad</Th><Th>Estado general</Th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="group hover:bg-surface-2">
                  <Td><Link href={`/comunidades/${c.id}`} className="block"><span className="font-medium text-ink group-hover:text-brand">{c.name}</span><span className="block text-xs text-ink-3">{[c.address, c.city].filter(Boolean).join(", ") || "Dirección pendiente"}</span></Link></Td>
                  <Td className="tabular text-ink-2">{c.code}</Td>
                  <Td>{c.manager_name ?? <Badge tone="naranja">Pendiente de asignar</Badge>}</Td>
                  <Td className="tabular text-center">{c.open_incidents}</Td>
                  <Td className="tabular text-center text-ink-3">{c.closed_incidents}</Td>
                  <Td className="text-xs text-ink-3">{haceTiempo(c.last_activity_at)}</Td>
                  <Td>
                    {!c.active ? <Badge tone="gris">De baja</Badge>
                      : (c.urgent_incidents ?? 0) > 0 ? <Badge tone="rojo">{c.urgent_incidents} urgente{c.urgent_incidents === 1 ? "" : "s"}</Badge>
                      : (c.overdue_incidents ?? 0) > 0 ? <Badge tone="naranja">{c.overdue_incidents} atrasada{c.overdue_incidents === 1 ? "" : "s"}</Badge>
                      : (c.open_incidents ?? 0) > 0 ? <Badge tone="azul">En seguimiento</Badge>
                      : <Badge tone="verde">Sin pendientes</Badge>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
