import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/queries";
import { ProviderForm } from "../../provider-form";
import { updateProvider } from "../../actions";

export const metadata = { title: "Editar proveedor" };

export default async function EditarProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: p }, { data: sel }, cats] = await Promise.all([
    supabase.from("providers").select("*").eq("id", id).maybeSingle(),
    supabase.from("provider_specialties").select("category_id").eq("provider_id", id),
    getCategories("proveedor"),
  ]);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<Link href={`/proveedores/${id}`} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> {p.trade_name}</Link>} title="Editar proveedor" />
      <ProviderForm action={updateProvider.bind(null, id)} specialties={cats.filter((c) => c.active && !c.parent_id)} selected={(sel ?? []).map((x) => x.category_id)} defaults={p} mode="edit" cancelHref={`/proveedores/${id}`} />
    </div>
  );
}
