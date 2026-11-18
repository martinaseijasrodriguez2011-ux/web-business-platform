"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Datum = { label: string; value: number; href?: string; tone?: string };

const TONE: Record<string, string> = {
  gris: "#9ca3af", azul: "#3b82f6", naranja: "#f97316", rojo: "#ef4444", verde: "#22c55e", violeta: "#8b5cf6",
};
const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function TooltipBox({ active, payload, money }: { active?: boolean; payload?: { payload: Datum }[]; money?: boolean }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{d.label}</p>
      <p className="tabular text-ink-2">{money ? eur.format(d.value) : d.value}</p>
      {d.href && <p className="mt-0.5 text-ink-3">Clic para ver el detalle</p>}
    </div>
  );
}

/** Barras horizontales (magnitud, un solo tono o color de estado). Clic → registros. */
export function HBarChart({ data, money, height }: { data: Datum[]; money?: boolean; height?: number }) {
  const router = useRouter();
  if (!data.length) return <p className="py-10 text-center text-sm text-ink-3">Sin datos todavía.</p>;
  const h = height ?? Math.max(160, data.length * 34 + 20);
  return (
    <div style={{ height: h }} role="img" aria-label={data.map((d) => `${d.label}: ${money ? eur.format(d.value) : d.value}`).join("; ")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }} barCategoryGap={6}>
          <CartesianGrid horizontal={false} stroke="#eef0f3" />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false}
            tickFormatter={(v) => (money ? eur.format(v) : String(v))} />
          <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12, fill: "#374151" }} axisLine={false} tickLine={false}
            tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 21) + "…" : v)} />
          <Tooltip cursor={{ fill: "rgba(31,58,95,0.05)" }} content={<TooltipBox money={money} />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} onClick={(d) => { const p = (d as unknown as { payload: Datum }).payload; if (p?.href) router.push(p.href); }} className="cursor-pointer">
            {data.map((d) => <Cell key={d.label} fill={d.tone ? TONE[d.tone] : "var(--brand)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Evolución mensual (una sola serie). */
export function MonthlyLine({ data }: { data: Datum[] }) {
  const router = useRouter();
  if (!data.some((d) => d.value > 0)) return <p className="py-10 text-center text-sm text-ink-3">Sin datos todavía.</p>;
  return (
    <div style={{ height: 220 }} role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join("; ")}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
          onClick={(e) => { const i = (e as { activeTooltipIndex?: number })?.activeTooltipIndex; const d = typeof i === "number" ? data[i] : undefined; if (d?.href) router.push(d.href); }}>
          <CartesianGrid vertical={false} stroke="#eef0f3" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipBox />} cursor={{ stroke: "#d1d5db" }} />
          <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={{ r: 4, fill: "var(--brand)", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
