import Link from "next/link";
import { cx } from "./cx";

/** Pestañas basadas en URL (?tab=), compatibles con navegación y enlaces directos. */
export function Tabs({ tabs, active, basePath }: { tabs: { key: string; label: string; count?: number }[]; active: string; basePath: string }) {
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-line" aria-label="Pestañas">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.key === tabs[0].key ? basePath : `${basePath}?tab=${t.key}`}
          scroll={false}
          className={cx(
            "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium",
            active === t.key ? "border-brand text-ink" : "border-transparent text-ink-3 hover:text-ink",
          )}
          aria-current={active === t.key ? "page" : undefined}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-gray-100 px-1.5 text-xs text-ink-2">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
