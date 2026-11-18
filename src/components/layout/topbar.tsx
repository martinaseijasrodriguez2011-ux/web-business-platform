import Link from "next/link";
import { Bell, Plus, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function Topbar({ unread }: { unread: number }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 pl-16 pr-4 lg:px-8">
        <form action="/buscar" className="relative min-w-0 max-w-xl flex-1" role="search">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            name="q"
            type="search"
            placeholder="Buscar comunidades, incidencias, vecinos, proveedores, facturas…"
            aria-label="Buscador global"
            className="h-10 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm placeholder:text-ink-3 focus:border-brand focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </form>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/notificaciones" className="relative rounded-lg p-2 text-ink-2 hover:bg-gray-100" aria-label={`Notificaciones (${unread} sin leer)`}>
            <Bell size={20} strokeWidth={1.8} />
            {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--rojo-dot)]" />}
          </Link>
          <ButtonLink href="/incidencias/nueva" className="hidden sm:inline-flex"><Plus size={16} /> Nueva incidencia</ButtonLink>
          <ButtonLink href="/incidencias/nueva" className="sm:hidden" aria-label="Nueva incidencia"><Plus size={18} /></ButtonLink>
        </div>
      </div>
    </header>
  );
}
