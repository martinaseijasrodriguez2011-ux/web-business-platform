// Pruebas obligatorias (punto 30 del encargo) en navegador real contra la
// aplicación y Supabase LOCAL. Ejecutar: npm run test:e2e
// Requiere: `npx supabase start`, `npm run build && npm start` y los usuarios
// de prueba creados por `npm run test:db`.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const ExcelJS = require("exceljs");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASS = "Prueba-Local-2026!";
const T = Date.now().toString(36).slice(-5);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ar-e2e-"));
const results = [];

async function login(browser, user) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`  [${user}] error de página: ${e.message}`));
  await page.goto(`${BASE}/login`);
  await page.fill("#email", `${user}@prueba.local`);
  await page.fill("#password", PASS);
  await page.click("button[type=submit]");
  await page.waitForURL(`${BASE}/`, { timeout: 60000 });
  return page;
}
const dialog = (page) => page.locator("dialog[open]");
async function step(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push([name, "OK", Date.now() - t0]); console.log(`✔ ${name}`); }
  catch (e) { results.push([name, "FALLO", Date.now() - t0]); console.log(`✘ ${name}\n  ${e.message.split("\n").slice(0, 4).join("\n  ")}`); process.exitCode = 1; }
}

(async () => {
  const browser = await chromium.launch();
  // Archivos de prueba
  const png = path.join(tmp, "foto-fuga.png");
  fs.writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"));
  const pdf = path.join(tmp, "presupuesto.pdf");
  fs.writeFileSync(pdf, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");

  const silvia = await login(browser, "silvia");
  const eva = await login(browser, "eva");
  const pilar = await login(browser, "pilar");
  const begona = await login(browser, "begona");
  const community = `Comunidad E2E ${T}`;
  let incidentUrl, budgetUrl, invoiceUrl;

  await step("Prueba 1 · Dirección crea comunidad de prueba asignada a Eva", async () => {
    await silvia.goto(`${BASE}/comunidades/nueva`);
    await silvia.fill("#name", community);
    await silvia.fill("#code", `E2E-${T}`);
    await silvia.selectOption("#manager_id", { label: "Eva" });
    await silvia.fill("#address", "Calle de Prueba, 1");
    await silvia.getByRole("button", { name: "Dar de alta" }).click();
    await silvia.waitForURL(/\/comunidades\/[0-9a-f-]{36}$/);
    assert.ok(await silvia.getByText("Gestora: Eva").isVisible());
  });

  await step("Prueba 1 · Eva registra incidencia con fotografía; aparece en el panel", async () => {
    await eva.goto(`${BASE}/incidencias/nueva`);
    await eva.selectOption("#community_id", { label: `${community} · E2E-${T}` });
    await eva.fill("#title", "Fuga de agua en el patio de luces");
    await eva.fill("#description", "El vecino del 2º 1ª comunica filtraciones en el techo del baño.");
    await eva.fill("#reporter_name", "Vecino de prueba");
    await eva.fill("#reporter_unit", "2º 1ª");
    await eva.selectOption("#category_id", { label: "Fontanería" });
    await eva.selectOption("#priority", "urgente");
    await eva.setInputFiles("#files", png);
    await eva.getByRole("button", { name: "Registrar incidencia" }).click();
    await eva.waitForURL(/\/incidencias\/[0-9a-f-]{36}\?creada=1/, { timeout: 60000 });
    incidentUrl = eva.url().split("?")[0];
    assert.ok(await eva.getByText(/AR-\d{4}-\d{4}/).first().isVisible());
    assert.ok(await eva.getByText("foto-fuga.png").first().isVisible(), "la fotografía queda adjunta");
    await eva.goto(`${BASE}/?vista=mia`.replace("?vista=mia", "/"));
    assert.ok(await eva.getByText("Fuga de agua en el patio de luces").first().isVisible(), "aparece en «Necesita atención»");
  });

  await step("Prueba 5 · actuación, cambio de estado y documento en la cronología", async () => {
    await eva.goto(incidentUrl);
    await eva.getByRole("button", { name: "Añadir actuación" }).click();
    await dialog(eva).locator("#kind").selectOption("llamada");
    await dialog(eva).locator("#summary").fill("Se contacta con el fontanero");
    await dialog(eva).locator("#counterpart").fill("Fontanero");
    await dialog(eva).getByRole("button", { name: "Registrar" }).click();
    await eva.getByText("Se contacta con el fontanero").first().waitFor();
    await eva.getByRole("button", { name: "Cambiar estado" }).click();
    await dialog(eva).locator("#status").selectOption("en_curso");
    await dialog(eva).getByRole("button", { name: "Actualizar estado" }).click();
    await eva.getByText("Estado: Nueva → En curso").first().waitFor();
    await eva.getByRole("button", { name: "Aplicar plantilla" }).click();
    await dialog(eva).getByRole("button", { name: "Aplicar" }).click();
    await eva.getByText("Checklist aplicado: Reparación").first().waitFor();
    await eva.getByRole("button", { name: /Completar "Registrar aviso del vecino"/ }).click();
    await eva.getByText(/Completada por Eva/).first().waitFor();
    assert.ok(await eva.getByText("Documento añadido: foto-fuga.png").first().isVisible());
  });

  await step("Prueba 4 · otra gestora consulta pero no puede modificar", async () => {
    await pilar.goto(incidentUrl);
    assert.ok(await pilar.getByText("Fuga de agua en el patio de luces").first().isVisible());
    assert.equal(await pilar.getByRole("button", { name: "Cambiar estado" }).count(), 0);
    assert.equal(await pilar.getByRole("link", { name: "Editar" }).count(), 0);
    await pilar.goto(`${BASE}/comunidades`);
    assert.ok(await pilar.getByText(community).first().isVisible(), "todas las gestoras ven todas las comunidades");
    await pilar.goto(`${BASE}/configuracion`);
    assert.ok(pilar.url().includes("error=permisos"), "configuración restringida");
  });

  await step("Prueba 2 · presupuesto con PDF, IVA automático, autorización del presidente y límites", async () => {
    await eva.goto(`${BASE}/proveedores/nuevo`);
    await eva.fill("#trade_name", `Fontanería E2E ${T}`);
    await eva.getByText("Fontanería", { exact: true }).click();
    await eva.getByRole("button", { name: "Dar de alta" }).click();
    await eva.waitForURL(/\/proveedores\/[0-9a-f-]{36}$/);

    await eva.goto(`${incidentUrl}`);
    await eva.getByRole("link", { name: "Crear presupuesto" }).click();
    await eva.waitForURL(/presupuestos\/nuevo/);
    await eva.selectOption("#provider_id", { label: `Fontanería E2E ${T}` });
    await eva.selectOption("#status", "recibido");
    await eva.fill("#concept", "Reparación de bajante");
    await eva.fill("#base_amount", "1.000,00");
    await eva.fill("#vat_rate", "21");
    assert.ok(await eva.getByText("1.210,00 €").first().isVisible(), "total calculado en pantalla");
    await eva.getByRole("button", { name: "Registrar presupuesto" }).click();
    await eva.waitForURL(/\/presupuestos\/[0-9a-f-]{36}$/);
    budgetUrl = eva.url();
    assert.ok(await eva.getByText(/1\.?210,00\s€/).first().isVisible(), "total calculado en servidor");

    await eva.getByRole("button", { name: "Añadir documento" }).first().click();
    await dialog(eva).locator("input[type=file]").setInputFiles(pdf);
    await dialog(eva).getByRole("button", { name: /Subir/ }).click();
    await eva.getByText("presupuesto.pdf").first().waitFor();

    await eva.getByRole("button", { name: "Registrar autorización del presidente" }).click();
    await dialog(eva).locator("#authorized_by_name").fill("Presidente de prueba");
    await dialog(eva).locator("#document_id").selectOption({ label: "presupuesto.pdf" });
    await dialog(eva).getByRole("button", { name: "Registrar" }).click();
    await eva.getByText("Autorización del presidente", { exact: true }).first().waitFor();

    // Silvia fija a Eva un límite inferior al importe
    await silvia.goto(`${BASE}/configuracion?tab=limites`);
    const row = silvia.locator("tr", { hasText: "Eva" }).first();
    await row.getByRole("button", { name: "Modificar" }).click();
    await dialog(silvia).locator("input[name=approval_limit]").fill("500");
    await dialog(silvia).getByRole("button", { name: "Guardar" }).click();
    await silvia.getByText("500,00 €").first().waitFor();

    await eva.goto(budgetUrl);
    assert.equal(await eva.getByRole("button", { name: "Aprobar presupuesto" }).count(), 0, "no puede aprobar por encima de su límite");
    await eva.getByRole("button", { name: "Solicitar autorización superior" }).click();
    await dialog(eva).getByRole("button", { name: "Enviar solicitud" }).click();
    await eva.getByText("Pendiente de autorización por Dirección o Coordinación.").waitFor();

    await begona.goto(budgetUrl);
    await begona.getByRole("button", { name: "Conceder autorización superior" }).click();
    await dialog(begona).getByRole("button", { name: "Confirmar aprobación" }).click();
    await begona.getByText("Autorización superior (Dirección/Coordinación)").first().waitFor();
  });

  await step("Prueba 3 · factura pendiente; gestora no puede pagar; Silvia confirma el pago", async () => {
    await eva.goto(budgetUrl);
    await eva.getByRole("link", { name: "Registrar factura" }).first().click();
    await eva.waitForURL(/facturas\/nueva/);
    await eva.fill("#invoice_number", `F-${T}`);
    await eva.fill("#invoice_date", new Date().toISOString().slice(0, 10));
    await eva.getByRole("button", { name: "Registrar factura" }).click();
    await eva.waitForURL(/\/facturas\/[0-9a-f-]{36}$/);
    invoiceUrl = eva.url();
    assert.ok(await eva.getByText("Factura recibida").first().isVisible());
    assert.equal(await eva.getByRole("button", { name: "Confirmar pago" }).count(), 0);
    assert.ok(await eva.getByText(/Solo Silvia Rodríguez .* pueden confirmar pagos/).isVisible());

    await silvia.goto(invoiceUrl);
    await silvia.getByRole("button", { name: "Confirmar pago" }).click();
    await dialog(silvia).locator("input[name=confirm]").check();
    await dialog(silvia).getByRole("button", { name: "Confirmar pago" }).click();
    await silvia.getByText("Factura pagada.").waitFor();
    await silvia.goto(incidentUrl);
    assert.ok(await silvia.getByText(/Pago confirmado de 1\.?210,00\s€/).first().isVisible(), "el pago aparece en la cronología de la incidencia");
  });

  await step("Prueba 6 · informe en pantalla, PDF y Excel con datos correctos", async () => {
    await silvia.goto(`${BASE}/informes`);
    await silvia.selectOption("#tipo", "comunidad");
    await silvia.selectOption("#comunidad", { label: community });
    await silvia.getByRole("button", { name: "Generar informe" }).click();
    await silvia.getByText(`Informe de la comunidad ${community}`).waitFor();
    const [pdfDl] = await Promise.all([silvia.waitForEvent("download"), silvia.getByRole("link", { name: "PDF" }).click()]);
    const pdfPath = path.join(tmp, "informe.pdf"); await pdfDl.saveAs(pdfPath);
    assert.ok(fs.readFileSync(pdfPath).subarray(0, 4).toString() === "%PDF", "PDF válido");
    const [xDl] = await Promise.all([silvia.waitForEvent("download"), silvia.getByRole("link", { name: "Excel" }).click()]);
    const xPath = path.join(tmp, "informe.xlsx"); await xDl.saveAs(xPath);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(xPath);
    const facturas = wb.getWorksheet("Facturas");
    assert.ok(facturas, "hoja de facturas");
    assert.equal(facturas.getRow(2).getCell(1).value, `F-${T}`);
    assert.equal(Number(facturas.getRow(2).getCell(6).value), 1210);
    assert.equal(Number(facturas.getRow(2).getCell(7).value), 1210);
  });

  await step("Importación Excel · alta de comunidades con su gestora", async () => {
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Hoja1");
    ws.addRow(["Código", "Comunidad", "Gestora", "Dirección", "Población"]);
    ws.addRow([`IMP1-${T}`, `Importada Uno ${T}`, "Nuria", "Calle A, 1", "Barcelona"]);
    ws.addRow([`IMP2-${T}`, `Importada Dos ${T}`, "Gestora Inexistente", "Calle B, 2", "Barcelona"]);
    ws.addRow([`E2E-${T}`, community, "Pilar", "", ""]);
    const x = path.join(tmp, "comunidades.xlsx"); await wb.xlsx.writeFile(x);
    await silvia.goto(`${BASE}/comunidades/importar`);
    await silvia.setInputFiles("input[name=file]", x);
    await silvia.getByRole("button", { name: "Leer archivo" }).click();
    await silvia.getByText("3. Previsualización (3 filas)").waitFor();
    assert.ok(await silvia.getByText('Gestora "Gestora Inexistente" no reconocida').isVisible());
    await silvia.getByRole("button", { name: "Confirmar importación" }).click();
    await silvia.getByText("Resultado de la importación").waitFor();
    const cards = await silvia.locator(".tabular.text-2xl").allTextContents();
    assert.deepEqual(cards, ["1", "1", "1"], "1 creada, 1 actualizada (gestora), 1 con error");
  });

  await step("Prueba 4 · un usuario sin ficha activa no puede acceder", async () => {
    const ctx = await browser.newContext(); const p = await ctx.newPage();
    await p.goto(`${BASE}/login`); await p.fill("#email", "ajeno@prueba.local"); await p.fill("#password", PASS); await p.click("button[type=submit]");
    await p.getByText("Su usuario no está activo en AR Incidencias").waitFor();
    await p.goto(`${BASE}/incidencias`); assert.ok(p.url().includes("/login"));
    const r = await p.request.get(`${BASE}/api/exportar/incidencias`, { maxRedirects: 0 });
    assert.notEqual(r.status(), 200);
  });

  await step("Invitación · alta de usuario por correo y primer acceso", async () => {
    await silvia.goto(`${BASE}/configuracion`);
    await silvia.getByRole("button", { name: "Añadir persona" }).click();
    await dialog(silvia).locator("#full_name").fill(`Persona Prueba ${T}`);
    await dialog(silvia).getByRole("button", { name: "Añadir" }).click();
    await silvia.getByText(`Persona Prueba ${T}`).first().waitFor();
    const row = silvia.locator("tr", { hasText: `Persona Prueba ${T}` }).first();
    await row.getByRole("button", { name: /Invitar|Reenviar/ }).click();
    await dialog(silvia).locator("input[name=email]").fill(`invitada.${T}@prueba.local`);
    await dialog(silvia).getByRole("button", { name: "Enviar invitación" }).click();
    await silvia.getByText("Invitación enviada").first().waitFor({ timeout: 15000 }).catch(() => {});
    let link;
    for (let i = 0; i < 20 && !link; i++) {
      const list = await (await fetch(`http://127.0.0.1:54324/api/v1/search?query=to:invitada.${T}@prueba.local`)).json();
      if (list.messages?.length) {
        const msg = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${list.messages[0].ID}`)).json();
        link = /href="([^"]+auth\/confirmar[^"]+)"/.exec(msg.HTML)?.[1]?.replace(/&amp;/g, "&");
      }
      if (!link) await new Promise((r) => setTimeout(r, 500));
    }
    assert.ok(link, "correo de invitación recibido con enlace a /auth/confirmar");
    const ctx = await browser.newContext(); const p = await ctx.newPage();
    await p.goto(link);
    await p.waitForURL(/nueva-contrasena/);
    await p.fill("#password", "Laura-Nueva-2026"); await p.fill("#confirm", "Laura-Nueva-2026");
    await p.getByRole("button", { name: "Guardar y entrar" }).click();
    await p.waitForURL(`${BASE}/`);
    assert.ok(await p.getByText(/, Persona/).first().isVisible());
  });

  await step("Responsive · el panel se adapta a móvil sin desbordamiento horizontal", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login`); await p.fill("#email", "eva@prueba.local"); await p.fill("#password", PASS); await p.click("button[type=submit]");
    await p.waitForURL(`${BASE}/`);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, `desbordamiento horizontal de ${overflow}px`);
    await p.getByRole("button", { name: "Abrir menú" }).click();
    await p.getByRole("link", { name: "Comunidades" }).first().click();
    await p.waitForURL(/comunidades/);
  });

  await browser.close();
  console.log("\nResumen:");
  for (const [n, r, ms] of results) console.log(`  ${r === "OK" ? "OK   " : "FALLO"}  ${n}  (${(ms / 1000).toFixed(1)} s)`);
})();
