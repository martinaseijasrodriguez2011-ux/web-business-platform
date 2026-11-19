-- =============================================================================
-- AR INCIDENCIAS · Migración 4
-- 1) Permiso individual de edición global (p. ej. Santi, que apoya a todo el
--    equipo): editar incidencias, presupuestos, facturas, siniestros y datos de
--    cualquier comunidad. NO permite confirmar pagos, conceder autorización
--    superior, asignar gestoras ni modificar la configuración.
-- 2) Subcomunidades: una comunidad puede pertenecer a una comunidad general
--    (p. ej. nº 8 Enrique Granados, formada por tres subcomunidades).
-- =============================================================================

-- 1) Edición global -----------------------------------------------------------
alter table public.staff add column can_edit_all boolean not null default false;
comment on column public.staff.can_edit_all is
  'Edición global: puede modificar los registros de todas las comunidades. No incluye pagos, autorización superior ni configuración.';

update public.staff set can_edit_all = true where short_name = 'Santi';

create or replace function public.has_global_edit() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.active and (s.can_edit_all or s.role in ('direccion', 'coordinacion'))
  )
$$;

create or replace function public.can_edit_community(p_community uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_global_edit() or exists (
    select 1 from public.communities c
    where c.id = p_community and c.manager_id = public.current_staff_id()
  )
$$;

create or replace function public.can_edit_incident(p_incident uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_global_edit() or exists (
    select 1 from public.incidents i
    join public.communities c on c.id = i.community_id
    where i.id = p_incident
      and public.current_staff_id() in (i.manager_id, c.manager_id)
  )
$$;

create or replace function public.can_edit_claim(p_claim uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_global_edit() or exists (
    select 1 from public.claims cl
    join public.communities c on c.id = cl.community_id
    where cl.id = p_claim
      and public.current_staff_id() in (cl.manager_id, c.manager_id)
  )
$$;

create or replace function public.can_edit_budget(p_budget uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_global_edit()
      or public.budget_responsible(p_budget) = public.current_staff_id()
      or exists (select 1 from public.budgets b where b.id = p_budget and b.created_by = public.current_staff_id())
$$;

-- Facturas: la edición global también permite corregirlas (nunca pagarlas)
drop policy "responsable_modifica" on public.invoices;
create policy "responsable_modifica" on public.invoices for update to authenticated
  using (public.has_global_edit() or created_by = public.current_staff_id() or public.can_edit_community(community_id))
  with check (public.has_global_edit() or created_by = public.current_staff_id() or public.can_edit_community(community_id));

-- Aprobación: quien tiene edición global puede aprobar presupuestos de
-- cualquier comunidad, siempre dentro de SU propio límite económico.
create or replace function public.budget_approval_check(p_budget uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  b public.budgets;
  v_me public.staff;
  v_responsible uuid := public.budget_responsible(p_budget);
  v_has_president boolean;
  v_may boolean;
begin
  if not public.is_staff() then raise exception 'Acceso no autorizado.' using errcode = '42501'; end if;
  select * into b from public.budgets where id = p_budget;
  if not found then raise exception 'Presupuesto no encontrado.'; end if;
  select * into v_me from public.staff where id = public.current_staff_id();
  select exists (select 1 from public.budget_authorizations where budget_id = p_budget and kind = 'presidente')
    into v_has_president;
  v_may := v_responsible = v_me.id or v_me.can_edit_all;
  return jsonb_build_object(
    'total', b.total_amount,
    'status', b.status,
    'is_supervisor', public.is_supervisor(),
    'is_responsible', v_may,
    'my_limit', v_me.approval_limit,
    'has_president_authorization', v_has_president,
    'can_approve', b.status in ('solicitado', 'recibido', 'pendiente_autorizacion') and b.base_amount is not null and (
       public.is_supervisor()
       or (v_may and v_me.approval_limit is not null and b.total_amount <= v_me.approval_limit)),
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
    if v_responsible is distinct from v_me.id and not v_me.can_edit_all then
      raise exception 'Solo la gestora responsable puede aprobar este presupuesto.' using errcode = '42501';
    end if;
    if v_me.approval_limit is null then
      raise exception 'LIMITE_NO_CONFIGURADO: Su límite económico está pendiente de configurar. Solicite autorización superior.' using errcode = '42501';
    end if;
    if b.total_amount > v_me.approval_limit then
      raise exception 'LIMITE_SUPERADO: El importe (% €) supera su límite de aprobación (% €). Solicite autorización superior.',
        public.fmt_eur(b.total_amount), public.fmt_eur(v_me.approval_limit) using errcode = '42501';
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

grant execute on function public.has_global_edit() to authenticated;
revoke execute on function public.has_global_edit() from anon, public;

-- 2) Subcomunidades -------------------------------------------------------------
alter table public.communities add column parent_id uuid references public.communities (id);
alter table public.communities add constraint communities_parent_not_self check (parent_id is null or parent_id <> id);
create index communities_parent_idx on public.communities (parent_id);
comment on column public.communities.parent_id is 'Comunidad general a la que pertenece esta subcomunidad (un solo nivel).';

create or replace function public.tg_communities_parent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.communities where id = new.parent_id and parent_id is not null) then
      raise exception 'Una subcomunidad no puede tener a su vez subcomunidades: elija la comunidad general.';
    end if;
    if exists (select 1 from public.communities where parent_id = new.id) then
      raise exception 'Esta comunidad ya tiene subcomunidades, así que no puede ser subcomunidad de otra.';
    end if;
  end if;
  return new;
end $$;

create trigger communities_parent before insert or update of parent_id on public.communities
for each row execute function public.tg_communities_parent();

-- La vista se recrea para incluir la nueva columna y el nombre de la comunidad general
drop view public.communities_view;
create view public.communities_view with (security_invoker = true) as
select
  c.*,
  m.short_name as manager_name,
  p.name as parent_name,
  p.code as parent_code,
  (select count(*) from public.communities s where s.parent_id = c.id) as subcommunities,
  (select count(*) from public.incidents i where i.community_id = c.id and i.status not in ('resuelta', 'cerrada', 'cancelada')) as open_incidents,
  (select count(*) from public.incidents i where i.community_id = c.id and i.status in ('resuelta', 'cerrada')) as closed_incidents,
  (select count(*) from public.incidents i where i.community_id = c.id and i.status not in ('resuelta', 'cerrada', 'cancelada')
     and coalesce(i.due_on, i.planned_on) < public.today_madrid()) as overdue_incidents,
  (select count(*) from public.incidents i where i.community_id = c.id and i.status not in ('resuelta', 'cerrada', 'cancelada')
     and i.priority = 'urgente') as urgent_incidents
from public.communities c
left join public.staff m on m.id = c.manager_id
left join public.communities p on p.id = c.parent_id;
