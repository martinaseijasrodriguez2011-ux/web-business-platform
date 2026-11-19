// Pruebas de seguridad y flujo contra la base de datos real (Supabase local).
// Ejecutar: npm run test:db  (requiere `npx supabase start`)
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { admin, ensureUser, login, staffId } from "./helpers.mjs";

const T = Date.now().toString(36);
let silvia, begona, eva, pilar, outsider;
let communityId, incidentId;

before(async () => {
  await ensureUser("Silvia", "silvia@prueba.local");
  await ensureUser("Begoña", "begona@prueba.local");
  await ensureUser("Eva", "eva@prueba.local");
  await ensureUser("Pilar", "pilar@prueba.local");
  await ensureUser(null, "ajeno@prueba.local"); // cuenta sin ficha en el equipo
  silvia = await login("silvia@prueba.local");
  begona = await login("begona@prueba.local");
  eva = await login("eva@prueba.local");
  pilar = await login("pilar@prueba.local");
  outsider = await login("ajeno@prueba.local");
});

test("Prueba 4 · un usuario sin ficha activa no ve nada", async () => {
  const { data } = await outsider.from("communities").select("id");
  assert.equal(data.length, 0);
  const { error } = await outsider.from("incidents").insert({ community_id: crypto.randomUUID(), title: "x" });
  assert.ok(error, "debe rechazar la inserción");
});

test("Prueba 1 · Dirección crea comunidad; gestora no puede crearla", async () => {
  const evaId = await staffId("Eva");
  const { error: e1 } = await eva.from("communities").insert({ code: `X-${T}`, name: "No permitida" });
  assert.ok(e1, "una gestora no debe crear comunidades");

  const { data, error } = await silvia
    .from("communities")
    .insert({ code: `PRUEBA-${T}`, name: `Comunidad de prueba ${T}`, address: "Calle de prueba, 1", manager_id: evaId })
    .select()
    .single();
  assert.ifError(error);
  communityId = data.id;
});

test("Prueba 4 · todas las gestoras consultan todas las comunidades", async () => {
  const { data } = await pilar.from("communities").select("id").eq("id", communityId);
  assert.equal(data.length, 1);
});

test("Prueba 1 · registrar incidencia con código automático y gestora heredada", async () => {
  const { data, error } = await pilar
    .from("incidents")
    .insert({ community_id: communityId, title: "Fuga en portería", priority: "urgente", reporter_name: "Vecino 2ºA" })
    .select()
    .single();
  assert.ifError(error);
  incidentId = data.id;
  assert.match(data.code, /^AR-\d{4}-\d{4}$/);
  assert.equal(data.manager_id, await staffId("Eva"), "hereda la gestora responsable de la comunidad");
  const { data: act } = await admin.from("activity").select("kind").eq("incident_id", incidentId);
  assert.ok(act.some((a) => a.kind === "incidencia_creada"));
  const { data: notif } = await admin.from("notifications").select("kind, recipient_id").like("link", `%${incidentId}`);
  assert.ok(notif.some((n) => n.kind === "incidencia_urgente"), "aviso de urgencia a supervisión");
});

test("Prueba 4 · una gestora no responsable no puede modificar la incidencia", async () => {
  const { data } = await pilar.from("incidents").update({ status: "en_curso" }).eq("id", incidentId).select();
  assert.equal(data.length, 0, "RLS impide la modificación");
  const { data: ok, error } = await eva.from("incidents").update({ status: "en_curso" }).eq("id", incidentId).select();
  assert.ifError(error);
  assert.equal(ok.length, 1);
});

test("Prueba 5 · historial: cambio de estado y actuación quedan en la cronología e inalterables", async () => {
  const { error } = await pilar.from("activity").insert({
    kind: "llamada", incident_id: incidentId, summary: "Llamada al fontanero", counterpart: "Fontanero",
  });
  assert.ifError(error, "cualquier gestora puede registrar una actuación");
  const { data: act } = await eva.from("activity").select("id, kind, actor_id").eq("incident_id", incidentId);
  assert.ok(act.some((a) => a.kind === "cambio_estado"));
  const call = act.find((a) => a.kind === "llamada");
  assert.equal(call.actor_id, await staffId("Pilar"), "el autor lo fija el servidor");
  // no se puede borrar ni modificar
  const { data: del } = await silvia.from("activity").delete().eq("id", call.id).select();
  assert.equal(del.length, 0);
  const { data: upd } = await silvia.from("activity").update({ summary: "x" }).eq("id", call.id).select();
  assert.equal(upd.length, 0);
  // un usuario no puede falsificar eventos automáticos
  const { error: e2 } = await eva.from("activity").insert({ kind: "pago_confirmado", incident_id: incidentId, summary: "falso" });
  assert.ok(e2);
});

let budgetId;
test("Prueba 2 · presupuesto: IVA calculado en servidor", async () => {
  const { data: prov } = await eva.from("providers").insert({ trade_name: `Proveedor de prueba ${T}` }).select().single();
  const { data, error } = await eva
    .from("budgets")
    .insert({ incident_id: incidentId, provider_id: prov.id, concept: "Reparación fuga", base_amount: 1000, vat_rate: 10, status: "recibido" })
    .select()
    .single();
  assert.ifError(error);
  budgetId = data.id;
  assert.equal(Number(data.vat_amount), 100);
  assert.equal(Number(data.total_amount), 1100);
  assert.equal(data.community_id, communityId, "comunidad derivada de la incidencia");
});

test("Prueba 2 · no se puede aprobar por UPDATE directo", async () => {
  const { error } = await eva.from("budgets").update({ status: "aprobado" }).eq("id", budgetId);
  assert.ok(error);
  const { error: e2 } = await eva.from("budget_authorizations").insert({ budget_id: budgetId, kind: "aprobacion_interna", amount: 1 });
  assert.ok(e2);
});

test("Prueba 2 · límite pendiente de configurar o superado obliga a autorización superior", async () => {
  const evaId = await staffId("Eva");
  // Modalidad «con límites individuales» (la configurada por defecto es «sin límite»)
  await admin.from("app_settings").update({ approval_limits_enabled: true }).eq("id", true);
  await admin.from("staff").update({ approval_limit: null }).eq("id", evaId);
  let r = await eva.rpc("approve_budget", { p_budget: budgetId });
  assert.match(r.error?.message ?? "", /LIMITE_NO_CONFIGURADO/);

  // Silvia configura un límite de prueba inferior al importe
  const { error: el } = await silvia.from("staff").update({ approval_limit: 500 }).eq("id", evaId);
  assert.ifError(el);
  const { data: hist } = await silvia.from("approval_limit_history").select("*").eq("staff_id", evaId);
  assert.ok(hist.length >= 1, "el cambio de límite queda registrado");

  // una gestora no puede modificar límites
  const { data: u } = await eva.from("staff").update({ approval_limit: 99999 }).eq("id", evaId).select();
  assert.equal(u.length, 0);

  r = await eva.rpc("approve_budget", { p_budget: budgetId });
  assert.match(r.error?.message ?? "", /LIMITE_SUPERADO/);

  // otra gestora no responsable tampoco
  await admin.from("staff").update({ approval_limit: 5000 }).eq("short_name", "Pilar");
  r = await pilar.rpc("approve_budget", { p_budget: budgetId });
  assert.ok(r.error);

  r = await eva.rpc("request_superior_approval", { p_budget: budgetId, p_notes: "Supera mi límite" });
  assert.ifError(r.error);
});

test("Prueba 2 · autorización del presidente es distinta de la aprobación interna", async () => {
  const { error } = await eva.from("budget_authorizations").insert({
    budget_id: budgetId, kind: "presidente", authorized_by_name: "Presidente (prueba)", amount: 1100, medium: "email",
  });
  assert.ifError(error);
  const { data: b } = await eva.from("budgets").select("status").eq("id", budgetId).single();
  assert.notEqual(b.status, "aprobado", "la autorización del presidente no aprueba el presupuesto");
});

test("Prueba 2 · Begoña concede la autorización superior", async () => {
  const r = await begona.rpc("approve_budget", { p_budget: budgetId, p_notes: "Conforme" });
  assert.ifError(r.error);
  assert.equal(r.data.kind, "autorizacion_superior");
  const { data: b } = await eva.from("budgets_view").select("*").eq("id", budgetId).single();
  assert.equal(b.status, "aprobado");
  assert.equal(b.has_president_authorization, true);
  const { data: inc } = await eva.from("incidents").select("status").eq("id", incidentId).single();
  assert.equal(inc.status, "aprobada");
  // importe bloqueado tras aprobación
  const { error } = await eva.from("budgets").update({ base_amount: 1 }).eq("id", budgetId);
  assert.ok(error);
});

test("Prueba 2 · dentro del límite, la gestora aprueba", async () => {
  const { data } = await eva.from("budgets")
    .insert({ incident_id: incidentId, concept: "Material", base_amount: 100, vat_rate: 21, status: "recibido" })
    .select().single();
  const r = await eva.rpc("approve_budget", { p_budget: data.id });
  assert.ifError(r.error);
  assert.equal(r.data.kind, "aprobacion_interna");
});

test("Aprobación sin límite · la gestora aprueba cualquier importe y se avisa a supervisión según el umbral", async () => {
  await admin.from("app_settings").update({ approval_limits_enabled: false, approval_alert_threshold: 5000 }).eq("id", true);
  await admin.from("staff").update({ approval_limit: null }).eq("short_name", "Eva");
  const mk = async (base) => (await eva.from("budgets").insert({ incident_id: incidentId, concept: `Sin límite ${base}`, base_amount: base, vat_rate: 21, status: "recibido" }).select().single()).data;
  const small = await mk(1000);  // 1.210 € < umbral → sin aviso
  const big = await mk(10000);   // 12.100 € ≥ umbral → aviso
  for (const b of [small, big]) { const r = await eva.rpc("approve_budget", { p_budget: b.id }); assert.ifError(r.error); assert.equal(r.data.kind, "aprobacion_interna"); }
  const { data: n } = await admin.from("notifications").select("link, recipient_id").eq("kind", "presupuesto_aprobado_aviso");
  assert.ok(!n.some((x) => x.link.endsWith(small.id)), "por debajo del umbral no se avisa");
  assert.equal(n.filter((x) => x.link.endsWith(big.id)).length, 2, "aviso a Silvia y a Begoña");
  // Pilar (no responsable) sigue sin poder aprobar presupuestos de otra gestora
  const other = await mk(50);
  const r = await pilar.rpc("approve_budget", { p_budget: other.id });
  assert.ok(r.error);
  await admin.from("app_settings").update({ approval_alert_threshold: null }).eq("id", true);
});

let invoiceId;
test("Prueba 3 · factura pendiente; una gestora no puede marcarla como pagada", async () => {
  const { data: b } = await admin.from("budgets").select("provider_id").eq("id", budgetId).single();
  const { data, error } = await eva
    .from("invoices")
    .insert({ invoice_number: `F-${T}`, provider_id: b.provider_id, budget_id: budgetId, invoice_date: "2026-11-18", base_amount: 1000, vat_rate: 10 })
    .select()
    .single();
  assert.ifError(error);
  invoiceId = data.id;
  assert.equal(data.incident_id, incidentId);
  assert.notEqual(data.status, "pagada");

  const { error: e1 } = await eva.from("invoices").update({ status: "pagada" }).eq("id", invoiceId);
  assert.ok(e1, "UPDATE directo rechazado");
  const r = await eva.rpc("confirm_payment", { p_invoice: invoiceId, p_amount: 1100, p_paid_on: "2026-11-18" });
  assert.match(r.error?.message ?? "", /Solo Dirección/);
  const { error: e3 } = await eva.from("payments").insert({ invoice_id: invoiceId, amount: 1, paid_on: "2026-11-18", confirmed_by: await staffId("Eva") });
  assert.ok(e3);
  // duplicado de factura del mismo proveedor
  const { error: e4 } = await eva.from("invoices").insert({ invoice_number: `F-${T}`, provider_id: b.provider_id, community_id: communityId, invoice_date: "2026-11-18", base_amount: 1 });
  assert.ok(e4, "no se admiten facturas duplicadas");
});

test("Prueba 3 · Silvia confirma el pago (parcial y total)", async () => {
  let r = await silvia.rpc("confirm_payment", { p_invoice: invoiceId, p_amount: 2000, p_paid_on: "2026-11-18" });
  assert.ok(r.error, "no puede pagarse más del total");
  r = await silvia.rpc("confirm_payment", { p_invoice: invoiceId, p_amount: 600, p_paid_on: "2026-11-18" });
  assert.ifError(r.error);
  assert.equal(r.data.fully_paid, false);
  r = await begona.rpc("confirm_payment", { p_invoice: invoiceId, p_amount: 500, p_paid_on: "2026-11-18", p_notes: "Resto" });
  assert.ifError(r.error);
  assert.equal(r.data.fully_paid, true);
  const { data } = await eva.from("invoices_view").select("status, paid_amount").eq("id", invoiceId).single();
  assert.equal(data.status, "pagada");
  assert.equal(Number(data.paid_amount), 1100);
});

test("Checklist · aplicar plantilla, completar tareas y no cerrar la incidencia", async () => {
  const { data: tpl } = await eva.from("checklist_templates").select("id").eq("kind", "reparacion").single();
  const r = await eva.rpc("apply_checklist", { p_template: tpl.id, p_incident: incidentId });
  assert.ifError(r.error);
  assert.equal(r.data, 14);
  const { data: tasks } = await eva.from("tasks").select("id").eq("incident_id", incidentId);
  for (const t of tasks) await eva.from("tasks").update({ done: true }).eq("id", t.id);
  const { data: inc } = await eva.from("incidents_view").select("status, tasks_done, tasks_total").eq("id", incidentId).single();
  assert.equal(inc.tasks_done, inc.tasks_total);
  assert.notEqual(inc.status, "cerrada", "completar el checklist no cierra la incidencia");
  const { data: done } = await eva.from("tasks").select("done_by, done_at").eq("id", tasks[0].id).single();
  assert.equal(done.done_by, await staffId("Eva"));
  assert.ok(done.done_at);
});

test("Auditoría · solo Dirección/Coordinación la consultan; los cambios guardan valor anterior y nuevo", async () => {
  const { data: forEva } = await eva.from("audit_log").select("id").limit(1);
  assert.equal(forEva.length, 0);
  await eva.from("incidents").update({ title: "Fuga en portería (corregido)" }).eq("id", incidentId);
  const { data: act } = await eva.from("activity").select("changes").eq("incident_id", incidentId).eq("kind", "cambio_datos");
  const change = act.find((a) => a.changes?.title);
  assert.equal(change.changes.title.old, "Fuga en portería");
  assert.equal(change.changes.title.new, "Fuga en portería (corregido)");
  const { data: forSilvia } = await silvia.from("audit_log").select("id").eq("row_id", incidentId);
  assert.ok(forSilvia.length > 0);
});

test("Gestión de responsables · solo supervisión cambia la gestora de una comunidad", async () => {
  const pilarId = await staffId("Pilar");
  const { error } = await eva.from("communities").update({ manager_id: pilarId }).eq("id", communityId);
  assert.ok(error);
  const { error: e2 } = await begona.from("communities").update({ manager_id: pilarId }).eq("id", communityId);
  assert.ifError(e2);
});

test("Documentos · almacenamiento privado y sin borrado", async () => {
  const path = `incidencias/${incidentId}/${T}-foto.png`;
  const png = Buffer.from("89504e470d0a1a0a", "hex");
  const up = await eva.storage.from("documentos").upload(path, png, { contentType: "image/png" });
  assert.ifError(up.error);
  const { error } = await eva.from("documents").insert({ storage_path: path, file_name: "foto.png", mime_type: "image/png", incident_id: incidentId, doc_type: "fotografia" });
  assert.ifError(error);
  const pub = await fetch(`${process.env.SB_URL ?? "http://127.0.0.1:54321"}/storage/v1/object/public/documentos/${path}`);
  assert.notEqual(pub.status, 200, "no existe acceso público");
  const out = await outsider.storage.from("documentos").download(path);
  assert.ok(out.error, "un usuario ajeno no puede descargar");
  const signed = await pilar.storage.from("documentos").createSignedUrl(path, 60);
  assert.ifError(signed.error);
  const del = await eva.storage.from("documentos").remove([path]);
  assert.equal(del.data?.length ?? 0, 0, "no se pueden borrar documentos");
});

test("Panel · estadísticas y recordatorios", async () => {
  const { data, error } = await eva.rpc("dashboard_stats", {});
  assert.ifError(error);
  assert.ok(data.total >= 1);
  const r = await eva.rpc("generate_reminders");
  assert.ifError(r.error);
});

test("Edición global · Santi edita incidencias de otra gestora, pero no paga ni asigna gestoras", async () => {
  await ensureUser("Santi", "santi@prueba.local");
  const santi = await login("santi@prueba.local");
  const { data: inc } = await santi.from("incidents").update({ notes: "Gestionado por Santi" }).eq("id", incidentId).select("id");
  assert.equal(inc.length, 1, "puede editar incidencias de cualquier comunidad");
  const { error } = await santi.from("communities").update({ manager_id: await staffId("Santi") }).eq("id", communityId);
  assert.ok(error, "no puede asignar gestoras");
  const r = await santi.rpc("confirm_payment", { p_invoice: invoiceId, p_amount: 1, p_paid_on: "2026-11-18" });
  assert.ok(r.error, "no puede confirmar pagos");
  const { data: cfg } = await santi.from("app_settings").update({ inactivity_days: 3 }).eq("id", true).select();
  assert.equal(cfg.length, 0, "no puede tocar la configuración");
});

test("Subcomunidades · un solo nivel y vínculo con la comunidad general", async () => {
  const { data: parent } = await silvia.from("communities").insert({ code: `G-${T}`, name: `General ${T}` }).select().single();
  const { data: sub } = await silvia.from("communities").insert({ code: `G-${T}-A`, name: `Sub A ${T}`, parent_id: parent.id }).select().single();
  const { error } = await silvia.from("communities").insert({ code: `G-${T}-A1`, name: `Sub A1 ${T}`, parent_id: sub.id });
  assert.ok(error, "no se permiten subcomunidades de subcomunidades");
  const { data: v } = await eva.from("communities_view").select("subcommunities").eq("id", parent.id).single();
  assert.equal(v.subcommunities, 1);
});

test("Prueba 4 · no existe registro público de usuarios", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { URL_, ANON } = await import("./helpers.mjs");
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error } = await anon.auth.signUp({ email: `intruso-${T}@prueba.local`, password: "Intruso-12345!" });
  assert.ok(error, "el alta libre debe estar desactivada");
  const { data } = await anon.from("staff").select("id");
  assert.equal(data?.length ?? 0, 0, "un visitante anónimo no ve datos");
});
