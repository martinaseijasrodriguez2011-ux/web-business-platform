import { cx } from "@/components/ui/cx";

/**
 * Marca de la aplicación. Si se ha cargado el logotipo oficial en
 * Configuración, se muestra tal cual; si no, se usa el monograma provisional.
 */
export function Brand({ logoUrl, collapsed, inverted, className }: { logoUrl?: string | null; collapsed?: boolean; inverted?: boolean; className?: string }) {
  return (
    <div className={cx("flex items-center gap-3", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Altayó & Rodríguez" className={cx("object-contain", collapsed ? "h-8 w-8" : "h-9 max-w-[140px]")} />
      ) : (
        <div className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold tracking-tight", inverted ? "bg-white text-brand" : "bg-brand text-white")}>
          AR
        </div>
      )}
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className={cx("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-ink")}>AR Incidencias</div>
          <div className={cx("text-xs", inverted ? "text-white/70" : "text-ink-3")}>Altayó &amp; Rodríguez</div>
        </div>
      )}
    </div>
  );
}
