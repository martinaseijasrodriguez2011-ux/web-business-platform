import { Bell, CheckCheck } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { haceTiempo, fechaHora } from "@/lib/format";
import { markAllRead, openNotification } from "./actions";

export const metadata = { title: "Notificaciones" };

export default async function NotificacionesPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  await supabase.rpc("generate_reminders");
  let q = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
  if (sp.ver !== "todas") q = q.is("read_at", null);
  const { data } = await q;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notificaciones" subtitle="Avisos internos. En esta fase no se envían correos automáticos."
        actions={<>
          <a href={sp.ver === "todas" ? "/notificaciones" : "/notificaciones?ver=todas"} className="text-sm text-brand hover:underline">{sp.ver === "todas" ? "Ver solo sin leer" : "Ver también las leídas"}</a>
          <form action={markAllRead}><Button variant="secondary" type="submit"><CheckCheck size={16} /> Marcar todas como leídas</Button></form>
        </>} />
      <Card>
        {!data?.length ? <EmptyState title="No tiene notificaciones pendientes" /> : (
          <ul className="divide-y divide-line">
            {data.map((n) => (
              <li key={n.id}>
                <form action={openNotification.bind(null, n.id, n.link)}>
                  <button type="submit" className={cx("flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-surface-2", !n.read_at && "bg-brand-soft/40")}>
                    <span className={cx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", /urgente|atrasad|supera/.test(n.kind) ? "bg-[var(--rojo-bg)] text-[var(--rojo-fg)]" : "bg-[var(--azul-bg)] text-[var(--azul-fg)]")}><Bell size={15} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cx("block text-sm", !n.read_at ? "font-semibold" : "font-medium text-ink-2")}>{n.title}</span>
                      {n.body && <span className="block truncate text-sm text-ink-3">{n.body}</span>}
                      <span className="block text-xs text-ink-3" title={fechaHora(n.created_at)}>{haceTiempo(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Sin leer" />}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
