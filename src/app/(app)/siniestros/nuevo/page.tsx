import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCommunityOptions, getStaffOptions } from "@/lib/queries";
import { hoyISO } from "@/lib/format";
import { ClaimForm } from "../claim-form";
import { createClaim } from "../actions";

export const metadata = { title: "Nuevo siniestro" };

export default async function NuevoSiniestroPage({ searchParams }: { searchParams: Promise<{ incidencia?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  const [communities, staff, { data: incidents }] = await Promise.all([getCommunityOptions(), getStaffOptions(),
    supabase.from("incidents").select("id, code, title, community_id, manager_id").not("status", "in", "(cerrada,cancelada)").order("created_at", { ascending: false }).limit(1000)]);
  const inc = incidents?.find((i) => i.id === sp.incidencia);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<Link href={inc ? `/incidencias/${inc.id}` : "/siniestros"} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> {inc?.code ?? "Siniestros"}</Link>} title="Nuevo siniestro" />
      <ClaimForm action={createClaim} mode="create" communities={communities} incidents={incidents ?? []} staff={staff} today={hoyISO()}
        defaults={inc ? { community_id: inc.community_id, incident_id: inc.id, manager_id: inc.manager_id } : undefined} cancelHref={inc ? `/incidencias/${inc.id}` : "/siniestros"} />
    </div>
  );
}
