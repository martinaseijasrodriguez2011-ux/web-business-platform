-- =============================================================================
-- AR INCIDENCIAS · Altayó & Rodríguez
-- Migración 1: esquema base (tablas, tipos, relaciones e índices)
-- =============================================================================
-- Principios:
--  * Cada entidad tiene su propia tabla con identificadores únicos (uuid).
--  * Los importes se guardan en numeric(12,2); el IVA se calcula en la base de
--    datos (columnas generadas) para evitar discrepancias entre pantallas.
--  * No se borran registros de negocio: se cancelan, rechazan o desactivan.
--  * Los estados se definen como tipos cerrados (enum) porque el flujo de
--    trabajo depende de ellos; sus etiquetas y colores son editables
--    (tabla status_labels).
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.staff_role as enum ('direccion', 'coordinacion', 'gestora');

create type public.incident_priority as enum ('baja', 'normal', 'alta', 'urgente');

create type public.incident_status as enum (
  'nueva',
  'pendiente_revision',
  'en_curso',
  'pendiente_proveedor',
  'presupuesto_solicitado',
  'presupuesto_recibido',
  'pendiente_aprobacion',
  'aprobada',
  'reparacion_programada',
  'reparacion_realizada',
  'factura_pendiente',
  'pendiente_pago',
  'resuelta',
  'cerrada',
  'cancelada'
);

create type public.budget_status as enum (
  'solicitado', 'recibido', 'pendiente_autorizacion', 'aprobado', 'rechazado', 'cancelado'
);

-- presidente: el presidente de la comunidad autoriza el gasto (dato externo).
-- aprobacion_interna: la gestora aprueba dentro de su límite económico.
-- autorizacion_superior: Dirección/Coordinación aprueba un importe que supera
--   el límite de la gestora responsable.
create type public.authorization_kind as enum ('presidente', 'aprobacion_interna', 'autorizacion_superior');

create type public.invoice_status as enum (
  'recibida', 'pendiente_revision', 'pendiente_pago', 'pagada', 'discrepancia'
);

create type public.claim_status as enum (
  'pendiente_comunicar', 'comunicado', 'pendiente_perito', 'visita_programada',
  'pendiente_valoracion', 'aceptado', 'rechazado', 'en_reparacion', 'finalizado', 'cerrado'
);

create type public.calendar_kind as enum (
  'reparacion', 'visita_proveedor', 'visita_perito', 'fecha_limite', 'seguimiento', 'recordatorio', 'otro'
);

create type public.checklist_kind as enum ('reparacion', 'siniestro', 'otro');

-- -----------------------------------------------------------------------------
-- Configuración general
-- -----------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true check (id),
  company_name text not null default 'Altayó & Rodríguez',
  app_name text not null default 'AR Incidencias',
  logo_path text,                       -- ruta en Storage (bucket privado "corporativo")
  primary_color text,                   -- pendiente de configurar con la identidad oficial
  locale text not null default 'es-ES',
  timezone text not null default 'Europe/Madrid',
  currency text not null default 'EUR',
  date_format text not null default 'dd/MM/yyyy',
  inactivity_days integer not null default 7 check (inactivity_days between 1 and 90),
  due_soon_days integer not null default 2 check (due_soon_days between 0 and 30),
  default_vat_rate numeric(5,2) not null default 21.00 check (default_vat_rate between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- -----------------------------------------------------------------------------
-- Equipo
-- El equipo existe con independencia de la cuenta de acceso: así se pueden
-- asignar comunidades antes de enviar las invitaciones. user_id se vincula
-- automáticamente cuando la persona acepta la invitación.
-- -----------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  short_name text not null check (length(trim(short_name)) > 0),
  position text not null,                    -- cargo
  role public.staff_role not null default 'gestora',
  email text unique,                         -- se informa al invitar; no se inventa
  user_id uuid unique references auth.users (id) on delete set null,
  active boolean not null default true,
  approval_limit numeric(12,2) check (approval_limit is null or approval_limit >= 0),
  avatar_path text,
  phone text,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.staff.approval_limit is
  'Límite económico individual (IVA incluido) para aprobar presupuestos. NULL = pendiente de configurar: no puede aprobar sin autorización superior.';

create table public.approval_limit_history (
  id bigint generated always as identity primary key,
  staff_id uuid not null references public.staff (id),
  old_limit numeric(12,2),
  new_limit numeric(12,2),
  changed_by uuid references public.staff (id),
  changed_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Catálogos editables
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('incidencia', 'proveedor')),
  name text not null,
  parent_id uuid references public.categories (id),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (scope, parent_id, name)
);

create table public.status_labels (
  entity text not null check (entity in ('incidencia', 'presupuesto', 'factura', 'siniestro')),
  key text not null,
  label text not null,
  tone text not null default 'gris' check (tone in ('gris', 'azul', 'naranja', 'rojo', 'verde', 'violeta')),
  sort_order integer not null default 0,
  active boolean not null default true,
  primary key (entity, key)
);

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind public.checklist_kind not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  due_offset_days integer check (due_offset_days is null or due_offset_days >= 0)
);

-- -----------------------------------------------------------------------------
-- Comunidades
-- -----------------------------------------------------------------------------
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (length(trim(name)) > 0),
  address text,
  postal_code text,
  city text,
  manager_id uuid references public.staff (id),   -- gestora responsable
  president_name text,
  president_contact text,
  notes text,
  active boolean not null default true,
  registered_on date,                              -- fecha de alta en el despacho
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index communities_manager_idx on public.communities (manager_id);
create index communities_name_trgm on public.communities using gin (name extensions.gin_trgm_ops);

create table public.community_contacts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id),
  name text not null,
  role text,          -- presidente, vicepresidente, conserje, vecino…
  unit text,          -- piso/puerta
  phone text,
  email text,
  notes text,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now()
);
create index community_contacts_community_idx on public.community_contacts (community_id);

-- -----------------------------------------------------------------------------
-- Proveedores
-- -----------------------------------------------------------------------------
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  trade_name text not null check (length(trim(trade_name)) > 0),
  company_name text,
  tax_id text,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index providers_name_trgm on public.providers using gin (trade_name extensions.gin_trgm_ops);

create table public.provider_specialties (
  provider_id uuid not null references public.providers (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  primary key (provider_id, category_id)
);

-- Proveedores habituales de una comunidad (mantenimiento, ascensor, limpieza…)
create table public.community_providers (
  community_id uuid not null references public.communities (id),
  provider_id uuid not null references public.providers (id),
  service text,
  created_at timestamptz not null default now(),
  primary key (community_id, provider_id)
);

-- -----------------------------------------------------------------------------
-- Contadores para códigos legibles (AR-2026-0001, P-2026-0001…)
-- -----------------------------------------------------------------------------
create table public.code_counters (
  prefix text not null,
  year integer not null,
  last_value integer not null default 0,
  primary key (prefix, year)
);

-- -----------------------------------------------------------------------------
-- Incidencias
-- -----------------------------------------------------------------------------
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  community_id uuid not null references public.communities (id),
  manager_id uuid references public.staff (id),
  created_by uuid references public.staff (id),
  reporter_name text,
  reporter_unit text,
  reporter_contact text,
  title text not null check (length(trim(title)) > 0),
  description text,
  category_id uuid references public.categories (id),
  subcategory_id uuid references public.categories (id),
  priority public.incident_priority not null default 'normal',
  status public.incident_status not null default 'nueva',
  provider_id uuid references public.providers (id),
  communicated_on date,           -- fecha de comunicación
  planned_on date,                -- fecha prevista de actuación
  due_on date,                    -- fecha límite
  notes text,
  closed_at timestamptz,
  closed_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index incidents_community_idx on public.incidents (community_id);
create index incidents_manager_idx on public.incidents (manager_id);
create index incidents_status_idx on public.incidents (status);
create index incidents_provider_idx on public.incidents (provider_id);
create index incidents_title_trgm on public.incidents using gin (title extensions.gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Siniestros
-- -----------------------------------------------------------------------------
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  community_id uuid not null references public.communities (id),
  incident_id uuid references public.incidents (id),
  manager_id uuid references public.staff (id),
  insurer text,
  policy_number text,
  claim_number text,              -- número de expediente de la aseguradora
  occurred_on date,
  communicated_on date,
  description text,
  adjuster_name text,             -- perito
  adjuster_phone text,
  visit_at timestamptz,
  status public.claim_status not null default 'pendiente_comunicar',
  notes text,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index claims_community_idx on public.claims (community_id);

-- -----------------------------------------------------------------------------
-- Tareas (checklists)
-- -----------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents (id),
  claim_id uuid references public.claims (id),
  title text not null check (length(trim(title)) > 0),
  sort_order integer not null default 0,
  assignee_id uuid references public.staff (id),
  due_on date,
  notes text,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references public.staff (id),
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(incident_id, claim_id) = 1)
);
create index tasks_incident_idx on public.tasks (incident_id);
create index tasks_claim_idx on public.tasks (claim_id);
create index tasks_assignee_idx on public.tasks (assignee_id) where not done;

-- -----------------------------------------------------------------------------
-- Presupuestos
-- -----------------------------------------------------------------------------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  community_id uuid not null references public.communities (id),
  incident_id uuid references public.incidents (id),
  provider_id uuid references public.providers (id),
  requested_on date,
  received_on date,
  concept text not null check (length(trim(concept)) > 0),
  description text,
  base_amount numeric(12,2) check (base_amount is null or base_amount >= 0),
  vat_rate numeric(5,2) not null default 21.00 check (vat_rate between 0 and 100),
  vat_amount numeric(12,2) generated always as (round(coalesce(base_amount, 0) * vat_rate / 100, 2)) stored,
  total_amount numeric(12,2) generated always as (coalesce(base_amount, 0) + round(coalesce(base_amount, 0) * vat_rate / 100, 2)) stored,
  execution_term text,
  conditions text,
  valid_until date,
  status public.budget_status not null default 'solicitado',
  selected boolean not null default false,
  requires_superior boolean not null default false,
  approved_by uuid references public.staff (id),
  approved_at timestamptz,
  approval_kind public.authorization_kind,
  rejected_reason text,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index budgets_incident_idx on public.budgets (incident_id);
create index budgets_community_idx on public.budgets (community_id);
create index budgets_provider_idx on public.budgets (provider_id);

create table public.budget_authorizations (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id),
  kind public.authorization_kind not null,
  authorized_by_name text,                    -- nombre del presidente u órgano
  staff_id uuid references public.staff (id), -- persona interna que aprueba
  authorized_on date not null default current_date,
  amount numeric(12,2) not null check (amount >= 0),
  medium text check (medium in ('email', 'telefono', 'whatsapp', 'presencial', 'escrito', 'acta_junta', 'sistema', 'otro')),
  document_id uuid,
  notes text,
  registered_by uuid references public.staff (id),
  created_at timestamptz not null default now()
);
create index budget_authorizations_budget_idx on public.budget_authorizations (budget_id);

-- -----------------------------------------------------------------------------
-- Facturas y pagos
-- -----------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null check (length(trim(invoice_number)) > 0),
  provider_id uuid not null references public.providers (id),
  community_id uuid not null references public.communities (id),
  incident_id uuid references public.incidents (id),
  budget_id uuid references public.budgets (id),
  invoice_date date not null,
  received_on date not null default current_date,
  base_amount numeric(12,2) not null check (base_amount >= 0),
  vat_rate numeric(5,2) not null default 21.00 check (vat_rate between 0 and 100),
  vat_amount numeric(12,2) generated always as (round(base_amount * vat_rate / 100, 2)) stored,
  total_amount numeric(12,2) generated always as (base_amount + round(base_amount * vat_rate / 100, 2)) stored,
  status public.invoice_status not null default 'recibida',
  notes text,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, invoice_number)
);
create index invoices_community_idx on public.invoices (community_id);
create index invoices_incident_idx on public.invoices (incident_id);
create index invoices_status_idx on public.invoices (status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id),
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null,
  confirmed_by uuid not null references public.staff (id),
  notes text,
  created_at timestamptz not null default now()
);
create index payments_invoice_idx on public.payments (invoice_id);

-- -----------------------------------------------------------------------------
-- Documentos (los archivos viven en Storage privado; aquí sus metadatos)
-- -----------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  doc_type text not null default 'otro'
    check (doc_type in ('acta', 'contrato', 'presupuesto', 'factura', 'informe', 'fotografia', 'video', 'word', 'excel', 'correo', 'otro')),
  description text,
  community_id uuid references public.communities (id),
  incident_id uuid references public.incidents (id),
  budget_id uuid references public.budgets (id),
  invoice_id uuid references public.invoices (id),
  claim_id uuid references public.claims (id),
  task_id uuid references public.tasks (id),
  provider_id uuid references public.providers (id),
  uploaded_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.staff (id)
);
create index documents_community_idx on public.documents (community_id);
create index documents_incident_idx on public.documents (incident_id);
create index documents_budget_idx on public.documents (budget_id);
create index documents_invoice_idx on public.documents (invoice_id);
create index documents_claim_idx on public.documents (claim_id);

alter table public.budget_authorizations
  add constraint budget_authorizations_document_fk foreign key (document_id) references public.documents (id);

-- -----------------------------------------------------------------------------
-- Actividad (cronología). Tabla de solo inserción: no se modifica ni se borra.
-- Las correcciones se registran como un nuevo movimiento que referencia al
-- anterior (corrects_id).
-- -----------------------------------------------------------------------------
create table public.activity (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    -- manuales
    'actuacion', 'llamada', 'correo', 'comentario', 'visita', 'conversacion', 'correccion',
    -- automáticos (generados por la base de datos)
    'incidencia_creada', 'cambio_estado', 'cambio_datos', 'tarea_completada', 'tarea_reabierta',
    'documento', 'presupuesto_creado', 'presupuesto_estado', 'autorizacion', 'factura_registrada',
    'factura_estado', 'pago_confirmado', 'siniestro_creado', 'siniestro_estado', 'comunidad_creada',
    'comunidad_actualizada', 'checklist_aplicado'
  )),
  occurred_at timestamptz not null default now(),   -- cuándo ocurrió (editable al registrar)
  actor_id uuid references public.staff (id),
  community_id uuid references public.communities (id),
  incident_id uuid references public.incidents (id),
  claim_id uuid references public.claims (id),
  budget_id uuid references public.budgets (id),
  invoice_id uuid references public.invoices (id),
  provider_id uuid references public.providers (id),
  document_id uuid references public.documents (id),
  task_id uuid references public.tasks (id),
  corrects_id uuid references public.activity (id),
  counterpart text,           -- con quién: proveedor, presidente, vecino…
  summary text not null,
  body text,
  changes jsonb,              -- {campo: {old, new}}
  created_at timestamptz not null default now()
);
create index activity_incident_idx on public.activity (incident_id, occurred_at desc);
create index activity_community_idx on public.activity (community_id, occurred_at desc);
create index activity_claim_idx on public.activity (claim_id, occurred_at desc);
create index activity_recent_idx on public.activity (created_at desc);

-- -----------------------------------------------------------------------------
-- Calendario (eventos manuales; el calendario muestra además fechas derivadas
-- de incidencias, tareas y siniestros)
-- -----------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind public.calendar_kind not null default 'otro',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  community_id uuid references public.communities (id),
  incident_id uuid references public.incidents (id),
  claim_id uuid references public.claims (id),
  staff_id uuid references public.staff (id),
  notes text,
  cancelled boolean not null default false,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index calendar_events_range_idx on public.calendar_events (starts_at);

-- -----------------------------------------------------------------------------
-- Notificaciones internas (sin envío de correo en esta fase)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.staff (id),
  kind text not null,
  title text not null,
  body text,
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, read_at, created_at desc);
create unique index notifications_dedupe_idx on public.notifications (recipient_id, dedupe_key) where dedupe_key is not null;

-- -----------------------------------------------------------------------------
-- Importaciones desde Excel
-- -----------------------------------------------------------------------------
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('comunidades', 'proveedores', 'incidencias')),
  file_name text not null,
  document_id uuid references public.documents (id),
  rows_total integer not null default 0,
  rows_imported integer not null default 0,
  rows_skipped integer not null default 0,
  report jsonb,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Auditoría técnica (todas las altas, cambios y bajas de las tablas principales)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_user_id uuid,
  actor_staff_id uuid,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  at timestamptz not null default now()
);
create index audit_log_table_row_idx on public.audit_log (table_name, row_id);
create index audit_log_at_idx on public.audit_log (at desc);
