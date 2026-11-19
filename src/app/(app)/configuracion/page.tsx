import Link from "next/link";
import { Plus, Send, Pencil } from "lucide-react";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionFormInline } from "./inline-form";
import { FormModal } from "@/components/ui/form-modal";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Table, Td, Th } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { requireSupervisor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { corporateUrl } from "@/lib/storage";
import { euros, fechaHora } from "@/lib/format";
import { ROLE } from "@/lib/labels";
import { saveApprovalSettings, addCategory, addStaff, addTemplate, inviteStaff, saveSettings, saveTemplateItems, setApprovalLimit, updateCategory, updateStaff, updateStatusLabel } from "./actions";
import { LogoUploader } from "./logo-uploader";

export const metadata = { title: "Configuración" };

const TABS = [
  { key: "usuarios", label: "Usuarios" }, { key: "limites", label: "Aprobación de presupuestos" }, { key: "categorias", label: "Categorías" },
  { key: "estados", label: "Estados" }, { key: "plantillas", label: "Plantillas" }, { key: "general", label: "Datos generales" },
  { key: "importaciones", label: "Importaciones" }, { key: "auditoria", label: "Auditoría" },
];
const TONES = ["gris", "azul", "naranja", "rojo", "verde", "violeta"] as const;
const ENTITY_LABEL: Record<string, string> = { incidencia: "Incidencias", presupuesto: "Presupuestos", factura: "Facturas", siniestro: "Siniestros" };

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await requireSupervisor();
  const { tab: t } = await searchParams;
  const tab = TABS.some((x) => x.key === t) ? t! : "usuarios";
  const supabase = await createClient();
  return (
    <div>
      <PageHeader title="Configuración" subtitle="Accesible solo para Dirección y Coordinación. Todos los cambios quedan registrados en la auditoría." />
      <div className="mb-6"><Tabs basePath="/configuracion" active={tab} tabs={TABS} /></div>
      {tab === "usuarios" && <Usuarios meId={me.id} />}
      {tab === "limites" && <Limites />}
      {tab === "categorias" && <Categorias />}
      {tab === "estados" && <Estados />}
      {tab === "plantillas" && <Plantillas />}
      {tab === "general" && <General />}
      {tab === "importaciones" && <Importaciones />}
      {tab === "auditoria" && <Auditoria />}
    </div>
  );

  async function Usuarios({ meId }: { meId: string }) {
    const { data: staff } = await supabase.from("staff").select("*").order("role").order("short_name");
    return (
      <Card>
        <CardHeader title="Usuarios" subtitle="Cada persona accede con su propio usuario. El alta se hace por invitación individual al correo corporativo (pendiente de facilitar)."
          actions={<FormModal trigger={<><Plus size={16} /> Añadir persona</>} triggerSize="sm" title="Añadir persona al equipo" action={addStaff} submitLabel="Añadir">
            <Field label="Nombre completo" htmlFor="full_name" required><Input id="full_name" name="full_name" required /></Field>
            <Field label="Nombre corto" htmlFor="short_name"><Input id="short_name" name="short_name" /></Field>
            <Field label="Cargo" htmlFor="position"><Input id="position" name="position" defaultValue="Gestión de comunidades" /></Field>
            <Field label="Rol" htmlFor="role"><Select id="role" name="role" defaultValue="gestora"><option value="gestora">Gestión</option><option value="coordinacion">Coordinación</option><option value="direccion">Dirección</option></Select></Field>
          </FormModal>} />
        <Table>
          <thead><tr><Th>Persona</Th><Th>Rol</Th><Th>Correo de acceso</Th><Th>Acceso</Th><Th></Th></tr></thead>
          <tbody>{(staff ?? []).map((s) => (
            <tr key={s.id}>
              <Td><span className="font-medium">{s.full_name}</span><span className="block text-xs text-ink-3">{s.position}</span></Td>
              <Td><div className="flex flex-wrap gap-1"><Badge tone={s.role === "gestora" ? "gris" : "violeta"} dot={false}>{ROLE[s.role]}</Badge>{s.can_edit_all && s.role === "gestora" && <Badge tone="azul" dot={false}>Edición global</Badge>}</div></Td>
              <Td className="text-ink-2">{s.email ?? <span className="text-ink-3">Pendiente de facilitar</span>}</Td>
              <Td>{!s.active ? <Badge tone="gris">Desactivado</Badge> : s.user_id ? <Badge tone="verde">Activo</Badge> : s.invited_at ? <Badge tone="naranja">Invitación enviada {fechaHora(s.invited_at)}</Badge> : <Badge tone="gris">Sin invitar</Badge>}</Td>
              <Td className="text-right">
                <div className="flex justify-end gap-2">
                  {s.active && !s.user_id && (
                    <FormModal trigger={<><Send size={14} /> {s.invited_at ? "Reenviar" : "Invitar"}</>} triggerSize="sm" title={`Invitar a ${s.full_name}`} description="Recibirá un correo con un enlace personal para establecer su contraseña." action={inviteStaff.bind(null, s.id)} submitLabel="Enviar invitación">
                      <Field label="Correo corporativo" htmlFor={`em-${s.id}`} required><Input id={`em-${s.id}`} name="email" type="email" required defaultValue={s.email ?? ""} /></Field>
                    </FormModal>
                  )}
                  <FormModal trigger={<><Pencil size={14} /> Editar</>} triggerSize="sm" triggerVariant="ghost" title={`Editar ${s.full_name}`} action={updateStaff.bind(null, s.id)} submitLabel="Guardar">
                    <Field label="Nombre completo" htmlFor={`fn-${s.id}`} required><Input id={`fn-${s.id}`} name="full_name" required defaultValue={s.full_name} /></Field>
                    <Field label="Nombre corto" htmlFor={`sn-${s.id}`} required><Input id={`sn-${s.id}`} name="short_name" required defaultValue={s.short_name} /></Field>
                    <Field label="Cargo" htmlFor={`po-${s.id}`} required><Input id={`po-${s.id}`} name="position" required defaultValue={s.position} /></Field>
                    <Field label="Rol" htmlFor={`ro-${s.id}`}><Select id={`ro-${s.id}`} name="role" defaultValue={s.role} disabled={s.id === meId}><option value="gestora">Gestión</option><option value="coordinacion">Coordinación</option><option value="direccion">Dirección</option></Select>{s.id === meId && <input type="hidden" name="role" value={s.role} />}</Field>
                    <Field label="Situación" htmlFor={`ac-${s.id}`}><Select id={`ac-${s.id}`} name="active" defaultValue={s.active ? "true" : "false"} disabled={s.id === meId}><option value="true">Activo</option><option value="false">Desactivado (sin acceso)</option></Select>{s.id === meId && <input type="hidden" name="active" value="true" />}</Field>
                    <label className="flex items-start gap-2 text-sm text-ink-2">
                      <input type="checkbox" name="can_edit_all" defaultChecked={s.can_edit_all} className="mt-1" />
                      <span>Edición global: puede modificar incidencias, presupuestos, facturas, siniestros y datos de todas las comunidades, y aprobar presupuestos dentro de su propio límite. No incluye confirmar pagos, conceder autorización superior, asignar gestoras ni la configuración.</span>
                    </label>
                  </FormModal>
                </div>
              </Td>
            </tr>))}
          </tbody>
        </Table>
        <CardBody><p className="text-xs text-ink-3">Desactivar a una persona bloquea su acceso de inmediato y conserva todo su historial. Las funciones de Dirección y Coordinación (confirmar pagos, autorización superior, configuración) dependen del rol.</p></CardBody>
      </Card>
    );
  }

  async function Limites() {
    const [{ data: st }, { data: staff }, { data: history }] = await Promise.all([
      supabase.from("app_settings").select("approval_limits_enabled, approval_alert_threshold").single(),
      supabase.from("staff").select("id, full_name, role, approval_limit, active").order("role").order("short_name"),
      supabase.from("approval_limit_history").select("*, staff:staff!approval_limit_history_staff_id_fkey(full_name), changer:staff!approval_limit_history_changed_by_fkey(full_name)").order("changed_at", { ascending: false }).limit(50),
    ]);
    const enabled = !!st?.approval_limits_enabled;
    return (
      <div className="space-y-6">
      <Card>
        <CardHeader title="Cómo se aprueban los presupuestos" subtitle="Quién aprueba queda siempre registrado, igual que la autorización del presidente. Los pagos solo los confirman Dirección y Coordinación." />
        <CardBody>
          <ActionFormInline action={saveApprovalSettings}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Modalidad" htmlFor="approval_limits_enabled">
                <Select id="approval_limits_enabled" name="approval_limits_enabled" defaultValue={enabled ? "true" : "false"}>
                  <option value="false">Sin límite: la gestora responsable aprueba cualquier importe</option>
                  <option value="true">Con límite individual: por encima, requiere autorización superior</option>
                </Select>
              </Field>
              <Field label="Avisar a Dirección y Coordinación a partir de (€, IVA incluido)" htmlFor="approval_alert_threshold" hint="Vacío = se avisa de todas las aprobaciones hechas por el equipo.">
                <Input id="approval_alert_threshold" name="approval_alert_threshold" inputMode="decimal" defaultValue={st?.approval_alert_threshold ?? ""} placeholder="Pendiente de configurar" />
              </Field>
            </div>
          </ActionFormInline>
        </CardBody>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className={enabled ? "" : "opacity-60"}>
          <CardHeader title="Límite individual de aprobación" subtitle={enabled ? "Importe total (IVA incluido) hasta el que cada gestora puede aprobar presupuestos. Si se supera o está pendiente de configurar, se requiere autorización superior." : "No se aplican: la modalidad actual es «sin límite». Se conservan por si se activan en el futuro."} />
          <Table>
            <thead><tr><Th>Persona</Th><Th className="text-right">Límite actual</Th><Th></Th></tr></thead>
            <tbody>{(staff ?? []).filter((s) => s.active).map((s) => (
              <tr key={s.id}>
                <Td>{s.full_name}<span className="block text-xs text-ink-3">{ROLE[s.role]}</span></Td>
                <Td className="tabular text-right">{s.role !== "gestora" ? <span className="text-ink-3">Autorización superior</span> : s.approval_limit != null ? euros(s.approval_limit) : <Badge tone="naranja">Pendiente de configurar</Badge>}</Td>
                <Td className="text-right">{s.role === "gestora" && (
                  <FormModal trigger="Modificar" triggerSize="sm" title={`Límite de ${s.full_name}`} description="Deje el campo vacío para marcarlo como pendiente de configurar." action={setApprovalLimit.bind(null, s.id)} submitLabel="Guardar">
                    <Field label="Límite (€, IVA incluido)" htmlFor={`l-${s.id}`}><Input id={`l-${s.id}`} name="approval_limit" inputMode="decimal" defaultValue={s.approval_limit ?? ""} /></Field>
                  </FormModal>
                )}</Td>
              </tr>))}
            </tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Historial de cambios de límites" />
          {!history?.length ? <CardBody><p className="text-sm text-ink-3">Sin cambios registrados.</p></CardBody> : (
            <Table><thead><tr><Th>Fecha</Th><Th>Persona</Th><Th className="text-right">Anterior</Th><Th className="text-right">Nuevo</Th><Th>Modificado por</Th></tr></thead>
              <tbody>{history.map((h) => <tr key={h.id}><Td className="text-xs">{fechaHora(h.changed_at)}</Td><Td>{h.staff?.full_name}</Td><Td className="tabular text-right">{h.old_limit != null ? euros(h.old_limit) : "Pendiente"}</Td><Td className="tabular text-right">{h.new_limit != null ? euros(h.new_limit) : "Pendiente"}</Td><Td className="text-ink-2">{h.changer?.full_name ?? "Sistema"}</Td></tr>)}</tbody>
            </Table>)}
        </Card>
      </div>
      </div>
    );
  }

  async function Categorias() {
    const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
    const block = (scope: "incidencia" | "proveedor", title: string) => {
      const parents = (data ?? []).filter((c) => c.scope === scope && !c.parent_id);
      return (
        <Card>
          <CardHeader title={title} actions={<FormModal trigger={<><Plus size={16} /> Añadir</>} triggerSize="sm" title={`Nueva ${scope === "incidencia" ? "categoría o subcategoría" : "especialidad"}`} action={addCategory} submitLabel="Añadir">
            <input type="hidden" name="scope" value={scope} />
            <Field label="Nombre" htmlFor="name" required><Input id="name" name="name" required /></Field>
            {scope === "incidencia" && <Field label="Subcategoría de" htmlFor="parent_id"><Select id="parent_id" name="parent_id"><option value="">— Es una categoría principal —</option>{parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>}
          </FormModal>} />
          <ul className="divide-y divide-line">
            {parents.map((p) => (
              <li key={p.id} className="px-5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={p.active ? "" : "text-ink-3 line-through"}>{p.name}</span>
                  <FormModal trigger="Editar" triggerSize="sm" triggerVariant="ghost" title="Editar" action={updateCategory.bind(null, p.id)} submitLabel="Guardar">
                    <Field label="Nombre" htmlFor={`c-${p.id}`}><Input id={`c-${p.id}`} name="name" defaultValue={p.name} required /></Field>
                    <Field label="Situación" htmlFor={`ca-${p.id}`}><Select id={`ca-${p.id}`} name="active" defaultValue={p.active ? "true" : "false"}><option value="true">Activa</option><option value="false">Desactivada (no aparece en formularios nuevos)</option></Select></Field>
                  </FormModal>
                </div>
                {(data ?? []).filter((c) => c.parent_id === p.id).map((c) => (
                  <div key={c.id} className="ml-4 flex items-center justify-between gap-2 text-sm text-ink-2">
                    <span className={c.active ? "" : "line-through"}>↳ {c.name}</span>
                    <FormModal trigger="Editar" triggerSize="sm" triggerVariant="ghost" title="Editar subcategoría" action={updateCategory.bind(null, c.id)} submitLabel="Guardar">
                      <Field label="Nombre" htmlFor={`c-${c.id}`}><Input id={`c-${c.id}`} name="name" defaultValue={c.name} required /></Field>
                      <Field label="Situación" htmlFor={`ca-${c.id}`}><Select id={`ca-${c.id}`} name="active" defaultValue={c.active ? "true" : "false"}><option value="true">Activa</option><option value="false">Desactivada</option></Select></Field>
                    </FormModal>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      );
    };
    return <div className="grid gap-6 lg:grid-cols-2">{block("incidencia", "Categorías de incidencias")}{block("proveedor", "Especialidades de proveedores")}</div>;
  }

  async function Estados() {
    const { data } = await supabase.from("status_labels").select("*").order("entity").order("sort_order");
    return (
      <div className="space-y-6">
        <p className="text-sm text-ink-3">Puede cambiar el nombre visible y el color de cada estado. El flujo de trabajo (qué significa cada estado) es fijo para garantizar la coherencia de los controles económicos.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(ENTITY_LABEL).map(([entity, title]) => (
            <Card key={entity}><CardHeader title={title} />
              <ul className="divide-y divide-line">{(data ?? []).filter((s) => s.entity === entity).map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2 px-5 py-2">
                  <Badge tone={s.tone as (typeof TONES)[number]}>{s.label}</Badge>
                  <FormModal trigger="Editar" triggerSize="sm" triggerVariant="ghost" title="Editar estado" action={updateStatusLabel.bind(null, entity, s.key)} submitLabel="Guardar">
                    <Field label="Etiqueta" htmlFor={`s-${entity}-${s.key}`}><Input id={`s-${entity}-${s.key}`} name="label" defaultValue={s.label} required /></Field>
                    <Field label="Color" htmlFor={`t-${entity}-${s.key}`}><Select id={`t-${entity}-${s.key}`} name="tone" defaultValue={s.tone}>{TONES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
                    <Field label="Disponible en formularios" htmlFor={`a-${entity}-${s.key}`}><Select id={`a-${entity}-${s.key}`} name="active" defaultValue={s.active ? "true" : "false"}><option value="true">Sí</option><option value="false">No</option></Select></Field>
                  </FormModal>
                </li>))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  async function Plantillas() {
    const { data } = await supabase.from("checklist_templates").select("*, checklist_template_items(title, sort_order)").order("name");
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <FormModal trigger={<><Plus size={16} /> Nueva plantilla</>} triggerVariant="primary" title="Nueva plantilla" action={addTemplate} submitLabel="Crear">
            <Field label="Nombre" htmlFor="name" required><Input id="name" name="name" required /></Field>
            <Field label="Tipo" htmlFor="kind"><Select id="kind" name="kind"><option value="reparacion">Reparación</option><option value="siniestro">Siniestro</option><option value="otro">Otro</option></Select></Field>
          </FormModal>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {(data ?? []).map((t) => (
            <Card key={t.id}>
              <CardHeader title={t.name} subtitle={`${t.checklist_template_items.length} tareas · ${t.kind}${t.active ? "" : " · desactivada"}`} />
              <CardBody>
                <ActionFormInline action={saveTemplateItems.bind(null, t.id)}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nombre" htmlFor={`n-${t.id}`}><Input id={`n-${t.id}`} name="name" defaultValue={t.name} /></Field>
                    <Field label="Situación" htmlFor={`a-${t.id}`}><Select id={`a-${t.id}`} name="active" defaultValue={t.active ? "true" : "false"}><option value="true">Activa</option><option value="false">Desactivada</option></Select></Field>
                  </div>
                  <Field label="Tareas (una por línea, en orden)" htmlFor={`i-${t.id}`} className="mt-3">
                    <Textarea id={`i-${t.id}`} name="items" rows={10} defaultValue={[...t.checklist_template_items].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.title).join("\n")} />
                  </Field>
                </ActionFormInline>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  async function General() {
    const { data: st } = await supabase.from("app_settings").select("*").single();
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Identidad corporativa" subtitle="Suba el logotipo oficial en su formato original. No se modifica." />
          <CardBody><LogoUploader current={corporateUrl(st?.logo_path)} /></CardBody></Card>
        <Card><CardHeader title="Parámetros generales" />
          <CardBody>
            <ActionFormInline action={saveSettings}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre de la empresa" htmlFor="company_name"><Input id="company_name" name="company_name" defaultValue={st?.company_name ?? ""} /></Field>
                <Field label="Color principal (#RRGGBB)" htmlFor="primary_color" hint="Vacío = gris corporativo del logotipo (#3f3f3f). Evite el rojo: se reserva para urgencias."><Input id="primary_color" name="primary_color" defaultValue={st?.primary_color ?? ""} placeholder="#3f3f3f" /></Field>
                <Field label="IVA por defecto (%)" htmlFor="default_vat_rate" hint="Se propone al crear presupuestos y facturas; siempre editable."><Input id="default_vat_rate" name="default_vat_rate" inputMode="decimal" defaultValue={Number(st?.default_vat_rate ?? 21)} /></Field>
                <Field label="Aviso por inactividad (días)" htmlFor="inactivity_days"><Input id="inactivity_days" name="inactivity_days" type="number" min={1} max={90} defaultValue={st?.inactivity_days ?? 7} /></Field>
                <Field label="Aviso de vencimiento (días antes)" htmlFor="due_soon_days"><Input id="due_soon_days" name="due_soon_days" type="number" min={0} max={30} defaultValue={st?.due_soon_days ?? 2} /></Field>
                <Field label="Configuración regional" htmlFor="locale"><Input id="locale" value="Español (España) · dd/mm/aaaa · Euro (€) · Europe/Madrid" disabled readOnly /></Field>
              </div>
            </ActionFormInline>
          </CardBody></Card>
      </div>
    );
  }

  async function Importaciones() {
    const { data } = await supabase.from("import_batches").select("*, creator:staff!import_batches_created_by_fkey(full_name)").order("created_at", { ascending: false }).limit(50);
    return (
      <Card><CardHeader title="Historial de importaciones" actions={<Link href="/comunidades/importar" className="text-sm text-brand hover:underline">Importar comunidades</Link>} />
        {!data?.length ? <CardBody><p className="text-sm text-ink-3">Sin importaciones.</p></CardBody> : (
          <Table><thead><tr><Th>Fecha</Th><Th>Tipo</Th><Th>Archivo</Th><Th className="text-right">Filas</Th><Th className="text-right">Importadas</Th><Th className="text-right">Omitidas</Th><Th>Por</Th></tr></thead>
            <tbody>{data.map((b) => <tr key={b.id}><Td className="text-xs">{fechaHora(b.created_at)}</Td><Td>{b.kind}</Td><Td className="text-ink-2">{b.file_name}</Td><Td className="tabular text-right">{b.rows_total}</Td><Td className="tabular text-right">{b.rows_imported}</Td><Td className="tabular text-right">{b.rows_skipped}</Td><Td className="text-ink-2">{b.creator?.full_name}</Td></tr>)}</tbody>
          </Table>)}
      </Card>
    );
  }

  async function Auditoria() {
    const [{ data }, { data: staff }] = await Promise.all([
      supabase.from("audit_log").select("*").order("at", { ascending: false }).limit(200),
      supabase.from("staff").select("id, full_name"),
    ]);
    const names = Object.fromEntries((staff ?? []).map((s) => [s.id, s.full_name]));
    return (
      <Card><CardHeader title="Registro de auditoría" subtitle="Últimos 200 cambios en la base de datos (altas, modificaciones y bajas), con valor anterior y nuevo." />
        <Table><thead><tr><Th>Fecha</Th><Th>Persona</Th><Th>Tabla</Th><Th>Acción</Th><Th>Campos modificados</Th></tr></thead>
          <tbody>{(data ?? []).map((a) => (
            <tr key={a.id}><Td className="whitespace-nowrap text-xs">{fechaHora(a.at)}</Td><Td>{a.actor_staff_id ? names[a.actor_staff_id] : "Sistema"}</Td><Td className="text-ink-2">{a.table_name}</Td>
              <Td><Badge tone={a.action === "DELETE" ? "rojo" : a.action === "INSERT" ? "verde" : "azul"} dot={false}>{a.action === "INSERT" ? "Alta" : a.action === "UPDATE" ? "Cambio" : "Baja"}</Badge></Td>
              <Td className="max-w-[420px] text-xs text-ink-2">{a.changed_fields?.join(", ") ?? "—"}</Td></tr>))}
          </tbody>
        </Table>
      </Card>
    );
  }
}
