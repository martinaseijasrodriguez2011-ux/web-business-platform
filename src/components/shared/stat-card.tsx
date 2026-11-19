import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/components/ui/cx";

const tones: Record<string, string> = {
  gris: "bg-[var(--gris-bg)] text-[var(--gris-fg)]",
  azul: "bg-[var(--azul-bg)] text-[var(--azul-fg)]",
  naranja: "bg-[var(--naranja-bg)] text-[var(--naranja-fg)]",
  rojo: "bg-[var(--rojo-bg)] text-[var(--rojo-fg)]",
  verde: "bg-[var(--verde-bg)] text-[var(--verde-fg)]",
  violeta: "bg-[var(--violeta-bg)] text-[var(--violeta-fg)]",
};

export function StatCard({ label, value, icon: Icon, tone = "gris", href, emphasis }: { label: string; value: number | string; icon: LucideIcon; tone?: string; href: string; emphasis?: boolean }) {
  return (
    <Link href={href} className={cx("group flex items-center gap-3 rounded-xl border bg-surface p-4 transition-shadow hover:shadow-md", emphasis ? "border-[var(--rojo-dot)]/50" : "border-line")}>
      <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}><Icon size={20} /></span>
      <span className="min-w-0">
        <span className="tabular block text-2xl font-semibold leading-tight text-ink">{value}</span>
        <span className="block text-xs leading-tight text-ink-3 group-hover:text-ink-2">{label}</span>
      </span>
    </Link>
  );
}
