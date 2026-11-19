"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Field, Select } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { importCommunities, parseSpreadsheet, type ImportField, type ImportRowResult, type ParseResult } from "../actions";

const FIELDS: { key: ImportField; label: string; hints: string[]; required?: boolean }[] = [
  { key: "name", label: "Nombre de la comunidad", hints: ["comunidad", "nombre", "nom", "finca", "edificio"], required: true },
  { key: "code", label: "Código interno", hints: ["codigo", "código", "cod", "ref", "referencia", "id"] },
  { key: "parent", label: "Código de la comunidad general (si es subcomunidad)", hints: ["comunidad general", "general", "pertenece", "mancomunidad"] },
  { key: "manager", label: "Gestora responsable", hints: ["gestora", "gestor", "responsable", "lleva", "asignada", "administra"] },
  { key: "address", label: "Dirección", hints: ["direccion", "dirección", "domicilio", "calle", "adreça"] },
  { key: "postal_code", label: "Código postal", hints: ["cp", "postal", "c.p"] },
  { key: "city", label: "Población", hints: ["poblacion", "población", "municipio", "localidad", "ciudad", "poblacio"] },
  { key: "president_name", label: "Presidente/a", hints: ["presidente", "presidenta", "president"] },
  { key: "president_contact", label: "Contacto del presidente/a", hints: ["telefono", "teléfono", "contacto", "movil", "email"] },
  { key: "notes", label: "Observaciones", hints: ["observaciones", "notas", "comentarios"] },
];

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function ImportWizard({ staffNames }: { staffNames: string[] }) {
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [mapping, setMapping] = useState<Record<string, number | "">>({});
  const [mode, setMode] = useState<"solo_nuevas" | "nuevas_y_actualizar">("nuevas_y_actualizar");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ results: ImportRowResult[]; summary: { created: number; updated: number; skipped: number } } | null>(null);
  const [pending, start] = useTransition();
  const sheet = parsed?.sheets?.[sheetIdx];

  function autoMap(headers: string[]) {
    const m: Record<string, number | ""> = {};
    const used = new Set<number>();
    for (const f of FIELDS) {
      const idx = headers.findIndex((h, i) => !used.has(i) && f.hints.some((hint) => norm(h).includes(hint)));
      m[f.key] = idx >= 0 ? idx : "";
      if (idx >= 0) used.add(idx);
    }
    setMapping(m);
  }

  function onFile(fd: FormData) {
    setError(null); setResults(null);
    start(async () => {
      const r = await parseSpreadsheet(fd);
      if (!r.ok) { setError(r.error ?? "Error al leer el archivo."); return; }
      setParsed(r); setSheetIdx(0); autoMap(r.sheets![0].headers);
    });
  }

  const mappedRows = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.map((row) => Object.fromEntries(FIELDS.map((f) => [f.key, mapping[f.key] === "" || mapping[f.key] === undefined ? "" : row[mapping[f.key] as number] ?? ""])) as Record<ImportField, string>);
  }, [sheet, mapping]);

  const staffSet = useMemo(() => new Set(staffNames.flatMap((n) => [norm(n), norm(n.split(" ")[0])])), [staffNames]);
  const preview = mappedRows.map((r) => {
    const issues: string[] = [];
    if (!r.name) issues.push("Sin nombre");
    if (r.manager && !staffSet.has(norm(r.manager))) issues.push(`Gestora "${r.manager}" no reconocida`);
    return { r, issues };
  });
  const withIssues = preview.filter((p) => p.issues.length).length;

  function confirm() {
    if (!parsed) return;
    setError(null);
    start(async () => {
      const r = await importCommunities({ rows: mappedRows, mode, fileName: parsed.fileName!, storagePath: parsed.storagePath, size: parsed.size });
      if (!r.ok) { setError(r.error ?? "No se pudo importar."); return; }
      setResults({ results: r.results!, summary: r.summary! });
    });
  }

  if (results) {
    const errors = results.results.filter((r) => r.status === "error" || r.status === "omitida");
    return (
      <Card>
        <CardHeader title="Resultado de la importación" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--verde-bg)] p-4"><p className="text-sm text-[var(--verde-fg)]">Creadas</p><p className="tabular text-2xl font-semibold">{results.summary.created}</p></div>
            <div className="rounded-lg bg-[var(--azul-bg)] p-4"><p className="text-sm text-[var(--azul-fg)]">Actualizadas</p><p className="tabular text-2xl font-semibold">{results.summary.updated}</p></div>
            <div className="rounded-lg bg-[var(--naranja-bg)] p-4"><p className="text-sm text-[var(--naranja-fg)]">Omitidas o con error</p><p className="tabular text-2xl font-semibold">{results.summary.skipped}</p></div>
          </div>
          {errors.length > 0 && (
            <Table>
              <thead><tr><Th>Fila</Th><Th>Comunidad</Th><Th>Resultado</Th><Th>Detalle</Th></tr></thead>
              <tbody>{errors.map((e) => <tr key={e.row}><Td className="tabular">{e.row}</Td><Td>{e.name ?? "—"}</Td><Td><Badge tone={e.status === "error" ? "rojo" : "gris"}>{e.status === "error" ? "Error" : "Omitida"}</Badge></Td><Td className="text-ink-2">{e.message}</Td></tr>)}</tbody>
            </Table>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setParsed(null); setResults(null); }}>Importar otro archivo</Button>
            <ButtonLink href="/comunidades">Ver comunidades</ButtonLink>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="1. Archivo" subtitle="Excel (.xlsx) o CSV. La primera fila debe contener los títulos de las columnas."
          actions={<ButtonLink href="/api/plantillas/comunidades" variant="secondary" size="sm"><Download size={16} /> Descargar plantilla</ButtonLink>} />
        <CardBody>
          <form action={onFile} className="flex flex-wrap items-center gap-3">
            <input name="file" type="file" accept=".xlsx,.csv" required className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand" />
            <Button type="submit" disabled={pending}><FileSpreadsheet size={16} /> {pending && !parsed ? "Leyendo…" : "Leer archivo"}</Button>
          </form>
          {parsed && <p className="mt-3 text-sm text-ink-3">Archivo: {parsed.fileName} · {parsed.sheets!.length} hoja(s). El original queda guardado en Documentación.</p>}
          {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        </CardBody>
      </Card>

      {parsed && sheet && (
        <>
          <Card>
            <CardHeader title="2. Relacionar columnas" subtitle="Se proponen automáticamente según los títulos. Revise y corrija si es necesario." />
            <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {parsed.sheets!.length > 1 && (
                <Field label="Hoja" htmlFor="sheet" className="sm:col-span-2 lg:col-span-3">
                  <Select id="sheet" value={sheetIdx} onChange={(e) => { const i = Number(e.target.value); setSheetIdx(i); autoMap(parsed.sheets![i].headers); }}>
                    {parsed.sheets!.map((sh, i) => <option key={sh.name} value={i}>{sh.name} ({sh.rows.length} filas)</option>)}
                  </Select>
                </Field>
              )}
              {FIELDS.map((f) => (
                <Field key={f.key} label={f.label} htmlFor={`map-${f.key}`} required={f.required}>
                  <Select id={`map-${f.key}`} value={mapping[f.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value === "" ? "" : Number(e.target.value) })}>
                    <option value="">— No importar —</option>
                    {sheet.headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </Select>
                </Field>
              ))}
              <Field label="Comunidades que ya existen (mismo código o nombre)" htmlFor="mode" className="sm:col-span-2 lg:col-span-3"
                hint="Use «actualizar» para cargar después la gestora responsable de comunidades ya dadas de alta. Las celdas vacías no borran datos existentes.">
                <Select id="mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                  <option value="nuevas_y_actualizar">Crear las nuevas y actualizar las existentes</option>
                  <option value="solo_nuevas">Crear solo las nuevas (omitir existentes)</option>
                </Select>
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`3. Previsualización (${preview.length} filas)`} subtitle={withIssues ? `${withIssues} fila(s) con avisos no se importarán hasta corregirlas en el Excel.` : "Sin errores detectados."} />
            <Table className="max-h-[480px] overflow-y-auto">
              <thead><tr><Th>Fila</Th><Th>Nombre</Th><Th>Código</Th><Th>Comunidad general</Th><Th>Gestora</Th><Th>Dirección</Th><Th>Población</Th><Th>Avisos</Th></tr></thead>
              <tbody>
                {preview.slice(0, 300).map(({ r, issues }, i) => (
                  <tr key={i} className={issues.length ? "bg-[var(--naranja-bg)]/50" : ""}>
                    <Td className="tabular text-ink-3">{i + 2}</Td><Td>{r.name || "—"}</Td><Td className="tabular">{r.code || <span className="text-ink-3">automático</span>}</Td><Td className="tabular text-ink-2">{r.parent || "—"}</Td>
                    <Td>{r.manager || <span className="text-ink-3">sin asignar</span>}</Td><Td className="text-ink-2">{r.address || "—"}</Td><Td className="text-ink-2">{r.city || "—"}</Td>
                    <Td className="text-xs text-[var(--naranja-fg)]">{issues.join(" · ")}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {preview.length > 300 && <p className="px-4 py-2 text-xs text-ink-3">Se muestran las primeras 300 filas; se importarán todas.</p>}
            <div className="flex items-center justify-end gap-2 border-t border-line p-4">
              <Link href="/comunidades" className="text-sm text-ink-3 hover:text-ink">Cancelar</Link>
              <Button onClick={confirm} disabled={pending || mapping.name === "" || mapping.name === undefined}>{pending ? "Importando…" : "Confirmar importación"}</Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
