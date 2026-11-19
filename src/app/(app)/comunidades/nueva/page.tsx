import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { requireSupervisor } from "@/lib/auth";
import { getStaffOptions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { CommunityForm } from "../community-form";
import { createCommunity } from "../actions";

export const metadata = { title: "Nueva comunidad" };

export default async function NuevaComunidadPage() {
  await requireSupervisor();
  const staff = await getStaffOptions();
  const supabase = await createClient();
  const { data: parents } = await supabase.from("communities").select("id, name, code").is("parent_id", null).eq("active", true).order("name");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<Link href="/comunidades" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Comunidades</Link>}
        title="Nueva comunidad" subtitle="Para dar de alta muchas comunidades a la vez, utilice la importación desde Excel." />
      <CommunityForm action={createCommunity} staff={staff} canAssign mode="create" cancelHref="/comunidades" parents={parents ?? []} />
    </div>
  );
}
