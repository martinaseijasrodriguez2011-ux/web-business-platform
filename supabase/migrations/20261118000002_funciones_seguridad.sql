-- =============================================================================
-- AR INCIDENCIAS · Migración 2: funciones de permisos, disparadores,
-- historial, flujo económico y políticas de seguridad (RLS)
-- =============================================================================
-- Regla general de seguridad:
--  * Ninguna regla depende solo de la interfaz. Todas se aplican aquí.
--  * Consultar: cualquier miembro activo del equipo puede consultar todo
--    (decisión 3.2), salvo auditoría técnica (solo Dirección/Coordinación) y
--    notificaciones (cada persona las suyas).
--  * Modificar: la gestora responsable o Dirección/Coordinación.
--  * Aprobar presupuestos y confirmar pagos: solo mediante funciones de flujo
--    (RPC) que comprueban límites y roles. Un UPDATE directo que intente
--    marcar un presupuesto como aprobado o una factura como pagada se rechaza.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function public.today_madrid() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Madrid')::date
$$;

create or replace function public.current_staff_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s where s.user_id = auth.uid() and s.active
$$;

create or replace function public.current_staff_role() returns public.staff_role
language sql stable security definer set search_path = '' as $$
  select s.role from public.staff s where s.user_id = auth.uid() and s.active
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.active)
$$;

-- Dirección (Silvia Rodríguez) y Coordinación (Begoña López)
create or replace function public.is_supervisor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.active and s.role in ('direccion', 'coordinacion')
  )
$$;

create or replace function public.can_edit_community(p_community uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_supervisor() or exists (
    select 1 from public.communities c
    where c.id = p_community and c.manager_id = public.current_staff_id()
  )
$$;

create or replace function public.can_edit_incident(p_incident uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_supervisor() or exists (
    select 1 from public.incidents i
    join public.communities c on c.id = i.community_id
    where i.id = p_incident
      and public.current_staff_id() in (i.manager_id, c.manager_id)
  )
$$;

create or replace function public.can_edit_claim(p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_supervisor() or exists (
    select 1 from public.claims cl
    join public.communities c on c.id = cl.community_id
    where cl.id = p_claim
      and public.current_staff_id() in (cl.manager_id, c.manager_id)
  )
$$;

create or replace function public.in_workflow() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('ar.workflow', true), '') = 'on'
$$;

-- Genera códigos correlativos sin duplicados: PREFIJO-AAAA-NNNN
create or replace function public.next_code(p_prefix text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_year integer := extract(year from public.today_madrid())::integer;
  v_value integer;
begin
  insert into public.code_counters (prefix, year, last_value)
  values (p_prefix, v_year, 1)
  on conflict (prefix, year) do update set last_value = public.code_counters.last_value + 1
  returning last_value into v_value;
  return p_prefix || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end $$;

create or replace function public.notify(
  p_recipient uuid, p_kind text, p_title text, p_body text, p_link text, p_dedupe text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_recipient is null then return; end if;
  insert into public.notifications (recipient_id, kind, title, body, link, dedupe_key)
  values (p_recipient, p_kind, p_title, p_body, p_link, p_dedupe)
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null do nothing;
end $$;

create or replace function public.notify_supervisors(
  p_kind text, p_title text, p_body text, p_link text, p_dedupe text default null, p_except uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select id from public.staff where active and role in ('direccion', 'coordinacion') loop
    if p_except is null or r.id <> p_except then
      perform public.notify(r.id, p_kind, p_title, p_body, p_link, p_dedupe);
    end if;
  end loop;
end $$;

-- Diferencias entre dos filas (para el historial de cambios)
create or replace function public.row_diff(p_old jsonb, p_new jsonb, p_ignore text[]) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(n.key, jsonb_build_object('old', p_old -> n.key, 'new', n.value)), '{}'::jsonb)
  from jsonb_each(p_new) n
  where not (n.key = any (p_ignore))
    and (p_old -> n.key) is distinct from n.value
$$;

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['staff', 'communities', 'providers', 'incidents', 'claims', 'tasks', 'budgets', 'invoices', 'calendar_events'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.tg_set_updated_at()', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Auditoría técnica genérica
-- -----------------------------------------------------------------------------
create or replace function public.tg_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_fields text[];
begin
  if tg_op = 'UPDATE' then
    select array_agg(key) into v_fields
    from jsonb_each(v_new) n
    where (v_old -> n.key) is distinct from n.value
      and n.key not in ('updated_at', 'last_activity_at');
    if v_fields is null then return null; end if;  -- solo cambian marcas de tiempo
  end if;
  insert into public.audit_log (table_name, row_id, action, actor_user_id, actor_staff_id, old_data, new_data, changed_fields)
  values (tg_table_name, coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key'), tg_op,
          auth.uid(), public.current_staff_id(), v_old, v_new, v_fields);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'app_settings', 'staff', 'categories', 'status_labels', 'checklist_templates', 'checklist_template_items',
    'communities', 'community_contacts', 'providers', 'provider_specialties', 'community_providers',
    'incidents', 'claims', 'tasks', 'budgets', 'budget_authorizations', 'invoices', 'payments',
    'documents', 'calendar_events', 'import_batches'
  ] loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.tg_audit()', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Vinculación automática de la cuenta de acceso con la ficha del equipo
-- -----------------------------------------------------------------------------
create or replace function public.tg_link_staff_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.staff
     set user_id = new.id
   where user_id is null and email is not null and lower(email) = lower(new.email);
  return new;
end $$;

create trigger link_staff_user after insert on auth.users
for each row execute function public.tg_link_staff_user();

-- -----------------------------------------------------------------------------
-- Equipo: protección de campos sensibles e historial de límites
-- -----------------------------------------------------------------------------
create or replace function public.tg_staff_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;  -- operaciones de servicio / migraciones
  -- cada persona puede actualizar su teléfono y su fotografía (vía update_my_profile)
  if old.user_id = auth.uid()
     and (to_jsonb(new) - array['phone', 'avatar_path', 'updated_at']) = (to_jsonb(old) - array['phone', 'avatar_path', 'updated_at']) then
    return new;
  end if;
  if not public.is_supervisor() then
    raise exception 'Solo Dirección o Coordinación pueden modificar fichas del equipo.' using errcode = '42501';
  end if;
  if old.user_id = auth.uid() and (new.active is distinct from old.active and not new.active) then
    raise exception 'No puede desactivar su propio usuario.' using errcode = '42501';
  end if;
  if old.user_id = auth.uid() and new.role is distinct from old.role then
    raise exception 'No puede modificar su propio rol.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger staff_guard before update on public.staff
for each row execute function public.tg_staff_guard();

create or replace function public.tg_staff_limit_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.approval_limit is distinct from old.approval_limit then
    insert into public.approval_limit_history (staff_id, old_limit, new_limit, changed_by)
    values (new.id, old.approval_limit, new.approval_limit, public.current_staff_id());
  end if;
  return null;
end $$;

create trigger staff_limit_history after update on public.staff
for each row execute function public.tg_staff_limit_history();

-- -----------------------------------------------------------------------------
-- Actividad: actualiza la "última actividad" de incidencia y comunidad
-- -----------------------------------------------------------------------------
create or replace function public.tg_activity_touch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.incident_id is not null then
    update public.incidents set last_activity_at = greatest(last_activity_at, new.created_at)
     where id = new.incident_id;
  end if;
  if new.community_id is not null then
    update public.communities set last_activity_at = greatest(last_activity_at, new.created_at)
     where id = new.community_id;
  end if;
  return null;
end $$;

create trigger activity_touch after insert on public.activity
for each row execute function public.tg_activity_touch();

create or replace function public.log_activity(
  p_kind text, p_summary text, p_community uuid, p_incident uuid default null, p_changes jsonb default null,
  p_budget uuid default null, p_invoice uuid default null, p_claim uuid default null,
  p_document uuid default null, p_task uuid default null, p_provider uuid default null, p_body text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity (kind, summary, body, actor_id, community_id, incident_id, changes,
                               budget_id, invoice_id, claim_id, document_id, task_id, provider_id)
  values (p_kind, p_summary, p_body, public.current_staff_id(), p_community, p_incident, p_changes,
          p_budget, p_invoice, p_claim, p_document, p_task, p_provider);
end $$;

-- Etiqueta legible de un estado
create or replace function public.status_label(p_entity text, p_key text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select label from public.status_labels where entity = p_entity and key = p_key), p_key)
$$;

-- -----------------------------------------------------------------------------
-- Comunidades
-- -----------------------------------------------------------------------------
create or replace function public.tg_communities_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, public.current_staff_id());
    new.registered_on := coalesce(new.registered_on, public.today_madrid());
  elsif new.manager_id is distinct from old.manager_id and auth.uid() is not null and not public.is_supervisor() then
    raise exception 'Solo Dirección o Coordinación pueden cambiar la gestora responsable de una comunidad.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger communities_before before insert or update on public.communities
for each row execute function public.tg_communities_before();

create or replace function public.tg_communities_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_diff jsonb;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('comunidad_creada', 'Comunidad dada de alta: ' || new.name, new.id);
  else
    v_diff := public.row_diff(to_jsonb(old), to_jsonb(new), array['updated_at', 'last_activity_at']);
    if v_diff <> '{}'::jsonb then
      perform public.log_activity('comunidad_actualizada', 'Datos de la comunidad modificados', new.id, null, v_diff);
      if new.manager_id is distinct from old.manager_id then
        perform public.notify(new.manager_id, 'comunidad_asignada', 'Se le ha asignado una comunidad',
                              new.name, '/comunidades/' || new.id);
      end if;
    end if;
  end if;
  return null;
end $$;

create trigger communities_after after insert or update on public.communities
for each row execute function public.tg_communities_after();

-- -----------------------------------------------------------------------------
-- Incidencias
-- -----------------------------------------------------------------------------
create or replace function public.tg_incidents_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.code := public.next_code('AR');
    new.created_by := coalesce(public.current_staff_id(), new.created_by);
    if new.manager_id is null then
      select manager_id into new.manager_id from public.communities where id = new.community_id;
    end if;
    new.communicated_on := coalesce(new.communicated_on, public.today_madrid());
  else
    if new.code is distinct from old.code then
      raise exception 'El código de la incidencia no se puede modificar.';
    end if;
    if new.status = 'cerrada' and old.status <> 'cerrada' then
      new.closed_at := now();
      new.closed_by := public.current_staff_id();
    elsif new.status <> 'cerrada' and old.status = 'cerrada' then
      new.closed_at := null;
      new.closed_by := null;
    end if;
  end if;
  return new;
end $$;

create trigger incidents_before before insert or update on public.incidents
for each row execute function public.tg_incidents_before();

create or replace function public.tg_incidents_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_diff jsonb;
  v_link text := '/incidencias/' || new.id;
  v_actor uuid := public.current_staff_id();
  v_community text;
begin
  select name into v_community from public.communities where id = new.community_id;
  if tg_op = 'INSERT' then
    perform public.log_activity('incidencia_creada', 'Incidencia creada: ' || new.title, new.community_id, new.id);
    if new.manager_id is distinct from v_actor then
      perform public.notify(new.manager_id, 'incidencia_asignada', 'Nueva incidencia asignada: ' || new.code,
                            new.title || ' · ' || v_community, v_link);
    end if;
    if new.priority = 'urgente' then
      perform public.notify_supervisors('incidencia_urgente', 'Incidencia urgente: ' || new.code,
                                        new.title || ' · ' || v_community, v_link, 'urgente:' || new.id, v_actor);
      perform public.notify(new.manager_id, 'incidencia_urgente', 'Incidencia urgente: ' || new.code,
                            new.title || ' · ' || v_community, v_link, 'urgente:' || new.id);
    end if;
    return null;
  end if;

  v_diff := public.row_diff(to_jsonb(old), to_jsonb(new),
                            array['updated_at', 'last_activity_at', 'closed_at', 'closed_by']);
  if v_diff = '{}'::jsonb then return null; end if;

  if v_diff ? 'status' then
    perform public.log_activity('cambio_estado',
      'Estado: ' || public.status_label('incidencia', old.status::text) || ' → ' || public.status_label('incidencia', new.status::text),
      new.community_id, new.id, jsonb_build_object('status', v_diff -> 'status'));
    if new.status = 'reparacion_programada' then
      perform public.notify(new.manager_id, 'reparacion_programada', 'Reparación programada: ' || new.code,
                            new.title, v_link, 'programada:' || new.id || ':' || coalesce(new.planned_on::text, ''));
    end if;
    v_diff := v_diff - 'status';
  end if;

  if v_diff <> '{}'::jsonb then
    perform public.log_activity('cambio_datos', 'Datos de la incidencia modificados', new.community_id, new.id, v_diff);
  end if;

  if new.manager_id is distinct from old.manager_id and new.manager_id is distinct from v_actor then
    perform public.notify(new.manager_id, 'incidencia_asignada', 'Incidencia asignada: ' || new.code,
                          new.title || ' · ' || v_community, v_link);
  end if;
  if new.priority = 'urgente' and old.priority <> 'urgente' then
    perform public.notify_supervisors('incidencia_urgente', 'Incidencia urgente: ' || new.code,
                                      new.title || ' · ' || v_community, v_link, 'urgente:' || new.id, v_actor);
  end if;
  return null;
end $$;

create trigger incidents_after after insert or update on public.incidents
for each row execute function public.tg_incidents_after();

-- -----------------------------------------------------------------------------
-- Siniestros
-- -----------------------------------------------------------------------------
create or replace function public.tg_claims_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.code := public.next_code('S');
    new.created_by := coalesce(public.current_staff_id(), new.created_by);
    if new.manager_id is null then
      select manager_id into new.manager_id from public.communities where id = new.community_id;
    end if;
  elsif new.code is distinct from old.code then
    raise exception 'El código del siniestro no se puede modificar.';
  end if;
  return new;
end $$;

create trigger claims_before before insert or update on public.claims
for each row execute function public.tg_claims_before();

create or replace function public.tg_claims_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_diff jsonb;
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('siniestro_creado', 'Siniestro registrado: ' || new.code, new.community_id,
                                new.incident_id, null, null, null, new.id);
    return null;
  end if;
  v_diff := public.row_diff(to_jsonb(old), to_jsonb(new), array['updated_at']);
  if v_diff ? 'status' then
    perform public.log_activity('siniestro_estado',
      'Siniestro ' || new.code || ': ' || public.status_label('siniestro', old.status::text) || ' → ' || public.status_label('siniestro', new.status::text),
      new.community_id, new.incident_id, jsonb_build_object('status', v_diff -> 'status'), null, null, new.id);
    v_diff := v_diff - 'status';
  end if;
  if v_diff <> '{}'::jsonb then
    perform public.log_activity('cambio_datos', 'Datos del siniestro ' || new.code || ' modificados',
                                new.community_id, new.incident_id, v_diff, null, null, new.id);
  end if;
  return null;
end $$;

create trigger claims_after after insert or update on public.claims
for each row execute function public.tg_claims_after();

-- -----------------------------------------------------------------------------
-- Tareas
-- -----------------------------------------------------------------------------
create or replace function public.tg_tasks_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(public.current_staff_id(), new.created_by);
  end if;
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.done_at := now();
    new.done_by := public.current_staff_id();
  elsif not new.done then
    new.done_at := null;
    new.done_by := null;
  end if;
  return new;
end $$;

create trigger tasks_before before insert or update on public.tasks
for each row execute function public.tg_tasks_before();

create or replace function public.tg_tasks_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_community uuid;
begin
  if new.done is not distinct from old.done then return null; end if;
  if new.incident_id is not null then
    select community_id into v_community from public.incidents where id = new.incident_id;
  else
    select community_id into v_community from public.claims where id = new.claim_id;
  end if;
  perform public.log_activity(case when new.done then 'tarea_completada' else 'tarea_reabierta' end,
    case when new.done then 'Tarea completada: ' else 'Tarea reabierta: ' end || new.title,
    v_community, new.incident_id, null, null, null, new.claim_id, null, new.id);
  return null;
end $$;

create trigger tasks_after after update on public.tasks
for each row execute function public.tg_tasks_after();

-- -----------------------------------------------------------------------------
-- Presupuestos
-- -----------------------------------------------------------------------------
create or replace function public.tg_budgets_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.code := public.next_code('P');
    new.created_by := coalesce(public.current_staff_id(), new.created_by);
    if new.incident_id is not null then
      select community_id into new.community_id from public.incidents where id = new.incident_id;
    end if;
    if not public.in_workflow() and (new.status = 'aprobado' or new.approved_by is not null
        or new.approval_kind is not null or new.selected or new.requires_superior) then
      raise exception 'Un presupuesto solo puede aprobarse mediante el proceso de aprobación.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.code is distinct from old.code then
    raise exception 'El código del presupuesto no se puede modificar.';
  end if;
  if not public.in_workflow() then
    if new.status is distinct from old.status and (new.status = 'aprobado' or old.status = 'aprobado') then
      raise exception 'La aprobación de un presupuesto solo puede registrarse o anularse mediante el proceso de aprobación.' using errcode = '42501';
    end if;
    if new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at
       or new.approval_kind is distinct from old.approval_kind or new.selected is distinct from old.selected
       or new.requires_superior is distinct from old.requires_superior then
      raise exception 'Los datos de aprobación no se pueden modificar directamente.' using errcode = '42501';
    end if;
    if old.status = 'aprobado' and (new.base_amount is distinct from old.base_amount or new.vat_rate is distinct from old.vat_rate) then
      raise exception 'No se puede modificar el importe de un presupuesto aprobado.' using errcode = '42501';
    end if;
    if new.status = 'pendiente_autorizacion' and old.status <> 'pendiente_autorizacion' and old.requires_superior is false then
      -- permitido: pendiente de autorización del presidente; la autorización superior va por RPC
      null;
    end if;
    if new.incident_id is distinct from old.incident_id and new.incident_id is not null then
      select community_id into new.community_id from public.incidents where id = new.incident_id;
    end if;
  end if;
  return new;
end $$;

create trigger budgets_before before insert or update on public.budgets
for each row execute function public.tg_budgets_before();

create or replace function public.tg_budgets_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_diff jsonb;
  v_manager uuid;
  v_link text := '/presupuestos/' || new.id;
begin
  select coalesce(i.manager_id, c.manager_id) into v_manager
    from public.communities c left join public.incidents i on i.id = new.incident_id
   where c.id = new.community_id;

  if tg_op = 'INSERT' then
    perform public.log_activity('presupuesto_creado', 'Presupuesto ' || new.code || ' registrado: ' || new.concept,
      new.community_id, new.incident_id, null, new.id, null, null, null, null, new.provider_id);
    if new.status = 'recibido' then
      perform public.notify(v_manager, 'presupuesto_recibido', 'Presupuesto recibido: ' || new.code, new.concept, v_link,
                            'recibido:' || new.id);
    end if;
    return null;
  end if;

  v_diff := public.row_diff(to_jsonb(old), to_jsonb(new), array['updated_at']);
  if v_diff ? 'status' then
    perform public.log_activity('presupuesto_estado',
      'Presupuesto ' || new.code || ': ' || public.status_label('presupuesto', old.status::text) || ' → ' || public.status_label('presupuesto', new.status::text),
      new.community_id, new.incident_id, jsonb_build_object('status', v_diff -> 'status'), new.id, null, null, null, null, new.provider_id);
    if new.status = 'recibido' then
      perform public.notify(v_manager, 'presupuesto_recibido', 'Presupuesto recibido: ' || new.code, new.concept, v_link,
                            'recibido:' || new.id);
    end if;
    v_diff := v_diff - 'status';
  end if;
  v_diff := v_diff - array['approved_by', 'approved_at', 'approval_kind', 'selected', 'requires_superior', 'vat_amount', 'total_amount'];
  if v_diff <> '{}'::jsonb then
    perform public.log_activity('cambio_datos', 'Datos del presupuesto ' || new.code || ' modificados',
      new.community_id, new.incident_id, v_diff, new.id);
  end if;
  return null;
end $$;

create trigger budgets_after after insert or update on public.budgets
for each row execute function public.tg_budgets_after();

create or replace function public.tg_budget_authorizations_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.registered_by := coalesce(public.current_staff_id(), new.registered_by);
  if new.kind <> 'presidente' and not public.in_workflow() then
    raise exception 'Las aprobaciones internas se registran mediante el proceso de aprobación.' using errcode = '42501';
  end if;
  if new.kind = 'presidente' and coalesce(trim(new.authorized_by_name), '') = '' then
    raise exception 'Indique quién autoriza (nombre del presidente).';
  end if;
  return new;
end $$;

create trigger budget_authorizations_before before insert on public.budget_authorizations
for each row execute function public.tg_budget_authorizations_before();

create or replace function public.tg_budget_authorizations_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare b record;
begin
  select * into b from public.budgets where id = new.budget_id;
  perform public.log_activity('autorizacion',
    case new.kind
      when 'presidente' then 'Autorización del presidente registrada (' || new.authorized_by_name || ') para ' || b.code
      when 'aprobacion_interna' then 'Presupuesto ' || b.code || ' aprobado internamente'
      else 'Presupuesto ' || b.code || ' aprobado con autorización superior' end,
    b.community_id, b.incident_id, jsonb_build_object('importe', new.amount, 'medio', new.medium),
    b.id, null, null, new.document_id, null, b.provider_id, new.notes);
  return null;
end $$;

create trigger budget_authorizations_after after insert on public.budget_authorizations
for each row execute function public.tg_budget_authorizations_after();

-- -----------------------------------------------------------------------------
-- Facturas
-- -----------------------------------------------------------------------------
create or replace function public.tg_invoices_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(public.current_staff_id(), new.created_by);
    if new.budget_id is not null then
      select coalesce(new.incident_id, incident_id), community_id, coalesce(new.provider_id, provider_id)
        into new.incident_id, new.community_id, new.provider_id
        from public.budgets where id = new.budget_id;
    elsif new.incident_id is not null then
      select community_id into new.community_id from public.incidents where id = new.incident_id;
    end if;
    if new.status = 'pagada' and not public.in_workflow() then
      raise exception 'Una factura no puede registrarse como pagada. El pago lo confirma Dirección o Coordinación.' using errcode = '42501';
    end if;
    return new;
  end if;

  if not public.in_workflow() then
    if new.status is distinct from old.status and (new.status = 'pagada' or old.status = 'pagada') then
      raise exception 'Solo Dirección o Coordinación pueden confirmar pagos, y únicamente mediante el registro de pago.' using errcode = '42501';
    end if;
    if old.status = 'pagada' and (new.base_amount is distinct from old.base_amount or new.vat_rate is distinct from old.vat_rate) then
      raise exception 'No se puede modificar el importe de una factura pagada.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger invoices_before before insert or update on public.invoices
for each row execute function public.tg_invoices_before();

create or replace function public.tg_invoices_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_diff jsonb;
  v_link text := '/facturas/' || new.id;
  v_provider text;
begin
  select trade_name into v_provider from public.providers where id = new.provider_id;
  if tg_op = 'INSERT' then
    perform public.log_activity('factura_registrada',
      'Factura ' || new.invoice_number || ' de ' || v_provider || ' registrada (' || to_char(new.total_amount, 'FM999G999G990D00') || ' €)',
      new.community_id, new.incident_id, null, new.budget_id, new.id, null, null, null, new.provider_id);
    perform public.notify_supervisors('factura_recibida', 'Factura recibida: ' || new.invoice_number,
      v_provider || ' · ' || to_char(new.total_amount, 'FM999G999G990D00') || ' €', v_link, 'factura:' || new.id,
      public.current_staff_id());
    return null;
  end if;
  v_diff := public.row_diff(to_jsonb(old), to_jsonb(new), array['updated_at']);
  if v_diff ? 'status' then
    perform public.log_activity('factura_estado',
      'Factura ' || new.invoice_number || ': ' || public.status_label('factura', old.status::text) || ' → ' || public.status_label('factura', new.status::text),
      new.community_id, new.incident_id, jsonb_build_object('status', v_diff -> 'status'), new.budget_id, new.id);
    if new.status = 'pendiente_pago' then
      perform public.notify_supervisors('factura_pendiente_pago', 'Factura pendiente de pago: ' || new.invoice_number,
        v_provider || ' · ' || to_char(new.total_amount, 'FM999G999G990D00') || ' €', v_link, 'pendiente_pago:' || new.id);
    end if;
    v_diff := v_diff - 'status';
  end if;
  v_diff := v_diff - array['vat_amount', 'total_amount'];
  if v_diff <> '{}'::jsonb then
    perform public.log_activity('cambio_datos', 'Datos de la factura ' || new.invoice_number || ' modificados',
      new.community_id, new.incident_id, v_diff, new.budget_id, new.id);
  end if;
  return null;
end $$;

create trigger invoices_after after insert or update on public.invoices
for each row execute function public.tg_invoices_after();

-- -----------------------------------------------------------------------------
-- Documentos
-- -----------------------------------------------------------------------------
create or replace function public.tg_documents_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.uploaded_by := coalesce(public.current_staff_id(), new.uploaded_by);
    -- completar la comunidad a partir de la entidad vinculada
    if new.community_id is null then
      new.community_id := coalesce(
        (select community_id from public.incidents where id = new.incident_id),
        (select community_id from public.budgets where id = new.budget_id),
        (select community_id from public.invoices where id = new.invoice_id),
        (select community_id from public.claims where id = new.claim_id));
    end if;
    if new.incident_id is null and new.task_id is not null then
      select incident_id into new.incident_id from public.tasks where id = new.task_id;
    end if;
  else
    -- solo se permite archivar/desarchivar; el resto de metadatos es inalterable
    if (to_jsonb(new) - array['archived_at', 'archived_by', 'description', 'doc_type'])
       is distinct from (to_jsonb(old) - array['archived_at', 'archived_by', 'description', 'doc_type']) then
      raise exception 'Los datos de origen de un documento no se pueden modificar.';
    end if;
    if new.archived_at is distinct from old.archived_at then
      new.archived_by := public.current_staff_id();
    end if;
  end if;
  return new;
end $$;

create trigger documents_before before insert or update on public.documents
for each row execute function public.tg_documents_before();

create or replace function public.tg_documents_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_activity('documento', 'Documento añadido: ' || new.file_name,
    new.community_id, new.incident_id, null, new.budget_id, new.invoice_id, new.claim_id, new.id, new.task_id, new.provider_id);
  return null;
end $$;

create trigger documents_after after insert on public.documents
for each row execute function public.tg_documents_after();

-- -----------------------------------------------------------------------------
-- Actividad manual: el autor siempre es quien la registra
-- -----------------------------------------------------------------------------
create or replace function public.tg_activity_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.actor_id := public.current_staff_id();
  end if;
  new.created_at := now();
  if new.incident_id is not null and new.community_id is null then
    select community_id into new.community_id from public.incidents where id = new.incident_id;
  end if;
  if new.claim_id is not null and new.community_id is null then
    select community_id into new.community_id from public.claims where id = new.claim_id;
  end if;
  if new.occurred_at > now() + interval '5 minutes' then
    raise exception 'La fecha de una actuación no puede ser futura.';
  end if;
  return new;
end $$;

create trigger activity_before before insert on public.activity
for each row execute function public.tg_activity_before();

-- -----------------------------------------------------------------------------
-- Eventos de calendario
-- -----------------------------------------------------------------------------
create or replace function public.tg_calendar_before() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(public.current_staff_id(), new.created_by);
  end if;
  if new.incident_id is not null and new.community_id is null then
    select community_id into new.community_id from public.incidents where id = new.incident_id;
  end if;
  return new;
end $$;

create trigger calendar_before before insert or update on public.calendar_events
for each row execute function public.tg_calendar_before();

-- =============================================================================
-- FUNCIONES DE FLUJO (RPC)
-- =============================================================================

-- Responsable económico de un presupuesto: gestora de la incidencia o, en su
-- defecto, gestora de la comunidad.
create or replace function public.budget_responsible(p_budget uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(i.manager_id, c.manager_id)
  from public.budgets b
  join public.communities c on c.id = b.community_id
  left join public.incidents i on i.id = b.incident_id
  where b.id = p_budget
$$;

create or replace function public.can_edit_budget(p_budget uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_supervisor()
      or public.budget_responsible(p_budget) = public.current_staff_id()
      or exists (select 1 from public.budgets b where b.id = p_budget and b.created_by = public.current_staff_id())
$$;

-- Evaluación previa (para mostrar en pantalla qué ocurrirá al aprobar)
create or replace function public.budget_approval_check(p_budget uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.budgets;
  v_me public.staff;
  v_responsible uuid := public.budget_responsible(p_budget);
  v_has_president boolean;
begin
  if not public.is_staff() then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  select * into b from public.budgets where id = p_budget;
  if not found then raise exception 'Presupuesto no encontrado.'; end if;
  select * into v_me from public.staff where id = public.current_staff_id();
  select exists (select 1 from public.budget_authorizations where budget_id = p_budget and kind = 'presidente')
    into v_has_president;
  return jsonb_build_object(
    'total', b.total_amount,
    'status', b.status,
    'is_supervisor', public.is_supervisor(),
    'is_responsible', v_responsible = v_me.id,
    'my_limit', v_me.approval_limit,
    'has_president_authorization', v_has_president,
    'can_approve', b.status in ('solicitado', 'recibido', 'pendiente_autorizacion') and b.base_amount is not null and (
       public.is_supervisor()
       or (v_responsible = v_me.id and v_me.approval_limit is not null and b.total_amount <= v_me.approval_limit)),
    'needs_superior', not public.is_supervisor() and (v_me.approval_limit is null or b.total_amount > v_me.approval_limit)
  );
end $$;

create or replace function public.approve_budget(p_budget uuid, p_notes text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  b public.budgets;
  v_me public.staff;
  v_responsible uuid;
  v_responsible_limit numeric;
  v_kind public.authorization_kind;
begin
  if not public.is_staff() then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  select * into b from public.budgets where id = p_budget for update;
  if not found then raise exception 'Presupuesto no encontrado.'; end if;
  if b.status not in ('solicitado', 'recibido', 'pendiente_autorizacion') then
    raise exception 'El presupuesto está en estado "%" y no puede aprobarse.', public.status_label('presupuesto', b.status::text);
  end if;
  if b.base_amount is null then
    raise exception 'Introduzca la base imponible antes de aprobar el presupuesto.';
  end if;

  select * into v_me from public.staff where id = public.current_staff_id();
  v_responsible := public.budget_responsible(p_budget);
  select approval_limit into v_responsible_limit from public.staff where id = v_responsible;

  if public.is_supervisor() then
    v_kind := case when v_responsible_limit is not null and b.total_amount <= v_responsible_limit
                   then 'aprobacion_interna' else 'autorizacion_superior' end;
  else
    if v_responsible is distinct from v_me.id then
      raise exception 'Solo la gestora responsable puede aprobar este presupuesto.' using errcode = '42501';
    end if;
    if v_me.approval_limit is null then
      raise exception 'LIMITE_NO_CONFIGURADO: Su límite económico está pendiente de configurar. Solicite autorización superior.' using errcode = '42501';
    end if;
    if b.total_amount > v_me.approval_limit then
      raise exception 'LIMITE_SUPERADO: El importe (% €) supera su límite de aprobación (% €). Solicite autorización superior.',
        to_char(b.total_amount, 'FM999G999G990D00'), to_char(v_me.approval_limit, 'FM999G999G990D00') using errcode = '42501';
    end if;
    v_kind := 'aprobacion_interna';
  end if;

  perform set_config('ar.workflow', 'on', true);
  update public.budgets
     set status = 'aprobado', selected = true, approved_by = v_me.id, approved_at = now(), approval_kind = v_kind
   where id = p_budget;
  insert into public.budget_authorizations (budget_id, kind, staff_id, amount, medium, notes, authorized_by_name)
  values (p_budget, v_kind, v_me.id, b.total_amount, 'sistema', p_notes, v_me.full_name);

  if b.incident_id is not null then
    update public.incidents set status = 'aprobada'
     where id = b.incident_id
       and status in ('nueva', 'pendiente_revision', 'en_curso', 'pendiente_proveedor', 'presupuesto_solicitado',
                      'presupuesto_recibido', 'pendiente_aprobacion');
  end if;
  perform set_config('ar.workflow', 'off', true);

  if v_responsible is distinct from v_me.id then
    perform public.notify(v_responsible, 'presupuesto_aprobado', 'Presupuesto aprobado: ' || b.code,
                          b.concept, '/presupuestos/' || b.id);
  end if;
  return jsonb_build_object('ok', true, 'kind', v_kind);
end $$;

create or replace function public.request_superior_approval(p_budget uuid, p_notes text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.budgets;
begin
  if not public.can_edit_budget(p_budget) then
    raise exception 'No tiene permisos sobre este presupuesto.' using errcode = '42501';
  end if;
  select * into b from public.budgets where id = p_budget for update;
  if b.status not in ('solicitado', 'recibido', 'pendiente_autorizacion') then
    raise exception 'El presupuesto no está pendiente de aprobación.';
  end if;
  perform set_config('ar.workflow', 'on', true);
  update public.budgets set status = 'pendiente_autorizacion', requires_superior = true where id = p_budget;
  if b.incident_id is not null then
    update public.incidents set status = 'pendiente_aprobacion'
     where id = b.incident_id and status in ('nueva', 'pendiente_revision', 'en_curso', 'pendiente_proveedor',
                                             'presupuesto_solicitado', 'presupuesto_recibido');
  end if;
  perform set_config('ar.workflow', 'off', true);
  perform public.log_activity('presupuesto_estado', 'Solicitada autorización superior para ' || b.code,
    b.community_id, b.incident_id, null, b.id, null, null, null, null, b.provider_id, p_notes);
  perform public.notify_supervisors('presupuesto_supera_limite', 'Autorización superior solicitada: ' || b.code,
    b.concept || ' · ' || to_char(b.total_amount, 'FM999G999G990D00') || ' €', '/presupuestos/' || b.id,
    'superior:' || b.id);
end $$;

create or replace function public.reject_budget(p_budget uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare b public.budgets;
begin
  if not public.can_edit_budget(p_budget) then
    raise exception 'No tiene permisos sobre este presupuesto.' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Indique el motivo del rechazo.'; end if;
  select * into b from public.budgets where id = p_budget for update;
  if b.status in ('rechazado', 'cancelado') then raise exception 'El presupuesto ya está rechazado o cancelado.'; end if;
  if b.status = 'aprobado' and not public.is_supervisor() then
    raise exception 'Solo Dirección o Coordinación pueden anular un presupuesto aprobado.' using errcode = '42501';
  end if;
  if exists (select 1 from public.invoices where budget_id = p_budget) then
    raise exception 'El presupuesto tiene facturas asociadas y no puede rechazarse.';
  end if;
  perform set_config('ar.workflow', 'on', true);
  update public.budgets set status = 'rechazado', selected = false, rejected_reason = p_reason where id = p_budget;
  perform set_config('ar.workflow', 'off', true);
end $$;

create or replace function public.confirm_payment(p_invoice uuid, p_amount numeric, p_paid_on date, p_notes text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  f public.invoices;
  v_paid numeric;
  v_me uuid := public.current_staff_id();
begin
  if not public.is_supervisor() then
    raise exception 'Solo Dirección (Silvia Rodríguez) o Coordinación (Begoña López) pueden confirmar pagos.' using errcode = '42501';
  end if;
  select * into f from public.invoices where id = p_invoice for update;
  if not found then raise exception 'Factura no encontrada.'; end if;
  if f.status = 'pagada' then raise exception 'La factura ya consta como pagada.'; end if;
  if f.status = 'discrepancia' then raise exception 'La factura tiene una discrepancia abierta. Resuélvala antes de registrar el pago.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El importe del pago debe ser mayor que cero.'; end if;
  if p_paid_on is null or p_paid_on > public.today_madrid() then raise exception 'Indique una fecha de pago válida (no futura).'; end if;

  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = p_invoice;
  if v_paid + p_amount > f.total_amount then
    raise exception 'El pago (% €) supera el importe pendiente de la factura (% €).',
      to_char(p_amount, 'FM999G999G990D00'), to_char(f.total_amount - v_paid, 'FM999G999G990D00');
  end if;

  insert into public.payments (invoice_id, amount, paid_on, confirmed_by, notes)
  values (p_invoice, p_amount, p_paid_on, v_me, p_notes);

  perform set_config('ar.workflow', 'on', true);
  if v_paid + p_amount >= f.total_amount then
    update public.invoices set status = 'pagada' where id = p_invoice;
  elsif f.status <> 'pendiente_pago' then
    update public.invoices set status = 'pendiente_pago' where id = p_invoice;
  end if;
  perform set_config('ar.workflow', 'off', true);

  perform public.log_activity('pago_confirmado',
    'Pago confirmado de ' || to_char(p_amount, 'FM999G999G990D00') || ' € (factura ' || f.invoice_number || ')',
    f.community_id, f.incident_id, jsonb_build_object('importe', p_amount, 'fecha', p_paid_on), f.budget_id, f.id,
    null, null, null, f.provider_id, p_notes);
  perform public.notify(f.created_by, 'pago_confirmado', 'Pago confirmado: factura ' || f.invoice_number,
    to_char(p_amount, 'FM999G999G990D00') || ' €', '/facturas/' || f.id);
  return jsonb_build_object('ok', true, 'fully_paid', v_paid + p_amount >= f.total_amount);
end $$;

-- Aplica una plantilla de checklist a una incidencia o a un siniestro
create or replace function public.apply_checklist(p_template uuid, p_incident uuid default null, p_claim uuid default null)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
  v_name text;
  v_base date := public.today_madrid();
  v_community uuid;
  v_assignee uuid;
begin
  if num_nonnulls(p_incident, p_claim) <> 1 then raise exception 'Indique una incidencia o un siniestro.'; end if;
  if p_incident is not null and not public.can_edit_incident(p_incident) then
    raise exception 'No tiene permisos para modificar esta incidencia.' using errcode = '42501';
  end if;
  if p_claim is not null and not public.can_edit_claim(p_claim) then
    raise exception 'No tiene permisos para modificar este siniestro.' using errcode = '42501';
  end if;
  select name into v_name from public.checklist_templates where id = p_template and active;
  if v_name is null then raise exception 'Plantilla no disponible.'; end if;

  if p_incident is not null then
    select community_id, manager_id into v_community, v_assignee from public.incidents where id = p_incident;
  else
    select community_id, manager_id into v_community, v_assignee from public.claims where id = p_claim;
  end if;

  insert into public.tasks (incident_id, claim_id, title, sort_order, due_on, assignee_id)
  select p_incident, p_claim, it.title,
         coalesce((select max(sort_order) from public.tasks t where t.incident_id is not distinct from p_incident
                   and t.claim_id is not distinct from p_claim), 0) + it.sort_order,
         case when it.due_offset_days is not null then v_base + it.due_offset_days end,
         v_assignee
  from public.checklist_template_items it where it.template_id = p_template
  order by it.sort_order;
  get diagnostics v_count = row_count;

  perform public.log_activity('checklist_aplicado', 'Checklist aplicado: ' || v_name || ' (' || v_count || ' tareas)',
    v_community, p_incident, null, null, null, p_claim);
  return v_count;
end $$;

-- Recordatorios periódicos (idempotente: no duplica avisos del mismo día).
-- Se ejecuta al abrir el panel y puede programarse con pg_cron.
create or replace function public.generate_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.today_madrid();
  v_settings public.app_settings;
  v_before integer;
  v_after integer;
  r record;
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'Acceso no autorizado.' using errcode = '42501';
  end if;
  select * into v_settings from public.app_settings limit 1;
  select count(*) into v_before from public.notifications;

  -- Tareas próximas a vencer y atrasadas
  for r in
    select t.id, t.title, t.due_on, coalesce(t.assignee_id, i.manager_id, cl.manager_id) as recipient,
           coalesce('/incidencias/' || t.incident_id, '/siniestros/' || t.claim_id) as link,
           coalesce(i.code, cl.code) as code
    from public.tasks t
    left join public.incidents i on i.id = t.incident_id
    left join public.claims cl on cl.id = t.claim_id
    where not t.done and t.due_on is not null and t.due_on <= v_today + coalesce(v_settings.due_soon_days, 2)
      and coalesce(i.status::text, cl.status::text) not in ('cerrada', 'cancelada', 'resuelta', 'finalizado', 'cerrado')
  loop
    if r.due_on < v_today then
      perform public.notify(r.recipient, 'tarea_atrasada', 'Tarea atrasada (' || r.code || ')', r.title, r.link,
                            'tarea_atrasada:' || r.id || ':' || v_today);
    else
      perform public.notify(r.recipient, 'tarea_proxima', 'Tarea próxima a vencer (' || r.code || ')',
                            r.title || ' · vence el ' || to_char(r.due_on, 'DD/MM/YYYY'), r.link,
                            'tarea_proxima:' || r.id || ':' || r.due_on);
    end if;
  end loop;

  -- Incidencias sin actividad
  for r in
    select i.id, i.code, i.title, i.manager_id
    from public.incidents i
    where i.status not in ('resuelta', 'cerrada', 'cancelada')
      and i.last_activity_at < now() - make_interval(days => coalesce(v_settings.inactivity_days, 7))
  loop
    perform public.notify(r.manager_id, 'incidencia_sin_actividad', 'Sin actividad: ' || r.code, r.title,
                          '/incidencias/' || r.id, 'inactiva:' || r.id || ':' || v_today);
  end loop;

  -- Incidencias atrasadas
  for r in
    select i.id, i.code, i.title, i.manager_id
    from public.incidents i
    where i.status not in ('resuelta', 'cerrada', 'cancelada')
      and coalesce(i.due_on, i.planned_on) < v_today
  loop
    perform public.notify(r.manager_id, 'incidencia_atrasada', 'Incidencia atrasada: ' || r.code, r.title,
                          '/incidencias/' || r.id, 'atrasada:' || r.id || ':' || v_today);
  end loop;

  select count(*) into v_after from public.notifications;
  return v_after - v_before;
end $$;

-- Datos de perfil que cada persona puede modificar de sí misma
create or replace function public.update_my_profile(p_phone text, p_avatar_path text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  update public.staff set phone = nullif(trim(p_phone), ''), avatar_path = p_avatar_path
   where id = public.current_staff_id();
end $$;

-- =============================================================================
-- VISTAS (security_invoker: respetan RLS de quien consulta)
-- =============================================================================
create or replace view public.incidents_view with (security_invoker = true) as
select
  i.*,
  c.name as community_name,
  c.code as community_code,
  c.manager_id as community_manager_id,
  m.short_name as manager_name,
  cr.short_name as created_by_name,
  cat.name as category_name,
  sub.name as subcategory_name,
  p.trade_name as provider_name,
  (i.status not in ('resuelta', 'cerrada', 'cancelada')) as is_open,
  (i.status not in ('resuelta', 'cerrada', 'cancelada')
     and coalesce(i.due_on, i.planned_on) < public.today_madrid()) as is_overdue,
  (select count(*) from public.tasks t where t.incident_id = i.id) as tasks_total,
  (select count(*) from public.tasks t where t.incident_id = i.id and t.done) as tasks_done,
  (select min(t.due_on) from public.tasks t where t.incident_id = i.id and not t.done) as next_task_due,
  case i.priority when 'urgente' then 4 when 'alta' then 3 when 'normal' then 2 else 1 end as priority_rank
from public.incidents i
join public.communities c on c.id = i.community_id
left join public.staff m on m.id = i.manager_id
left join public.staff cr on cr.id = i.created_by
left join public.categories cat on cat.id = i.category_id
left join public.categories sub on sub.id = i.subcategory_id
left join public.providers p on p.id = i.provider_id;

create or replace view public.communities_view with (security_invoker = true) as
select
  c.*,
  m.short_name as manager_name,
  (select count(*) from public.incidents i where i.community_id = c.id and i.status not in ('resuelta', 'cerrada', 'cancelada')) as open_incidents,
  (select count(*) from public.incidents i where i.community_id = c.id and i.status in ('resuelta', 'cerrada')) as closed_incidents,
  (select count(*) from public.incidents i where i.community_id = c.id and i.status not in ('resuelta', 'cerrada', 'cancelada')
     and coalesce(i.due_on, i.planned_on) < public.today_madrid()) as overdue_incidents,
  (select count(*) from public.incidents i where i.community_id = c.id and i.status not in ('resuelta', 'cerrada', 'cancelada')
     and i.priority = 'urgente') as urgent_incidents
from public.communities c
left join public.staff m on m.id = c.manager_id;

create or replace view public.budgets_view with (security_invoker = true) as
select
  b.*,
  c.name as community_name,
  i.code as incident_code,
  i.title as incident_title,
  p.trade_name as provider_name,
  ap.short_name as approved_by_name,
  coalesce(i.manager_id, c.manager_id) as responsible_id,
  rs.short_name as responsible_name,
  exists (select 1 from public.budget_authorizations a where a.budget_id = b.id and a.kind = 'presidente') as has_president_authorization
from public.budgets b
join public.communities c on c.id = b.community_id
left join public.incidents i on i.id = b.incident_id
left join public.providers p on p.id = b.provider_id
left join public.staff ap on ap.id = b.approved_by
left join public.staff rs on rs.id = coalesce(i.manager_id, c.manager_id);

create or replace view public.invoices_view with (security_invoker = true) as
select
  f.*,
  c.name as community_name,
  i.code as incident_code,
  b.code as budget_code,
  p.trade_name as provider_name,
  coalesce((select sum(pay.amount) from public.payments pay where pay.invoice_id = f.id), 0) as paid_amount,
  (select max(pay.paid_on) from public.payments pay where pay.invoice_id = f.id) as last_paid_on
from public.invoices f
join public.communities c on c.id = f.community_id
join public.providers p on p.id = f.provider_id
left join public.incidents i on i.id = f.incident_id
left join public.budgets b on b.id = f.budget_id;

create or replace view public.claims_view with (security_invoker = true) as
select cl.*, c.name as community_name, i.code as incident_code, m.short_name as manager_name
from public.claims cl
join public.communities c on c.id = cl.community_id
left join public.incidents i on i.id = cl.incident_id
left join public.staff m on m.id = cl.manager_id;

create or replace view public.activity_view with (security_invoker = true) as
select a.*, s.short_name as actor_name, c.name as community_name, i.code as incident_code, i.title as incident_title
from public.activity a
left join public.staff s on s.id = a.actor_id
left join public.communities c on c.id = a.community_id
left join public.incidents i on i.id = a.incident_id;

-- Estadísticas del panel (con filtro opcional por gestora)
create or replace function public.dashboard_stats(p_staff uuid default null) returns jsonb
language sql stable security invoker set search_path = '' as $$
  with inc as (
    select * from public.incidents_view where p_staff is null or manager_id = p_staff
  )
  select jsonb_build_object(
    'total', (select count(*) from inc),
    'nuevas', (select count(*) from inc where status = 'nueva'),
    'pendientes', (select count(*) from inc where status = 'pendiente_revision'),
    'en_curso', (select count(*) from inc where status = 'en_curso'),
    'atrasadas', (select count(*) from inc where is_overdue),
    'pendiente_proveedor', (select count(*) from inc where status = 'pendiente_proveedor'),
    'pendiente_presupuesto', (select count(*) from inc where status in ('presupuesto_solicitado', 'presupuesto_recibido')),
    'pendiente_aprobacion', (select count(*) from inc where status = 'pendiente_aprobacion'),
    'facturas_pendientes', (select count(*) from public.invoices f
                             where f.status <> 'pagada'
                               and (p_staff is null or exists (select 1 from public.communities c where c.id = f.community_id and c.manager_id = p_staff)
                                    or exists (select 1 from public.incidents i where i.id = f.incident_id and i.manager_id = p_staff))),
    'resueltas', (select count(*) from inc where status in ('resuelta', 'cerrada')),
    'abiertas', (select count(*) from inc where is_open),
    'urgentes', (select count(*) from inc where is_open and priority = 'urgente')
  )
$$;

-- =============================================================================
-- RLS
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'app_settings', 'staff', 'approval_limit_history', 'categories', 'status_labels', 'checklist_templates',
    'checklist_template_items', 'communities', 'community_contacts', 'providers', 'provider_specialties',
    'community_providers', 'code_counters', 'incidents', 'claims', 'tasks', 'budgets', 'budget_authorizations',
    'invoices', 'payments', 'documents', 'activity', 'calendar_events', 'notifications', 'import_batches', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Lectura general para el equipo (decisión 3.2: todas consultan todo)
do $$
declare t text;
begin
  foreach t in array array[
    'app_settings', 'staff', 'categories', 'status_labels', 'checklist_templates', 'checklist_template_items',
    'communities', 'community_contacts', 'providers', 'provider_specialties', 'community_providers',
    'incidents', 'claims', 'tasks', 'budgets', 'budget_authorizations', 'invoices', 'payments',
    'documents', 'activity', 'calendar_events', 'import_batches'
  ] loop
    execute format('create policy "equipo_consulta" on public.%I for select to authenticated using (public.is_staff())', t);
  end loop;
end $$;

-- Configuración y catálogos: solo Dirección/Coordinación
create policy "supervision_modifica" on public.app_settings for update to authenticated
  using (public.is_supervisor()) with check (public.is_supervisor());
create policy "supervision_modifica" on public.staff for update to authenticated
  using (public.is_supervisor()) with check (public.is_supervisor());
create policy "supervision_alta" on public.staff for insert to authenticated with check (public.is_supervisor());
create policy "supervision_consulta" on public.approval_limit_history for select to authenticated using (public.is_supervisor());
create policy "supervision_consulta" on public.audit_log for select to authenticated using (public.is_supervisor());

do $$
declare t text;
begin
  foreach t in array array['categories', 'status_labels', 'checklist_templates', 'checklist_template_items'] loop
    execute format('create policy "supervision_alta" on public.%I for insert to authenticated with check (public.is_supervisor())', t);
    execute format('create policy "supervision_modifica" on public.%I for update to authenticated using (public.is_supervisor()) with check (public.is_supervisor())', t);
  end loop;
end $$;
create policy "supervision_borra" on public.checklist_template_items for delete to authenticated using (public.is_supervisor());

-- Comunidades
create policy "supervision_alta" on public.communities for insert to authenticated with check (public.is_supervisor());
create policy "responsable_modifica" on public.communities for update to authenticated
  using (public.can_edit_community(id)) with check (public.can_edit_community(id));
create policy "equipo_alta" on public.community_contacts for insert to authenticated
  with check (public.can_edit_community(community_id));
create policy "responsable_modifica" on public.community_contacts for update to authenticated
  using (public.can_edit_community(community_id)) with check (public.can_edit_community(community_id));
create policy "responsable_alta" on public.community_providers for insert to authenticated
  with check (public.can_edit_community(community_id));
create policy "responsable_borra" on public.community_providers for delete to authenticated
  using (public.can_edit_community(community_id));

-- Proveedores: directorio compartido
create policy "equipo_alta" on public.providers for insert to authenticated with check (public.is_staff());
create policy "equipo_modifica" on public.providers for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "equipo_alta" on public.provider_specialties for insert to authenticated with check (public.is_staff());
create policy "equipo_borra" on public.provider_specialties for delete to authenticated using (public.is_staff());

-- Incidencias: cualquiera registra; modifica la responsable o supervisión
create policy "equipo_alta" on public.incidents for insert to authenticated with check (public.is_staff());
create policy "responsable_modifica" on public.incidents for update to authenticated
  using (public.can_edit_incident(id)) with check (public.can_edit_incident(id));

-- Siniestros
create policy "equipo_alta" on public.claims for insert to authenticated with check (public.is_staff());
create policy "responsable_modifica" on public.claims for update to authenticated
  using (public.can_edit_claim(id)) with check (public.can_edit_claim(id));

-- Tareas: las gestiona la responsable; la persona asignada puede completarlas
create policy "responsable_alta" on public.tasks for insert to authenticated
  with check ((incident_id is not null and public.can_edit_incident(incident_id))
           or (claim_id is not null and public.can_edit_claim(claim_id)));
create policy "responsable_o_asignada_modifica" on public.tasks for update to authenticated
  using ((incident_id is not null and public.can_edit_incident(incident_id))
      or (claim_id is not null and public.can_edit_claim(claim_id))
      or assignee_id = public.current_staff_id())
  with check ((incident_id is not null and public.can_edit_incident(incident_id))
      or (claim_id is not null and public.can_edit_claim(claim_id))
      or assignee_id = public.current_staff_id());

-- Presupuestos
create policy "equipo_alta" on public.budgets for insert to authenticated with check (public.is_staff());
create policy "responsable_modifica" on public.budgets for update to authenticated
  using (public.can_edit_budget(id)) with check (public.can_edit_budget(id));
create policy "equipo_registra_presidente" on public.budget_authorizations for insert to authenticated
  with check (public.is_staff() and kind = 'presidente' and public.can_edit_budget(budget_id));

-- Facturas: todas registran y consultan; el pago solo por confirm_payment()
create policy "equipo_alta" on public.invoices for insert to authenticated with check (public.is_staff());
create policy "responsable_modifica" on public.invoices for update to authenticated
  using (public.is_supervisor() or created_by = public.current_staff_id() or public.can_edit_community(community_id))
  with check (public.is_supervisor() or created_by = public.current_staff_id() or public.can_edit_community(community_id));
-- payments: sin políticas de escritura (solo la función confirm_payment)

-- Documentos: todas suben; nadie borra; supervisión o autor pueden archivar
create policy "equipo_alta" on public.documents for insert to authenticated with check (public.is_staff());
create policy "autor_o_supervision_archiva" on public.documents for update to authenticated
  using (public.is_supervisor() or uploaded_by = public.current_staff_id())
  with check (public.is_supervisor() or uploaded_by = public.current_staff_id());

-- Actividad: inserción manual limitada a tipos manuales; sin modificación ni borrado
create policy "equipo_registra_actuacion" on public.activity for insert to authenticated
  with check (public.is_staff() and kind in ('actuacion', 'llamada', 'correo', 'comentario', 'visita', 'conversacion', 'correccion'));

-- Calendario
create policy "equipo_alta" on public.calendar_events for insert to authenticated with check (public.is_staff());
create policy "autor_o_supervision_modifica" on public.calendar_events for update to authenticated
  using (public.is_supervisor() or created_by = public.current_staff_id() or staff_id = public.current_staff_id())
  with check (public.is_supervisor() or created_by = public.current_staff_id() or staff_id = public.current_staff_id());

-- Notificaciones: cada persona las suyas
create policy "propias_consulta" on public.notifications for select to authenticated
  using (recipient_id = public.current_staff_id());
create policy "propias_marcar_leidas" on public.notifications for update to authenticated
  using (recipient_id = public.current_staff_id()) with check (recipient_id = public.current_staff_id());

-- Importaciones
create policy "equipo_alta" on public.import_batches for insert to authenticated with check (public.is_staff());

-- Permisos de ejecución: las funciones internas no se exponen a usuarios anónimos
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.current_staff_id(), public.current_staff_role(), public.is_staff(), public.is_supervisor(),
  public.can_edit_community(uuid), public.can_edit_incident(uuid), public.can_edit_claim(uuid),
  public.can_edit_budget(uuid), public.budget_responsible(uuid), public.budget_approval_check(uuid),
  public.approve_budget(uuid, text), public.request_superior_approval(uuid, text), public.reject_budget(uuid, text),
  public.confirm_payment(uuid, numeric, date, text), public.apply_checklist(uuid, uuid, uuid),
  public.generate_reminders(), public.update_my_profile(text, text), public.dashboard_stats(uuid),
  public.today_madrid(), public.status_label(text, text), public.in_workflow()
to authenticated;
-- Funciones internas usadas por disparadores: no invocables por la API
revoke execute on function public.next_code(text), public.notify(uuid, text, text, text, text, text),
  public.notify_supervisors(text, text, text, text, text, uuid),
  public.log_activity(text, text, uuid, uuid, jsonb, uuid, uuid, uuid, uuid, uuid, uuid, text)
from authenticated;
revoke all on table public.code_counters from anon, authenticated;
revoke all on all tables in schema public from anon;

-- =============================================================================
-- STORAGE: archivos privados
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('documentos', 'documentos', false, 52428800)
on conflict (id) do nothing;
-- Logotipo e identidad corporativa: no es información privada
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('corporativo', 'corporativo', true, 5242880, array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'])
on conflict (id) do nothing;

create policy "equipo_sube_documentos" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.is_staff());
create policy "equipo_lee_documentos" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.is_staff());
create policy "equipo_sube_avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'corporativo' and public.is_staff()
              and ((storage.foldername(name))[1] = 'avatares' or public.is_supervisor()));
create policy "supervision_actualiza_corporativo" on storage.objects for update to authenticated
  using (bucket_id = 'corporativo' and public.is_supervisor());
