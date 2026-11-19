# AR Incidencias · Altayó & Rodríguez

Plataforma interna de gestión de comunidades, incidencias, mantenimiento, presupuestos y control económico. Uso exclusivo del equipo de Altayó & Rodríguez (sin acceso de vecinos ni presidentes).

## Módulos

| Módulo | Qué permite |
|---|---|
| Inicio | Panel con indicadores reales, «Necesita atención», actividad reciente, gráficos interactivos y carga de trabajo del equipo (Dirección/Coordinación). Vista global o «Mi trabajo». |
| Incidencias | Alta con código automático `AR-AAAA-NNNN`, adjuntos, 15 estados, prioridades, 17 vistas rápidas con contador, filtros combinables, ordenación, checklist con progreso, cronología inalterable, exportación a Excel. |
| Comunidades | Comunidades generales y subcomunidades (escaleras, parking, piscina…). Listado con estado general, ficha con 7 pestañas (resumen, incidencias, presupuestos, facturas y pagos, proveedores, documentación, historial), contactos, importación desde Excel con asignación de gestora. |
| Presupuestos | Varios por incidencia, comparativa (sin selección automática), IVA configurable calculado en servidor, autorización del presidente separada de la aprobación interna, límites individuales y autorización superior. |
| Facturas y pagos | Registro por cualquier gestora, detección de diferencias con el presupuesto, pagos parciales o totales confirmados solo por Dirección y Coordinación. |
| Proveedores | Directorio con especialidades, ficha con incidencias, comunidades, presupuestos aceptados/rechazados, facturas y gasto acumulado. |
| Siniestros | Expedientes diferenciados, checklist propio, perito y visita, historial. |
| Calendario | Vistas día, semana y mes con eventos manuales y fechas derivadas (actuaciones previstas, fechas límite, tareas, visitas de perito). |
| Informes | Por comunidad, gestora, periodo, económico y actividad. Exportación a PDF y Excel con fecha de generación y filtros. |
| Equipo y perfil | Ficha de cada persona con comunidades, incidencias, tareas y actividad (sin valoraciones automáticas del rendimiento). |
| Configuración | Usuarios e invitaciones, límites económicos con historial, categorías, etiquetas de estados, plantillas de checklist, identidad corporativa, importaciones y auditoría. |
| Buscador global | Comunidades, incidencias, vecinos, proveedores, presupuestos, facturas, expedientes y documentos. |

## Arquitectura

- **Next.js 16** (App Router, Server Components y Server Actions), **React 19**, **TypeScript**, **Tailwind CSS 4**.
- **Supabase**: PostgreSQL, Auth (usuario y contraseña, invitaciones, recuperación), Storage privado.
- Despliegue previsto en **Vercel**.

```
src/app/(app)/…      pantallas autenticadas (una carpeta por módulo, con actions.ts)
src/app/api/…        exportaciones Excel/PDF y plantilla de importación
src/components/      componentes reutilizables (ui/, layout/, shared/)
src/lib/             clientes Supabase, permisos, formato, informes, exportación
supabase/migrations/ esquema, seguridad y datos iniciales (fuente de verdad)
tests/               pruebas de base de datos y de navegador
```

### Seguridad (aplicada en la base de datos, no solo en la interfaz)

- **RLS activado en todas las tablas.** Todas las personas activas del equipo consultan todo; la modificación corresponde a la gestora responsable, a Dirección/Coordinación o a quien tenga «edición global» (permiso individual que se activa en Configuración → Usuarios y que no incluye pagos, autorización superior ni configuración).
- **Aprobación de presupuestos** solo mediante la función `approve_budget()`, que comprueba el límite de la gestora responsable. Un `UPDATE` directo a «aprobado» se rechaza.
- **Pagos** solo mediante `confirm_payment()`, que exige rol de Dirección o Coordinación. Una factura nunca pasa a «pagada» por aprobar el presupuesto.
- **Historial inalterable**: la tabla `activity` no admite modificación ni borrado; los cambios guardan valor anterior y nuevo. Auditoría técnica completa en `audit_log` (consultable por Dirección/Coordinación).
- **Archivos privados** (bucket `documentos`), acceso mediante enlaces temporales de 10 minutos y sin borrado.
- Registro público desactivado; altas solo por invitación. La clave de servicio solo se usa en el servidor para enviar invitaciones.

## Puesta en marcha local

Requisitos: Node 20.9+, Docker.

```bash
npm install
npm run db:start            # Supabase local (aplica migraciones)
npx supabase status -o env  # copie API_URL, ANON_KEY y SERVICE_ROLE_KEY a .env.local (ver .env.example)
npm run dev                 # http://localhost:3000
```

Correo de pruebas (invitaciones y recuperación): http://127.0.0.1:54324

## Pruebas

```bash
npm run test:db    # 20 pruebas de permisos y flujo contra la base de datos real
npm run build && npm start
npm run test:e2e   # 11 pruebas en navegador (las 6 obligatorias del encargo, importación, invitación y móvil)
```

Las pruebas crean usuarios y datos claramente identificados como de prueba (`@prueba.local`, «Comunidad E2E…») y **solo se ejecutan contra Supabase local**.

## Despliegue en producción

1. Crear un proyecto Supabase en la región UE (recomendado por RGPD).
2. `npx supabase link --project-ref <ref>` y `npx supabase db push` para aplicar las migraciones.
3. En Supabase → Authentication:
   - Desactivar «Allow new users to sign up».
   - Site URL = URL pública de la aplicación; añadirla a Redirect URLs.
   - Copiar las plantillas de `supabase/templates/` en Email Templates (invitación y recuperación).
   - Configurar un SMTP propio (el de Supabase tiene límites muy bajos).
4. En Vercel, definir las variables de `.env.example`.
5. Dirección envía las invitaciones desde Configuración → Usuarios.
6. Copias de seguridad: activar Point-in-Time Recovery o, como mínimo, las copias diarias del plan contratado.

## Datos pendientes de facilitar

| Dato | Dónde se introduce |
|---|---|
| Comunidades y gestora responsable de cada una | Comunidades → Importar Excel (plantilla descargable) |
| Correos corporativos del equipo | Configuración → Usuarios → Invitar |
| Límites económicos de cada gestora | Configuración → Límites económicos (inicialmente «pendiente de configurar») |
| Proveedores habituales | Proveedores → Nuevo proveedor |
| Logotipo original y colores oficiales | Configuración → Datos generales |
| Documentos Word y Excel históricos | Pestaña Documentación de cada comunidad o incidencia |

## Preparado para fases futuras (no desarrollado)

Integración con Outlook/Gmail (la cronología ya distingue llamadas, correos y conversaciones), portal de propietarios, aplicación móvil nativa, resúmenes con IA y lectura automática de facturas. La estructura de documentos y actividad admite estas ampliaciones sin cambiar el modelo de datos.
