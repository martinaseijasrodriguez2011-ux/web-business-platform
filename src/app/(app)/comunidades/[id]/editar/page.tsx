import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { isSupervisor, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStaffOptions } from "@/lib/queries";
import { CommunityForm } from "../../community-form";
import { updateCommunity } from "../../actions";

export const metadata = { title: "Editar comunidad" };

export default async function EditarComunidadPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("communities").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: canEdit } = await supabase.rpc("can_edit_community", { p_community: id });
  if (!canEdit) redirect(`/comunidades/${id}`);
  const staff = await getStaffOptions();
  const { data: parents } = await supabase.from("communities").select("id, name, code").is("parent_id", null).eq("active", true).neq("id", id).order("name");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<Link href={`/comunidades/${id}`} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> {c.name}</Link>} title="Editar comunidad" />
      <CommunityForm action={updateCommunity.bind(null, id)} staff={staff} defaults={c} canAssign={isSupervisor(me)} mode="edit" cancelHref={`/comunidades/${id}`} parents={parents ?? []} />
    </div>
  );
}
