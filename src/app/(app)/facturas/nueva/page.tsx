import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityOptions, getProviderOptions, getSettings } from "@/lib/queries";
import { hoyISO } from "@/lib/format";
import { InvoiceForm } from "../invoice-form";
import { createInvoice } from "../actions";

export const metadata = { title: "Registrar factura" };

export default async function NuevaFacturaPage({ searchParams }: { searchParams: Promise<{ incidencia?: string; comunidad?: string; presupuesto?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  const [communities, providers, settings, { data: incidents }, { data: budgets }] = await Promise.all([
    getCommunityOptions(), getProviderOptions(), getSettings(),
    supabase.from("incidents").select("id, code, title, community_id").neq("status", "cancelada").order("created_at", { ascending: false }).limit(1000),
    supabase.from("budgets").select("id, code, concept, community_id, incident_id, provider_id, base_amount, vat_rate, total_amount").eq("status", "aprobado").order("created_at", { ascending: false }),
  ]);
  const inc = incidents?.find((i) => i.id === sp.incidencia);
  const back = sp.presupuesto ? `/presupuestos/${sp.presupuesto}` : inc ? `/incidencias/${inc.id}` : "/facturas";
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<Link href={back} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Volver</Link>} title="Registrar factura" />
      {!providers.length ? <Alert tone="naranja">Antes de registrar facturas debe dar de alta al proveedor en <Link href="/proveedores/nuevo" className="underline">Proveedores</Link>.</Alert> : (
        <InvoiceForm action={createInvoice} communities={communities} providers={providers} incidents={incidents ?? []}
          budgets={(budgets ?? []).map((b) => ({ ...b, base_amount: b.base_amount === null ? null : Number(b.base_amount), vat_rate: Number(b.vat_rate), total_amount: Number(b.total_amount) }))}
          preset={{ community_id: inc?.community_id ?? sp.comunidad, incident_id: inc?.id, budget_id: sp.presupuesto }} defaultVat={Number(settings?.default_vat_rate ?? 21)} today={hoyISO()} cancelHref={back} />
      )}
    </div>
  );
}
