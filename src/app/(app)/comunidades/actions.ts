"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireSupervisor } from "@/lib/auth";
import { dbError, NO_PERMISSION, s } from "@/lib/action-utils";
import type { ActionResult } from "@/lib/types";
import type { Database } from "@/lib/database.types";

const communitySchema = z.object({
  code: z.string({ message: "Indique el código interno." }).min(1, "Indique el código interno.").max(40),
  name: z.string({ message: "Indique el nombre de la comunidad." }).min(2, "Indique el nombre de la comunidad.").max(200),
  address: z.string().max(300).nullable(),
  postal_code: z.string().max(10).nullable(),
  city: z.string().max(120).nullable(),
  manager_id: z.string().uuid().nullable(),
  president_name: z.string().max(200).nullable(),
  president_contact: z.string().max(200).nullable(),
  notes: z.string().max(5000).nullable(),
  registered_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  parent_id: z.string().uuid().nullable(),
});

function payload(fd: FormData) {
  return {
    code: s(fd, "code"), name: s(fd, "name"), address: s(fd, "address"), postal_code: s(fd, "postal_code"), city: s(fd, "city"),
    manager_id: s(fd, "manager_id"), president_name: s(fd, "president_name"), president_contact: s(fd, "president_contact"),
    notes: s(fd, "notes"), registered_on: s(fd, "registered_on"), parent_id: s(fd, "parent_id"),
  };
}

export async function createCommunity(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireSupervisor();
  const parsed = communitySchema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.from("communities").insert(parsed.data).select("id").single();
  if (error) return dbError(error, "No se pudo crear la comunidad.");
  revalidatePath("/comunidades");
  return { ok: true, id: data.id };
}

export async function updateCommunity(id: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const parsed = communitySchema.safeParse(payload(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const active = fd.get("active");
  const supabase = await createClient();
  const { data, error } = await supabase.from("communities")
    .update({ ...parsed.data, ...(active !== null ? { active: active === "true" } : {}) })
    .eq("id", id).select("id");
  if (error) return dbError(error);
  if (!data.length) return NO_PERMISSION;
  revalidatePath(`/comunidades/${id}`);
  return { ok: true, id, message: "Comunidad actualizada." };
}

export async function addContact(communityId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const name = s(fd, "name");
  if (!name) return { ok: false, error: "Indique el nombre del contacto." };
  const supabase = await createClient();
  const { error } = await supabase.from("community_contacts").insert({
    community_id: communityId, name, role: s(fd, "role"), unit: s(fd, "unit"), phone: s(fd, "phone"), email: s(fd, "email"), notes: s(fd, "notes"),
  });
  if (error) return dbError(error);
  revalidatePath(`/comunidades/${communityId}`);
  return { ok: true };
}

export async function linkProvider(communityId: string, _: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await requireStaff();
  const provider = s(fd, "provider_id");
  if (!provider) return { ok: false, error: "Seleccione un proveedor." };
  const supabase = await createClient();
  const { error } = await supabase.from("community_providers").insert({ community_id: communityId, provider_id: provider, service: s(fd, "service") });
  if (error) return dbError(error);
  revalidatePath(`/comunidades/${communityId}`);
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * Importación desde Excel
 * 1) parseSpreadsheet: lee el archivo, guarda el original sin modificar y
 *    devuelve hojas, columnas y filas para previsualizar.
 * 2) importCommunities: valida fila a fila y crea o actualiza comunidades.
 * ------------------------------------------------------------------------- */
export type ParsedSheet = { name: string; headers: string[]; rows: string[][] };
export type ParseResult = { ok: boolean; error?: string; sheets?: ParsedSheet[]; storagePath?: string; fileName?: string; size?: number };

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return v.result === undefined || v.result === null ? "" : String(v.result);
    if ("hyperlink" in v) return String((v as { hyperlink: string }).hyperlink);
    return "";
  }
  return String(v).trim();
}

export async function parseSpreadsheet(fd: FormData): Promise<ParseResult> {
  await requireSupervisor();
  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Seleccione un archivo Excel (.xlsx) o CSV." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "El archivo supera 10 MB." };
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  try {
    if (/\.csv$/i.test(file.name)) {
      const { Readable } = await import("node:stream");
      await wb.csv.read(Readable.from(buffer.toString("utf8")), { parserOptions: { delimiter: buffer.toString("utf8").includes(";") ? ";" : "," } });
    } else {
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    }
  } catch {
    return { ok: false, error: "No se pudo leer el archivo. Guárdelo como .xlsx (Excel 2007 o posterior) o CSV. El formato .xls antiguo no es compatible." };
  }
  const sheets: ParsedSheet[] = [];
  wb.eachSheet((ws) => {
    const all: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellText);
      if (values.some((x) => x !== "")) all.push(values);
    });
    if (!all.length) return;
    const width = Math.max(...all.map((r) => r.length));
    const headers = Array.from({ length: width }, (_, i) => all[0][i] || `Columna ${i + 1}`);
    sheets.push({ name: ws.name, headers, rows: all.slice(1, 2001).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? "")) });
  });
  if (!sheets.length) return { ok: false, error: "El archivo no contiene datos." };

  // Conserva el archivo original, sin modificarlo
  const supabase = await createClient();
  const safe = file.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const storagePath = `importaciones/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safe}`;
  await supabase.storage.from("documentos").upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });
  return { ok: true, sheets, storagePath, fileName: file.name, size: file.size };
}

const FIELDS = ["code", "name", "parent", "address", "postal_code", "city", "manager", "president_name", "president_contact", "notes"] as const;
export type ImportField = (typeof FIELDS)[number];
export type ImportRowResult = { row: number; status: "creada" | "actualizada" | "omitida" | "error"; message: string; name?: string };

const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export async function importCommunities(input: {
  rows: Partial<Record<ImportField, string>>[];
  mode: "solo_nuevas" | "nuevas_y_actualizar";
  fileName: string; storagePath?: string; size?: number;
}): Promise<{ ok: boolean; error?: string; results?: ImportRowResult[]; summary?: { created: number; updated: number; skipped: number } }> {
  await requireSupervisor();
  if (!Array.isArray(input.rows) || input.rows.length === 0) return { ok: false, error: "No hay filas para importar." };
  if (input.rows.length > 2000) return { ok: false, error: "Máximo 2.000 filas por importación." };
  const supabase = await createClient();

  const [{ data: staff }, { data: existing }] = await Promise.all([
    supabase.from("staff").select("id, full_name, short_name"),
    supabase.from("communities").select("id, code, name"),
  ]);
  const staffByName = new Map<string, string>();
  for (const st of staff ?? []) { staffByName.set(norm(st.full_name), st.id); staffByName.set(norm(st.short_name), st.id); }
  const byCode = new Map((existing ?? []).map((c) => [norm(c.code), c]));
  const byName = new Map((existing ?? []).map((c) => [norm(c.name), c]));
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();

  // Código automático correlativo para filas sin código: C-0001, C-0002…
  let autoSeq = Math.max(0, ...(existing ?? []).map((c) => /^C-(\d+)$/.exec(c.code)?.[1]).filter(Boolean).map(Number));

  const results: ImportRowResult[] = [];
  let created = 0, updated = 0, skipped = 0;
  // Subcomunidades: se vinculan al final, cuando ya existen todas las comunidades del archivo
  const pendingParents: { row: number; name: string; id: string; parentCode: string }[] = [];

  for (const [idx, raw] of input.rows.entries()) {
    const rowNo = idx + 2; // fila 1 = cabecera
    const r = Object.fromEntries(FIELDS.map((f) => [f, (raw[f] ?? "").toString().trim()])) as Record<ImportField, string>;
    if (!r.name && !r.code) { results.push({ row: rowNo, status: "omitida", message: "Fila sin nombre ni código." }); skipped++; continue; }
    if (!r.name) { results.push({ row: rowNo, status: "error", message: "Falta el nombre de la comunidad." }); skipped++; continue; }

    let managerId: string | null | undefined = undefined;
    if (r.manager) {
      managerId = staffByName.get(norm(r.manager)) ?? null;
      if (!managerId) { results.push({ row: rowNo, status: "error", name: r.name, message: `Gestora "${r.manager}" no reconocida. Use el nombre tal como figura en Equipo.` }); skipped++; continue; }
    }

    const key = r.code ? norm(r.code) : null;
    if ((key && seenCodes.has(key)) || seenNames.has(norm(r.name))) {
      results.push({ row: rowNo, status: "error", name: r.name, message: "Duplicada dentro del propio archivo." }); skipped++; continue;
    }
    if (key) seenCodes.add(key);
    seenNames.add(norm(r.name));

    const match = (key && byCode.get(key)) || byName.get(norm(r.name));
    const fields = {
      address: r.address || undefined, postal_code: r.postal_code || undefined, city: r.city || undefined,
      president_name: r.president_name || undefined, president_contact: r.president_contact || undefined, notes: r.notes || undefined,
    };

    if (match) {
      if (input.mode === "solo_nuevas") { results.push({ row: rowNo, status: "omitida", name: r.name, message: `Ya existe (${match.code}).` }); skipped++; continue; }
      const update = Object.fromEntries(Object.entries({ ...fields, manager_id: managerId }).filter(([, v]) => v !== undefined)) as Database["public"]["Tables"]["communities"]["Update"];
      if (!Object.keys(update).length && !r.parent) { results.push({ row: rowNo, status: "omitida", name: r.name, message: "Sin datos nuevos." }); skipped++; continue; }
      if (Object.keys(update).length) {
        const { error } = await supabase.from("communities").update(update).eq("id", match.id);
        if (error) { results.push({ row: rowNo, status: "error", name: r.name, message: dbError(error).error! }); skipped++; continue; }
      }
      results.push({ row: rowNo, status: "actualizada", name: r.name, message: !Object.keys(update).length ? "" : managerId ? "Gestora y datos actualizados." : "Datos actualizados." });
      if (r.parent) pendingParents.push({ row: rowNo, name: r.name, id: match.id, parentCode: r.parent });
      updated++;
      continue;
    }

    const code = r.code || `C-${String(++autoSeq).padStart(4, "0")}`;
    const { data: ins, error } = await supabase.from("communities").insert({ ...fields, code, name: r.name, manager_id: managerId ?? null }).select("id, code, name").single();
    if (error) { results.push({ row: rowNo, status: "error", name: r.name, message: dbError(error).error! }); skipped++; continue; }
    byCode.set(norm(ins.code), ins);
    if (r.parent) pendingParents.push({ row: rowNo, name: r.name, id: ins.id, parentCode: r.parent });
    results.push({ row: rowNo, status: "creada", name: r.name, message: r.code ? "Creada." : `Creada con código automático ${code}.` });
    created++;
  }

  for (const p of pendingParents) {
    const parent = byCode.get(norm(p.parentCode));
    const res = results.find((x) => x.row === p.row)!;
    if (!parent) { res.message += ` Aviso: no existe la comunidad general con código «${p.parentCode}»; no se ha vinculado.`; continue; }
    const { error } = await supabase.from("communities").update({ parent_id: parent.id }).eq("id", p.id);
    res.message += error ? ` Aviso: no se pudo vincular a ${parent.name} (${dbError(error).error}).` : ` Vinculada como subcomunidad de ${parent.name}.`;
  }

  let documentId: string | null = null;
  if (input.storagePath?.startsWith("importaciones/")) {
    const { data: doc } = await supabase.from("documents").insert({
      storage_path: input.storagePath, file_name: input.fileName, doc_type: "excel", size_bytes: input.size ?? null,
      description: "Archivo original de importación de comunidades",
    }).select("id").single();
    documentId = doc?.id ?? null;
  }
  await supabase.from("import_batches").insert({
    kind: "comunidades", file_name: input.fileName, document_id: documentId, rows_total: input.rows.length,
    rows_imported: created + updated, rows_skipped: skipped, report: results,
  });
  revalidatePath("/comunidades");
  return { ok: true, results, summary: { created, updated, skipped } };
}
