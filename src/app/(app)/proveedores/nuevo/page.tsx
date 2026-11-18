import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { getCategories } from "@/lib/queries";
import { ProviderForm } from "../provider-form";
import { createProvider } from "../actions";

export const metadata = { title: "Nuevo proveedor" };

export default async function NuevoProveedorPage() {
  await requireStaff();
  const specialties = (await getCategories("proveedor")).filter((c) => c.active && !c.parent_id);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<Link href="/proveedores" className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Proveedores</Link>} title="Nuevo proveedor" />
      <ProviderForm action={createProvider} specialties={specialties} mode="create" cancelHref="/proveedores" />
    </div>
  );
}
