import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityOptions, getProviderOptions, getSettings } from "@/lib/queries";
import { hoyISO } from "@/lib/format";
import { BudgetForm } from "../../budget-form";
import { updateBudget } from "../../actions";

export const metadata = { title: "Editar presupuesto" };

export default async function EditarPresupuestoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: b } = await supabase.from("budgets").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();
  const { data: canEdit } = await supabase.rpc("can_edit_budget", { p_budget: id });
  if (!canEdit) redirect(`/presupuestos/${id}`);
  const [communities, providers, settings, { data: incidents }] = await Promise.all([
    getCommunityOptions(), getProviderOptions(), getSettings(),
    supabase.from("incidents").select("id, code, title, community_id").eq("community_id", b.community_id).order("created_at", { ascending: false }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<Link href={`/presupuestos/${id}`} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> {b.code}</Link>} title="Editar presupuesto" subtitle="Los cambios quedan registrados en el historial." />
      <BudgetForm action={updateBudget.bind(null, id)} mode="edit" communities={communities} providers={providers} incidents={incidents ?? []}
        defaults={{ ...b, base_amount: b.base_amount === null ? null : Number(b.base_amount), vat_rate: Number(b.vat_rate) }}
        defaultVat={Number(settings?.default_vat_rate ?? 21)} cancelHref={`/presupuestos/${id}`} today={hoyISO()} amountLocked={b.status === "aprobado"} />
    </div>
  );
}
