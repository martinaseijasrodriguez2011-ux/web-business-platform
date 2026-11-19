import ExcelJS from "exceljs";
import { getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Plantilla Excel para cargar comunidades y su gestora responsable. */
export async function GET() {
  const me = await getCurrentStaff();
  if (!me) return new Response("No autorizado", { status: 401 });
  const supabase = await createClient();
  const { data: staff } = await supabase.from("staff").select("full_name, position").eq("active", true).order("role").order("short_name");

  const wb = new ExcelJS.Workbook();
  wb.creator = "AR Incidencias";
  const ws = wb.addWorksheet("Comunidades");
  ws.columns = [
    { header: "Código", key: "code", width: 14 },
    { header: "Comunidad", key: "name", width: 40 },
    { header: "Comunidad general (código)", key: "parent", width: 26 },
    { header: "Gestora", key: "manager", width: 22 },
    { header: "Dirección", key: "address", width: 40 },
    { header: "Código postal", key: "cp", width: 14 },
    { header: "Población", key: "city", width: 22 },
    { header: "Presidente", key: "president", width: 28 },
    { header: "Contacto presidente", key: "contact", width: 24 },
    { header: "Observaciones", key: "notes", width: 40 },
  ];
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3F3F3F" } };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  const names = (staff ?? []).map((s) => s.full_name);
  // Lista desplegable con los nombres del equipo en la columna "Gestora"
  for (let r = 2; r <= 1000; r++) {
    ws.getCell(`D${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`"${names.join(",")}"`], showErrorMessage: true, errorTitle: "Gestora", error: "Seleccione un nombre de la lista." };
  }
  const help = wb.addWorksheet("Instrucciones");
  help.getColumn(1).width = 110;
  [
    "Instrucciones para cargar comunidades en AR Incidencias",
    "",
    "1. Una fila por comunidad. La columna «Comunidad» es obligatoria.",
    "2. «Código»: código interno del despacho. Si se deja vacío, la aplicación asigna uno automático (C-0001…).",
    "3. «Gestora»: seleccione el nombre de la lista desplegable. Debe coincidir con el nombre que figura en Equipo.",
    "4. «Comunidad general (código)»: solo para subcomunidades (escaleras, parking, piscina…). Indique el código de la comunidad general a la que pertenecen; la comunidad general debe figurar también en el listado o existir ya.",
    "5. Si una comunidad ya existe (mismo código o nombre), puede actualizar su gestora sin duplicarla.",
    "6. Las celdas vacías no borran datos existentes.",
    "",
    "Equipo disponible:",
    ...names.map((n) => `   · ${n}`),
  ].forEach((t, i) => { help.getCell(`A${i + 1}`).value = t; });
  help.getCell("A1").font = { bold: true, size: 14 };

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-comunidades-AR-Incidencias.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
