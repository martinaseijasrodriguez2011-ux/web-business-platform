# Despliegue de AR Incidencias (producción)

| Elemento | Valor |
|---|---|
| Aplicación | https://ar-incidencias.netlify.app (Netlify, equipo de Altayó & Rodríguez) |
| Base de datos | Supabase, proyecto `ar-incidencias`, región eu-central-1 (Frankfurt) |
| Plan actual | Periodo de prueba en planes gratuitos (Supabase Free + Netlify Free) |

Las claves nunca se guardan en el repositorio. La clave de servicio de Supabase
solo está en las variables de entorno del sitio en Netlify.

## Variables de entorno en Netlify

- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; necesaria para enviar invitaciones)

## Publicar una nueva versión

`scripts/desplegar.sh` compila con la configuración pública de producción y
publica el resultado (carpeta `.netlify/static`, funciones y funciones edge).
Requiere el token de Netlify y el de Supabase disponibles para la sesión.

Importante: publicar siempre con `--dir .netlify/static`. Publicar la carpeta
`.next` sube archivos internos de la compilación y deja la web sin estilos.

## Cambios en la base de datos

Las migraciones se aplicaron con la API de gestión de Supabase
(`POST /v1/projects/{ref}/database/migrations`), por lo que en producción
figuran con la fecha de aplicación y no con el número del archivo local. Para
nuevas migraciones, aplicarlas por la misma vía, en orden y una a una.

## Configuración de acceso (Supabase → Authentication)

- Registro libre desactivado; altas solo por invitación.
- Site URL: https://ar-incidencias.netlify.app · Redirect URLs: `https://ar-incidencias.netlify.app/**`
- Contraseña mínima: 10 caracteres.
- Pendiente: SMTP propio del despacho y plantillas en español (`supabase/templates/`).
  En el plan gratuito, sin SMTP propio solo se envían correos a los miembros de
  la cuenta y no se pueden personalizar las plantillas.

## Paso a planes de pago (al terminar la prueba)

1. Supabase → organización «Altayó & Rodríguez» → Billing → Pro. Activa copias diarias.
2. Netlify: mantener Free si el consumo de créditos lo permite; si no, plan Personal.
