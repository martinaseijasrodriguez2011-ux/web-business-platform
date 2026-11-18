import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { Select } from "@/components/ui/form";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CLAIM_STATUS } from "@/lib/labels";
import { fecha, fechaHora } from "@/lib/format";
import type { ClaimStatus } from "@/lib/types";

export const metadata = { title: "Siniestros" };

export default async function SiniestrosPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("claims_view").select("*").order("created_at", { ascending: false });
  if (sp.estado === "abiertos") q = q.not("status", "in", "(finalizado,cerrado)");
  else if (sp.estado) q = q.eq("status", sp.estado as ClaimStatus);
  const { data } = await q;
  return (
    <div>
      <PageHeader title="Siniestros y seguros" subtitle="Expedientes de siniestro, gestionados de forma diferenciada de las reparaciones ordinarias." actions={<ButtonLink href="/siniestros/nuevo"><Plus size={16} /> Nuevo siniestro</ButtonLink>} />
      <Card className="mb-4"><form className="flex gap-3 p-4">
        <Select name="estado" defaultValue={sp.estado ?? ""} className="max-w-xs" aria-label="Estado"><option value="">Todos</option><option value="abiertos">Abiertos</option>{Object.entries(CLAIM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
        <button className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white">Filtrar</button>
      </form></Card>
      <Card>
        {!data?.length ? <EmptyState title="No hay siniestros" /> : (
          <Table>
            <thead><tr><Th>Expediente</Th><Th>Comunidad</Th><Th>Aseguradora</Th><Th>Fecha</Th><Th>Visita perito</Th><Th>Gestora</Th><Th>Estado</Th></tr></thead>
            <tbody>{data.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2">
                <Td><Link href={`/siniestros/${c.id}`} className="font-medium hover:text-brand">{c.code}</Link>{c.claim_number && <span className="block text-xs text-ink-3">Exp. {c.claim_number}</span>}</Td>
                <Td className="text-ink-2">{c.community_name}{c.incident_code && <span className="block text-xs text-ink-3">{c.incident_code}</span>}</Td>
                <Td className="text-ink-2">{c.insurer ?? "—"}</Td><Td className="text-ink-3">{fecha(c.occurred_on)}</Td>
                <Td className="text-ink-2">{c.visit_at ? fechaHora(c.visit_at) : "—"}</Td><Td className="text-ink-2">{c.manager_name ?? "—"}</Td>
                <Td><StatusBadge entity="siniestro" status={c.status} /></Td>
              </tr>))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
