-- =============================================================================
-- AR INCIDENCIAS · Migración 5: aprobación de presupuestos sin límite + aviso
-- Decisión del despacho (19/11/2026): las gestoras no tienen límite económico.
-- Pueden aprobar presupuestos de cualquier importe y Dirección/Coordinación
-- reciben un aviso cuando el total iguala o supera el importe configurado
-- (si no se ha configurado, se avisa de todas las aprobaciones).
-- El sistema de límites individuales se conserva desactivado por si se
-- quisiera recuperar en el futuro (Configuración → Aprobación).
-- =============================================================================

alter table public.app_settings
  add column approval_limits_enabled boolean not null default false,
  add column approval_alert_threshold numeric(12,2) check (approval_alert_threshold is null or approval_alert_threshold >= 0);

comment on column public.app_settings.approval_limits_enabled is
  'false = las gestoras aprueban presupuestos sin límite económico; true = se aplican los límites individuales de staff.approval_limit.';
comment on column public.app_settings.approval_alert_threshold is
  'Importe total (IVA incluido) a partir del cual se avisa a Dirección y Coordinación de una aprobación. NULL = avisar de todas.';

create or replace function public.limits_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select approval_limits_enabled from public.app_settings limit 1), false)
$$;

create or replace function public.budget_approval_check(p_budget uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.budgets;
  v_me public.staff;
  v_responsible uuid := public.budget_responsible(p_budget);
  v_has_president boolean;
  v_may boolean;
  v_limits boolean := public.limits_enabled();
  v_within boolean;
begin
  if not public.is_staff() then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  select * into b from public.budgets where id = p_budget;
  if not found then raise exception 'Presupuesto no encontrado.'; end if;
  select * into v_me from public.staff where id = public.current_staff_id();
  select exists (select 1 from public.budget_authorizations where budget_id = p_budget and kind = 'presidente')
    into v_has_president;
  v_may := v_responsible = v_me.id or v_me.can_edit_all;
  v_within := not v_limits or (v_me.approval_limit is not null and b.total_amount <= v_me.approval_limit);
  return jsonb_build_object(
    'total', b.total_amount,
    'status', b.status,
    'is_supervisor', public.is_supervisor(),
    'is_responsible', v_may,
    'limits_enabled', v_limits,
    'my_limit', v_me.approval_limit,
    'has_president_authorization', v_has_president,
    'can_approve', b.status in ('solicitado', 'recibido', 'pendiente_autorizacion') and b.base_amount is not null
       and (public.is_supervisor() or (v_may and v_within)),
    'needs_superior', v_limits and not public.is_supervisor() and not v_within
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
  v_limits boolean := public.limits_enabled();
  v_threshold numeric;
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
    v_kind := case
      when b.requires_superior then 'autorizacion_superior'
      when not v_limits then 'aprobacion_interna'
      when v_responsible_limit is not null and b.total_amount <= v_responsible_limit then 'aprobacion_interna'
      else 'autorizacion_superior' end;
  else
    if v_responsible is distinct from v_me.id and not v_me.can_edit_all then
      raise exception 'Solo la gestora responsable puede aprobar este presupuesto.' using errcode = '42501';
    end if;
    if v_limits then
      if v_me.approval_limit is null then
        raise exception 'LIMITE_NO_CONFIGURADO: Su límite económico está pendiente de configurar. Solicite autorización superior.' using errcode = '42501';
      end if;
      if b.total_amount > v_me.approval_limit then
        raise exception 'LIMITE_SUPERADO: El importe (% €) supera su límite de aprobación (% €). Solicite autorización superior.',
          public.fmt_eur(b.total_amount), public.fmt_eur(v_me.approval_limit) using errcode = '42501';
      end if;
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

  -- Aviso a Dirección y Coordinación de las aprobaciones hechas por el equipo
  if not public.is_supervisor() then
    select approval_alert_threshold into v_threshold from public.app_settings limit 1;
    if v_threshold is null or b.total_amount >= v_threshold then
      perform public.notify_supervisors('presupuesto_aprobado_aviso',
        'Presupuesto aprobado por ' || v_me.short_name || ': ' || b.code,
        b.concept || ' · ' || public.fmt_eur(b.total_amount) || ' €', '/presupuestos/' || b.id, 'aprobado:' || b.id);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'kind', v_kind);
end $$;

grant execute on function public.limits_enabled() to authenticated;
revoke execute on function public.limits_enabled() from anon, public;
