import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { corporateUrl } from "@/lib/storage";
import { ROLE } from "@/lib/labels";

export const metadata = { title: "Equipo" };

export default async function EquipoPage() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: staff }, { data: inc }, { data: comms }, { data: tasks }] = await Promise.all([
    supabase.from("staff").select("*").order("role").order("short_name"),
    supabase.from("incidents_view").select("manager_id, is_open, is_overdue"),
    supabase.from("communities").select("manager_id").eq("active", true),
    supabase.from("tasks").select("assignee_id").eq("done", false),
  ]);
  return (
    <div>
      <PageHeader title="Equipo" subtitle="Personas de Altayó & Rodríguez con acceso a AR Incidencias." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(staff ?? []).map((s) => {
          const mine = (inc ?? []).filter((i) => i.manager_id === s.id);
          const avatar = corporateUrl(s.avatar_path);
          return (
            <Link key={s.id} href={`/equipo/${s.id}`}>
              <Card className="h-full p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  {avatar ? <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */
                    : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand">{s.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.full_name}</p>
                    <p className="truncate text-sm text-ink-3">{s.position}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone={s.role === "gestora" ? "gris" : "violeta"} dot={false}>{ROLE[s.role]}</Badge>
                  {s.can_edit_all && s.role === "gestora" && <Badge tone="azul" dot={false}>Edición global</Badge>}
                  {!s.active && <Badge tone="gris">Desactivado</Badge>}
                  {s.active && !s.user_id && <Badge tone="naranja">Sin acceso (invitación pendiente)</Badge>}
                </div>
                <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[["Comunidades", (comms ?? []).filter((c) => c.manager_id === s.id).length], ["Abiertas", mine.filter((i) => i.is_open).length], ["Atrasadas", mine.filter((i) => i.is_overdue).length], ["Tareas", (tasks ?? []).filter((t) => t.assignee_id === s.id).length]].map(([k, v]) => (
                    <div key={k as string} className="rounded-lg bg-surface-2 py-2"><dd className="tabular font-semibold">{v}</dd><dt className="text-[11px] text-ink-3">{k}</dt></div>
                  ))}
                </dl>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
