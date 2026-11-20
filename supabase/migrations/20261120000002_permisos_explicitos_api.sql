-- =============================================================================
-- AR INCIDENCIAS · Migración 7: permisos explícitos para la API
-- Los proyectos nuevos de Supabase no conceden permisos por defecto sobre las
-- tablas del esquema public a los roles de la API. Se conceden aquí de forma
-- explícita al rol `authenticated`; quién puede ver o modificar cada fila lo
-- siguen decidiendo las políticas RLS (migraciones 2 y siguientes).
-- El rol `anon` (visitantes sin sesión) no recibe ningún permiso.
-- =============================================================================

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Tablas internas sin acceso directo desde la API
revoke all on table public.code_counters from authenticated, anon;

-- Lo mismo para las tablas y vistas que se creen en el futuro
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- Ningún permiso para visitantes sin sesión
revoke all on all tables in schema public from anon;
