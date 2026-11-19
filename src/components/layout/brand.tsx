import { cx } from "@/components/ui/cx";

export const DEFAULT_LOGO = "/brand/logo-altayo-rodriguez.jpg";

/**
 * Marca de la aplicación con el logotipo oficial de Altayó & Rodríguez,
 * mostrado sin modificar. Si Dirección sube otra versión en Configuración,
 * se usa esa. En el menú contraído se muestra el monograma.
 */
export function Brand({ logoUrl, collapsed, className, size = "md" }: { logoUrl?: string | null; collapsed?: boolean; className?: string; size?: "md" | "lg" }) {
  if (collapsed) {
    return (
      <div className={cx("flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-sm font-bold tracking-tight", className)} aria-label="AR Incidencias · Altayó & Rodríguez">
        <span className="text-brand-accent">A</span><span className="text-brand-gray">R</span>
      </div>
    );
  }
  return (
    <div className={cx("flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl || DEFAULT_LOGO} alt="Altayó & Rodríguez" className={cx("w-auto object-contain", size === "lg" ? "h-20" : "h-10")} />
      <span className={cx("border-l border-line pl-3 font-semibold leading-tight tracking-tight text-brand-gray", size === "lg" ? "text-lg" : "text-[13px]")}>
        AR<br />Incidencias
      </span>
    </div>
  );
}
