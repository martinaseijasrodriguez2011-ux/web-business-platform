---
name: propuesta-cliente
description: Redacta el presupuesto, las condiciones del servicio y los mensajes de seguimiento para un negocio interesado en una web. Usar cuando un cliente potencial haya respondido o pida precio.
---

# Propuesta para un cliente interesado

1. Datos del negocio: ficha de `leads/` o los que dé el usuario. Datos del remitente y precios: `config.json` (remitente.precios): web sencilla de una página, web completa con varias secciones o carta/catálogo, y mantenimiento mensual opcional. Elige la tarifa según lo que necesite el negocio y ofrece siempre el mantenimiento.
2. Redacta en castellano, tono profesional y cercano, sin negritas:
   - Presupuesto: alcance (secciones), plazo, precio con IVA desglosado, forma de pago (50 % al inicio, 50 % a la entrega), qué aporta el cliente (fotos, textos, precios), número de rondas de cambios incluidas.
   - Condiciones: el dominio se registra a nombre del cliente; propiedad del código tras el pago; mantenimiento opcional mensual y qué incluye; cancelación; encargo de tratamiento si hay formularios.
   - Mensaje corto de WhatsApp para enviar el presupuesto.
3. Guarda en `clientes/<slug>/propuesta.md`.
4. Actualiza el estado en `data/historial.csv` (pendiente / contactado / interesado / no_interesa / cliente).
5. No fijes precios distintos de los de config.json sin indicarlo al usuario.
