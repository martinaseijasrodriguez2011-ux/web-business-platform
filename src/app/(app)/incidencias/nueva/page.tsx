import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/form";
import { requireStaff } from "@/lib/auth";
import { getCategories, getCommunityOptions, getProviderOptions, getStaffOptions } from "@/lib/queries";
import { hoyISO } from "@/lib/format";
import { IncidentForm } from "../incident-form";
import { createIncident } from "../actions";

export const metadata = { title: "Nueva incidencia" };

export default async function NuevaIncidenciaPage({ searchParams }: { searchParams: Promise<{ comunidad?: string }> }) {
  const me = await requireStaff();
  const { comunidad } = await searchParams;
  const [communities, staff, categories, providers] = await Promise.all([
    getCommunityOptions(), getStaffOptions(), getCategories("incidencia"), getProviderOptions(),
  ]);
  const preset = communities.find((c) => c.id === comunidad);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={<Link href="/incidencias" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Incidencias</Link>}
        title="Nueva incidencia"
        subtitle="Registre el aviso con los datos disponibles. Podrá completarlo después."
      />
      {!communities.length ? (
        <Alert tone="naranja">No hay comunidades dadas de alta. Dirección o Coordinación deben crearlas (o importarlas desde Excel) antes de registrar incidencias.</Alert>
      ) : (
        <IncidentForm
          action={createIncident}
          mode="create"
          communities={communities}
          staff={staff}
          categories={categories}
          providers={providers}
          currentStaffName={me.full_name}
          today={hoyISO()}
          cancelHref="/incidencias"
          defaults={preset ? { community_id: preset.id, manager_id: preset.manager_id } : undefined}
        />
      )}
    </div>
  );
}
