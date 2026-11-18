import type { NextRequest } from "next/server";
import { getCurrentStaff } from "@/lib/auth";
import { buildReport } from "@/lib/reports";
import { fileResponse, reportToXlsx } from "@/lib/export";
import { getSettings } from "@/lib/queries";
import { hoyISO } from "@/lib/format";

export async function GET(req: NextRequest) {
  const me = await getCurrentStaff();
  if (!me) return new Response("No autorizado", { status: 401 });
  const report = await buildReport(Object.fromEntries(req.nextUrl.searchParams));
  const settings = await getSettings();
  return fileResponse(await reportToXlsx(report, settings?.company_name ?? "Altayó & Rodríguez", me.full_name), `informe-${hoyISO()}.xlsx`, "xlsx");
}
