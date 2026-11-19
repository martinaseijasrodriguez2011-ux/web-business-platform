"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  Home, AlertCircle, Building2, FileText, Receipt, Truck, ShieldAlert, CalendarDays, BarChart3, Users, Settings,
  Bell, LogOut, ChevronsLeft, ChevronsRight, Menu, X,
} from "lucide-react";
import { Brand } from "./brand";
import { cx } from "@/components/ui/cx";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/incidencias", label: "Incidencias", icon: AlertCircle },
  { href: "/comunidades", label: "Comunidades", icon: Building2 },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/facturas", label: "Facturas y pagos", icon: Receipt },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/siniestros", label: "Siniestros", icon: ShieldAlert },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/informes", label: "Informes", icon: BarChart3 },
  { href: "/equipo", label: "Equipo", icon: Users },
  { href: "/configuracion", label: "Configuración", icon: Settings, supervisorOnly: true },
];

function subscribe(cb: () => void) {
  window.addEventListener("ar-sidebar", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("ar-sidebar", cb); window.removeEventListener("storage", cb); };
}
function readCollapsed() {
  try { return localStorage.getItem("ar.sidebar") === "1"; } catch { return false; }
}

export function Sidebar({
  name, position, initials, avatarUrl, unread, supervisor, logoUrl,
}: { name: string; position: string; initials: string; avatarUrl?: string | null; unread: number; supervisor: boolean; logoUrl?: string | null }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  // El menú móvil se cierra solo al cambiar de página (se abre para la ruta actual)
  const [mobileOpenAt, setMobileOpenAt] = useState<string | null>(null);
  const mobileOpen = mobileOpenAt === pathname;
  const setMobileOpen = (open: boolean) => setMobileOpenAt(open ? pathname : null);

  const toggle = () => {
    try { localStorage.setItem("ar.sidebar", collapsed ? "0" : "1"); } catch {}
    window.dispatchEvent(new Event("ar-sidebar"));
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const content = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cx("flex h-16 items-center border-b border-line", isCollapsed ? "justify-center px-2" : "px-4")} style={{ boxShadow: "inset 0 3px 0 var(--brand-accent)" }}>
        <Link href="/" aria-label="Inicio"><Brand collapsed={isCollapsed} logoUrl={logoUrl} /></Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Menú principal">
        {NAV.filter((n) => !n.supervisorOnly || supervisor).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-gray-100 hover:text-ink",
                isCollapsed && "justify-center px-0",
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-line p-2">
        <Link
          href="/notificaciones"
          title="Notificaciones"
          className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-gray-100", isCollapsed && "justify-center px-0", pathname.startsWith("/notificaciones") && "bg-brand-soft text-brand")}
        >
          <span className="relative">
            <Bell size={18} strokeWidth={1.8} />
            {unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--rojo-dot)] px-1 text-[10px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>}
          </span>
          {!isCollapsed && <span>Notificaciones</span>}
        </Link>
        <Link href="/perfil" title="Mi perfil" className={cx("flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100", isCollapsed && "justify-center px-0")}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{initials}</span>
          )}
          {!isCollapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-ink">{name}</span>
              <span className="block truncate text-xs text-ink-3">{position}</span>
            </span>
          )}
        </Link>
        <form action={signOut}>
          <button type="submit" title="Cerrar sesión" className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-gray-100", isCollapsed && "justify-center px-0")}>
            <LogOut size={18} strokeWidth={1.8} />
            {!isCollapsed && <span>Cerrar sesión</span>}
          </button>
        </form>
        <button type="button" onClick={toggle} className="hidden w-full items-center justify-center rounded-lg py-1.5 text-ink-3 hover:bg-gray-100 lg:flex" aria-label={collapsed ? "Expandir menú" : "Contraer menú"}>
          {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setMobileOpen(true)} className="fixed left-3 top-3 z-40 rounded-lg border border-line bg-surface p-2 shadow-sm lg:hidden" aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-xl">
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-2 top-4 rounded-md p-1 text-ink-3" aria-label="Cerrar menú"><X size={18} /></button>
            {content(false)}
          </aside>
        </div>
      )}
      <aside className={cx("sticky top-0 hidden h-screen shrink-0 border-r border-line bg-surface transition-[width] lg:block", collapsed ? "w-[72px]" : "w-64")}>
        {content(collapsed)}
      </aside>
    </>
  );
}
