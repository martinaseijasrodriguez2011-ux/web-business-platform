import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories, getCommunityOptions, getProviderOptions, getStaffOptions } from "@/lib/queries";
import { hoyISO } from "@/lib/format";
import { IncidentForm } from "../../incident-form";
import { updateIncident } from "../../actions";

export const metadata = { title: "Editar incidencia" };

export default async function EditarIncidenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: inc } = await supabase.from("incidents").select("*").eq("id", id).maybeSingle();
  if (!inc) notFound();
  const { data: canEdit } = await supabase.rpc("can_edit_incident", { p_incident: id });
  if (!canEdit) redirect(`/incidencias/${id}`);
  const [communities, staff, categories, providers] = await Promise.all([getCommunityOptions(), getStaffOptions(), getCategories("incidencia"), getProviderOptions()]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={<Link href={`/incidencias/${id}`} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> {inc.code}</Link>}
        title="Editar incidencia"
        subtitle="Cada cambio queda registrado en el historial con el valor anterior y el nuevo."
      />
      <IncidentForm action={updateIncident.bind(null, id)} mode="edit" communities={communities} staff={staff} categories={categories}
        providers={providers} defaults={inc} currentStaffName={me.full_name} today={hoyISO()} cancelHref={`/incidencias/${id}`} />
    </div>
  );
}
