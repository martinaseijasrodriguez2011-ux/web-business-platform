import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/form";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries";
import { euros } from "@/lib/format";

export const metadata = { title: "Proveedores" };

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("providers").select("id, trade_name, company_name, contact_person, phone, email, active, provider_specialties(category_id, categories(name))").order("trade_name");
  if (sp.q) { const t = sp.q.replace(/[%,()]/g, ""); q = q.or(`trade_name.ilike.%${t}%,company_name.ilike.%${t}%,contact_person.ilike.%${t}%`); }
  if (sp.estado !== "todos") q = q.eq("active", sp.estado !== "inactivos");
  const [{ data }, specialties, { data: inv }] = await Promise.all([q, getCategories("proveedor"), supabase.from("invoices").select("provider_id, total_amount")]);
  const spent = new Map<string, number>();
  for (const f of inv ?? []) spent.set(f.provider_id, (spent.get(f.provider_id) ?? 0) + Number(f.total_amount));
  const rows = (data ?? []).filter((p) => !sp.especialidad || p.provider_specialties.some((x) => x.category_id === sp.especialidad));
  return (
    <div>
      <PageHeader title="Proveedores" subtitle="Directorio centralizado de proveedores del despacho." actions={<ButtonLink href="/proveedores/nuevo"><Plus size={16} /> Nuevo proveedor</ButtonLink>} />
      <Card className="mb-4">
        <form className="grid gap-3 p-4 sm:grid-cols-[1fr_220px_160px_auto]">
          <Input name="q" placeholder="Buscar por nombre, empresa o contacto" defaultValue={sp.q ?? ""} aria-label="Buscar proveedor" />
          <Select name="especialidad" defaultValue={sp.especialidad ?? ""} aria-label="Especialidad"><option value="">Todas las especialidades</option>{specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <Select name="estado" defaultValue={sp.estado ?? ""} aria-label="Situación"><option value="">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option></Select>
          <button className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white">Buscar</button>
        </form>
      </Card>
      <Card>
        {!rows.length ? <EmptyState title="No hay proveedores" description="Dé de alta los proveedores habituales del despacho." action={<ButtonLink href="/proveedores/nuevo"><Plus size={16} /> Nuevo proveedor</ButtonLink>} /> : (
          <Table>
            <thead><tr><Th>Proveedor</Th><Th>Especialidades</Th><Th>Contacto</Th><Th className="text-right">Facturado</Th></tr></thead>
            <tbody>{rows.map((p) => (
              <tr key={p.id} className="hover:bg-surface-2">
                <Td><Link href={`/proveedores/${p.id}`} className="font-medium hover:text-brand">{p.trade_name}</Link>{p.company_name && <span className="block text-xs text-ink-3">{p.company_name}</span>}{!p.active && <Badge tone="gris">Inactivo</Badge>}</Td>
                <Td><div className="flex flex-wrap gap-1">{p.provider_specialties.map((x) => <Badge key={x.category_id} tone="azul" dot={false}>{x.categories?.name}</Badge>)}</div></Td>
                <Td className="text-ink-2">{[p.contact_person, p.phone, p.email].filter(Boolean).join(" · ") || "—"}</Td>
                <Td className="tabular text-right">{euros(spent.get(p.id) ?? 0)}</Td>
              </tr>))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
