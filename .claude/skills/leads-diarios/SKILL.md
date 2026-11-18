---
name: leads-diarios
description: Genera la lista diaria de 20 negocios locales sin web (de todos los sectores) con teléfono, enlace de WhatsApp con mensaje ya redactado, búsqueda de Instagram, mensaje para Instagram y prompt para crear su web. Usar cuando el usuario pida los negocios del día, la lista de clientes o prospectos.
---

# Lista diaria de negocios sin web

1. Si ya existe `leads/<fecha de hoy>.md` (lo genera GitHub Actions cada mañana), muéstraselo al usuario con el resumen de la tabla inicial.
2. Si no existe, ejecuta `python3 prospeccion/buscar_negocios.py` (acepta `--ciudad X` y `--cantidad N`).
   Si la red bloquea Overpass, indica al usuario que lance el workflow «Leads diarios» desde la pestaña Actions de GitHub.
3. Revisa que `config.json` tenga los datos reales del remitente; si contiene «TU NOMBRE», avisa antes de usar los mensajes.
4. Recuerda brevemente: verificar en Google que no tienen web y respetar docs/aspectos-legales.md (un solo mensaje, sin insistir, preferible la visita presencial).
5. No inventes negocios, teléfonos ni cuentas de Instagram: todo dato procede del script.
