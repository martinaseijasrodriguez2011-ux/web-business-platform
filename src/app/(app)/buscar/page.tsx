import Link from "next/link";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { euros, fecha } from "@/lib/format";
import { signedUrl } from "@/lib/storage";

export const metadata = { title: "Buscar" };

export default async function BuscarPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff();
  const { q: raw } = await searchParams;
  const q = (raw ?? "").trim().replace(/[%,()\\]/g, " ").slice(0, 80);
  if (q.length < 2) return <div><PageHeader title="Buscar" /><EmptyState title="Escriba al menos 2 caracteres en el buscador superior." /></div>;
  const like = `%${q}%`;
  const supabase = await createClient();
  const [c, i, p, b, f, s, d] = await Promise.all([
    supabase.from("communities").select("id, name, code, address, city").or(`name.ilike.${like},code.ilike.${like},address.ilike.${like},president_name.ilike.${like}`).limit(20),
    supabase.from("incidents_view").select("id, code, title, status, community_name, reporter_name, reporter_unit").or(`code.ilike.${like},title.ilike.${like},reporter_name.ilike.${like},reporter_unit.ilike.${like},description.ilike.${like}`).order("created_at", { ascending: false }).limit(30),
    supabase.from("providers").select("id, trade_name, company_name, phone").or(`trade_name.ilike.${like},company_name.ilike.${like},contact_person.ilike.${like},tax_id.ilike.${like}`).limit(20),
    supabase.from("budgets_view").select("id, code, concept, status, total_amount, community_name").or(`code.ilike.${like},concept.ilike.${like}`).limit(20),
    supabase.from("invoices_view").select("id, invoice_number, status, total_amount, provider_name, community_name").ilike("invoice_number", like).limit(20),
    supabase.from("claims_view").select("id, code, claim_number, policy_number, insurer, status, community_name").or(`code.ilike.${like},claim_number.ilike.${like},policy_number.ilike.${like},insurer.ilike.${like}`).limit(20),
    supabase.from("documents").select("id, file_name, storage_path, created_at, incident_id, community_id").ilike("file_name", like).is("archived_at", null).limit(20),
  ]);
  const docLinks = await Promise.all((d.data ?? []).map((x) => signedUrl(x.storage_path)));
  const groups: { title: string; items: { href: string; title: string; sub?: string; badge?: React.ReactNode; external?: boolean }[] }[] = [
    { title: "Comunidades", items: (c.data ?? []).map((x) => ({ href: `/comunidades/${x.id}`, title: x.name, sub: [x.code, x.address, x.city].filter(Boolean).join(" · ") })) },
    { title: "Incidencias y vecinos", items: (i.data ?? []).map((x) => ({ href: `/incidencias/${x.id}`, title: `${x.code} · ${x.title}`, sub: [x.community_name, x.reporter_name, x.reporter_unit].filter(Boolean).join(" · "), badge: <StatusBadge entity="incidencia" status={x.status} /> })) },
    { title: "Proveedores", items: (p.data ?? []).map((x) => ({ href: `/proveedores/${x.id}`, title: x.trade_name, sub: [x.company_name, x.phone].filter(Boolean).join(" · ") })) },
    { title: "Presupuestos", items: (b.data ?? []).map((x) => ({ href: `/presupuestos/${x.id}`, title: `${x.code} · ${x.concept}`, sub: `${x.community_name} · ${euros(x.total_amount)}`, badge: <StatusBadge entity="presupuesto" status={x.status} /> })) },
    { title: "Facturas", items: (f.data ?? []).map((x) => ({ href: `/facturas/${x.id}`, title: `Factura ${x.invoice_number}`, sub: `${x.provider_name} · ${x.community_name} · ${euros(x.total_amount)}`, badge: <StatusBadge entity="factura" status={x.status} /> })) },
    { title: "Siniestros y expedientes", items: (s.data ?? []).map((x) => ({ href: `/siniestros/${x.id}`, title: `${x.code}${x.claim_number ? ` · Exp. ${x.claim_number}` : ""}`, sub: [x.community_name, x.insurer, x.policy_number].filter(Boolean).join(" · "), badge: <StatusBadge entity="siniestro" status={x.status} /> })) },
    { title: "Documentos", items: (d.data ?? []).map((x, k) => ({ href: docLinks[k] ?? "#", external: true, title: x.file_name, sub: `Subido el ${fecha(x.created_at)}` })) },
  ].filter((g) => g.items.length);
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Resultados para «${q}»`} subtitle={`${total} resultado${total === 1 ? "" : "s"}`} />
      {!groups.length ? <Card><EmptyState title="Sin resultados" description="Pruebe con otro término: nombre de comunidad, número de incidencia, vecino, proveedor, número de factura o de expediente." /></Card> : (
        <div className="space-y-6">{groups.map((g) => (
          <Card key={g.title}><CardHeader title={`${g.title} (${g.items.length})`} />
            <ul className="divide-y divide-line">{g.items.map((it, k) => (
              <li key={k}><Link href={it.href} target={it.external ? "_blank" : undefined} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2">
                <span className="min-w-0"><span className="block truncate text-sm font-medium">{it.title}</span>{it.sub && <span className="block truncate text-xs text-ink-3">{it.sub}</span>}</span>{it.badge}
              </Link></li>))}
            </ul>
          </Card>))}
        </div>
      )}
    </div>
  );
}
