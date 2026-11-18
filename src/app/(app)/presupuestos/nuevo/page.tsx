import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityOptions, getProviderOptions, getSettings } from "@/lib/queries";
import { hoyISO } from "@/lib/format";
import { BudgetForm } from "../budget-form";
import { createBudget } from "../actions";

export const metadata = { title: "Nuevo presupuesto" };

export default async function NuevoPresupuestoPage({ searchParams }: { searchParams: Promise<{ incidencia?: string; comunidad?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  const [communities, providers, settings, { data: incidents }] = await Promise.all([
    getCommunityOptions(), getProviderOptions(), getSettings(),
    supabase.from("incidents").select("id, code, title, community_id").not("status", "in", "(cerrada,cancelada)").order("created_at", { ascending: false }).limit(1000),
  ]);
  const inc = incidents?.find((i) => i.id === sp.incidencia);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<Link href={inc ? `/incidencias/${inc.id}` : "/presupuestos"} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> {inc ? inc.code : "Presupuestos"}</Link>}
        title="Nuevo presupuesto" subtitle="Después de guardarlo podrá adjuntar el PDF y registrar autorizaciones." />
      <BudgetForm action={createBudget} mode="create" communities={communities} providers={providers} incidents={incidents ?? []}
        defaults={{ incident_id: inc?.id ?? null, community_id: inc?.community_id ?? sp.comunidad }} defaultVat={Number(settings?.default_vat_rate ?? 21)}
        cancelHref={inc ? `/incidencias/${inc.id}` : "/presupuestos"} today={hoyISO()} />
    </div>
  );
}
