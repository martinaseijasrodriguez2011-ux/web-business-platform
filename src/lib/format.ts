const TZ = "Europe/Madrid";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const dateFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export function euros(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return eur.format(Number(value));
}

/** Fechas "AAAA-MM-DD" se interpretan como fecha civil, sin desfase horario. */
export function fecha(value: string | Date | null | undefined) {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateFmt.format(new Date(value));
}

export function fechaHora(value: string | Date | null | undefined) {
  if (!value) return "—";
  return dateTimeFmt.format(new Date(value));
}

export function hora(value: string | Date | null | undefined) {
  if (!value) return "";
  return timeFmt.format(new Date(value));
}

export function hoyISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function haceTiempo(value: string | Date | null | undefined) {
  if (!value) return "—";
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return fecha(value);
}

export function saludo() {
  const h = Number(new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  if (h < 14) return "Buenos días";
  if (h < 21) return "Buenas tardes";
  return "Buenas noches";
}

export function tamano(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Desfase (ms) de Europe/Madrid respecto a UTC en un instante dado. */
function madridOffset(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUTC - date.getTime();
}

/** "AAAA-MM-DDTHH:mm" en hora de Madrid → ISO UTC. */
export function madridLocalToISO(local: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offset = madridOffset(new Date(guess));
  return new Date(guess - offset).toISOString();
}

/** Fecha y hora actual de Madrid en formato para <input type="datetime-local">. */
export function ahoraLocal() {
  const d = new Date(Date.now() + madridOffset(new Date()));
  return d.toISOString().slice(0, 16);
}

/** ISO → "AAAA-MM-DDTHH:mm" en hora de Madrid (para editar). */
export function isoToMadridLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() + madridOffset(d)).toISOString().slice(0, 16);
}
