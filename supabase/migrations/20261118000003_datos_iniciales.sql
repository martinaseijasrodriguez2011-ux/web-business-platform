-- =============================================================================
-- AR INCIDENCIAS · Migración 3: datos iniciales de configuración
-- Solo se cargan datos facilitados en el encargo. No se inventan correos,
-- teléfonos, límites económicos, comunidades ni proveedores.
-- =============================================================================

insert into public.app_settings (id) values (true) on conflict do nothing;

-- Equipo (sin correos: se informan al enviar cada invitación)
insert into public.staff (full_name, short_name, position, role) values
  ('Silvia Rodríguez', 'Silvia', 'Directora del despacho', 'direccion'),
  ('Begoña López', 'Begoña', 'Encargada y coordinadora', 'coordinacion'),
  ('Pilar', 'Pilar', 'Gestión de comunidades', 'gestora'),
  ('Eva', 'Eva', 'Gestión de comunidades', 'gestora'),
  ('Nuria', 'Nuria', 'Gestión de comunidades', 'gestora'),
  ('Montse', 'Montse', 'Gestión de comunidades', 'gestora'),
  ('Sonia', 'Sonia', 'Gestión de comunidades', 'gestora'),
  ('Laura', 'Laura', 'Gestión de comunidades', 'gestora'),
  ('Santi', 'Santi', 'Gestión de comunidades', 'gestora');

-- Categorías de incidencias
insert into public.categories (scope, name, sort_order)
select 'incidencia', name, ord
from unnest(array['Fontanería', 'Electricidad', 'Cerrajería', 'Ascensor', 'Limpieza', 'Jardinería', 'Fachada',
                  'Cubierta y tejado', 'Humedades', 'Albañilería', 'Puertas y accesos', 'Piscina', 'Garaje',
                  'Seguro', 'Otros']) with ordinality as t(name, ord);

-- Especialidades de proveedores
insert into public.categories (scope, name, sort_order)
select 'proveedor', name, ord
from unnest(array['Fontanería', 'Electricidad', 'Cerrajería', 'Ascensores', 'Limpieza', 'Jardinería',
                  'Albañilería', 'Pintura', 'Construcción', 'Reparaciones', 'Otros']) with ordinality as t(name, ord);

-- Etiquetas y colores de estados (gris: sin iniciar · azul: en curso ·
-- naranja: requiere atención · rojo: urgente · verde: completado)
insert into public.status_labels (entity, key, label, tone, sort_order) values
  ('incidencia', 'nueva', 'Nueva', 'gris', 1),
  ('incidencia', 'pendiente_revision', 'Pendiente de revisión', 'naranja', 2),
  ('incidencia', 'en_curso', 'En curso', 'azul', 3),
  ('incidencia', 'pendiente_proveedor', 'Pendiente de proveedor', 'naranja', 4),
  ('incidencia', 'presupuesto_solicitado', 'Presupuesto solicitado', 'azul', 5),
  ('incidencia', 'presupuesto_recibido', 'Presupuesto recibido', 'azul', 6),
  ('incidencia', 'pendiente_aprobacion', 'Pendiente de aprobación', 'naranja', 7),
  ('incidencia', 'aprobada', 'Aprobada', 'azul', 8),
  ('incidencia', 'reparacion_programada', 'Reparación programada', 'azul', 9),
  ('incidencia', 'reparacion_realizada', 'Reparación realizada', 'verde', 10),
  ('incidencia', 'factura_pendiente', 'Factura pendiente', 'naranja', 11),
  ('incidencia', 'pendiente_pago', 'Pendiente de pago', 'naranja', 12),
  ('incidencia', 'resuelta', 'Resuelta', 'verde', 13),
  ('incidencia', 'cerrada', 'Cerrada', 'verde', 14),
  ('incidencia', 'cancelada', 'Cancelada', 'gris', 15),
  ('presupuesto', 'solicitado', 'Solicitado', 'gris', 1),
  ('presupuesto', 'recibido', 'Recibido', 'azul', 2),
  ('presupuesto', 'pendiente_autorizacion', 'Pendiente de autorización', 'naranja', 3),
  ('presupuesto', 'aprobado', 'Aprobado', 'verde', 4),
  ('presupuesto', 'rechazado', 'Rechazado', 'rojo', 5),
  ('presupuesto', 'cancelado', 'Cancelado', 'gris', 6),
  ('factura', 'recibida', 'Factura recibida', 'azul', 1),
  ('factura', 'pendiente_revision', 'Pendiente de revisión', 'naranja', 2),
  ('factura', 'pendiente_pago', 'Pendiente de pago', 'naranja', 3),
  ('factura', 'pagada', 'Pagada', 'verde', 4),
  ('factura', 'discrepancia', 'Incidencia o discrepancia', 'rojo', 5),
  ('siniestro', 'pendiente_comunicar', 'Pendiente de comunicar', 'naranja', 1),
  ('siniestro', 'comunicado', 'Comunicado', 'azul', 2),
  ('siniestro', 'pendiente_perito', 'Pendiente de perito', 'naranja', 3),
  ('siniestro', 'visita_programada', 'Visita programada', 'azul', 4),
  ('siniestro', 'pendiente_valoracion', 'Pendiente de valoración', 'naranja', 5),
  ('siniestro', 'aceptado', 'Aceptado', 'verde', 6),
  ('siniestro', 'rechazado', 'Rechazado', 'rojo', 7),
  ('siniestro', 'en_reparacion', 'En reparación', 'azul', 8),
  ('siniestro', 'finalizado', 'Finalizado', 'verde', 9),
  ('siniestro', 'cerrado', 'Cerrado', 'verde', 10);

-- Plantillas de checklist (contenido facilitado en el encargo)
with t as (
  insert into public.checklist_templates (name, kind) values ('Reparación', 'reparacion') returning id
)
insert into public.checklist_template_items (template_id, title, sort_order)
select t.id, item, ord from t, unnest(array[
  'Registrar aviso del vecino', 'Comprobar el problema', 'Contactar con proveedor', 'Solicitar presupuesto',
  'Recibir presupuesto', 'Enviar presupuesto al presidente', 'Registrar autorización',
  'Aprobar presupuesto según permisos', 'Programar reparación', 'Confirmar realización', 'Recibir factura',
  'Registrar pago', 'Revisar resultado', 'Cerrar incidencia']) with ordinality as x(item, ord);

with t as (
  insert into public.checklist_templates (name, kind) values ('Siniestro', 'siniestro') returning id
)
insert into public.checklist_template_items (template_id, title, sort_order)
select t.id, item, ord from t, unnest(array[
  'Registrar siniestro', 'Identificar aseguradora', 'Comunicar el siniestro', 'Registrar número de expediente',
  'Adjuntar fotografías', 'Adjuntar documentación', 'Registrar perito', 'Coordinar visita', 'Recibir valoración',
  'Realizar seguimiento', 'Confirmar reparación', 'Registrar factura, si corresponde', 'Cerrar expediente']) with ordinality as x(item, ord);
