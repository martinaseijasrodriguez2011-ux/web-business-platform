# web-business-platform

Sistema para captar negocios locales sin página web y crearles la web con Claude.

## Qué hace

Cada mañana genera en `leads/AAAA-MM-DD.md` (y `.csv` para Excel) una lista de 20 negocios
sin web, de sectores variados (hostelería, belleza, comercio, oficios, salud, servicios). Para
cada uno incluye:

- nombre, tipo, dirección y teléfono;
- enlace de WhatsApp que abre el chat con el mensaje ya redactado (solo si el número es móvil);
- su Instagram si consta, o una búsqueda para localizarlo;
- mensaje para Instagram;
- enlaces para verificar en Google y Maps que de verdad no tiene web;
- el prompt completo para que Claude cree su web.

No repite negocios: lleva un registro en `data/historial.csv`, donde puede anotar el estado
(pendiente, contactado, interesado, no_interesa, cliente).

## Puesta en marcha

1. Edite `config.json`: nombre, marca (opcional) y la lista de ciudades. Cada día se consultan
   `ciudades_por_dia` ciudades de la lista, por turnos, para variar la zona y no saturar el
   servicio de mapas. Se puede añadir cualquier municipio de España con su nombre oficial.
2. Fusione esta rama en `main`: GitHub solo ejecuta las tareas programadas desde la rama principal.
3. En GitHub, pestaña Actions, active el workflow «Leads diarios». Puede lanzarlo a mano con
   «Run workflow» indicando ciudad y cantidad.
4. En local: `python3 prospeccion/buscar_negocios.py --ciudad Terrassa`.

## Con Claude Code

- `/leads-diarios`: muestra o genera la lista del día.
- `/crear-web 3`: crea la web del negocio nº 3 de la lista y la comprueba en móvil y escritorio.
- `/propuesta-cliente <negocio>`: presupuesto, condiciones y mensaje de seguimiento.

Más detalle y skills recomendadas en `docs/skills.md`.

## Origen de los datos y limitaciones

Los datos proceden de OpenStreetMap (licencia ODbL, © colaboradores de OpenStreetMap). Que un
negocio no tenga web en OSM no garantiza que no la tenga: verifíquelo siempre antes de
contactar. La cobertura varía según la ciudad; si un día salen menos de 20, añada más ciudades.

## Antes de contactar a nadie

Lea `docs/aspectos-legales.md`: límites de la LSSI a los mensajes comerciales por WhatsApp e
Instagram y obligaciones al vender una web.
