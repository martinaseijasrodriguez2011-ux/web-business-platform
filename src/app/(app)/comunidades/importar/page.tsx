import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { requireSupervisor } from "@/lib/auth";
import { getStaffOptions } from "@/lib/queries";
import { ImportWizard } from "./import-wizard";

export const metadata = { title: "Importar comunidades" };

export default async function ImportarPage() {
  await requireSupervisor();
  const staff = await getStaffOptions();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        back={<Link href="/comunidades" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Comunidades</Link>}
        title="Importar comunidades desde Excel"
        subtitle="Suba la hoja de cálculo, relacione las columnas, revise la previsualización y confirme. El archivo original se conserva sin modificar."
      />
      <ImportWizard staffNames={staff.map((s) => s.full_name)} />
    </div>
  );
}
