import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { isSupervisor, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "../profile-view";
import type { Staff } from "@/lib/types";

export default async function MiembroPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <div>
      <Link href="/equipo" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft size={16} /> Equipo</Link>
      <ProfileView staff={data as Staff} showLimit={isSupervisor(me) || me.id === id} />
    </div>
  );
}
