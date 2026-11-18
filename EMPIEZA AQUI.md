# Cómo usar el sistema

## Una sola vez

1. Instala Python (gratis): https://www.python.org/downloads/
   En Windows, marca la casilla «Add Python to PATH» al instalar.
2. Descomprime esta carpeta donde quieras (por ejemplo, en Documentos).

## Cada día

1. Doble clic en «Generar lista (Windows).bat» o «Generar lista (Mac).command».
   En Mac, la primera vez: clic derecho > Abrir > Abrir.
2. Se abre en el navegador la lista de 20 negocios sin web. En cada uno tienes:
   - botón WhatsApp: abre el chat con el mensaje ya escrito, solo tienes que enviarlo;
   - Llamar, Instagram, Mapa;
   - «¿Web?»: compruébalo siempre antes de escribir;
   - Mensaje para Instagram y Prompt para crear su web, con botón Copiar;
   - casilla «Contactado» para ir marcando.
3. La lista se guarda en la carpeta `leads`. Pásatela al móvil si quieres usarla desde allí
   (por ejemplo, enviándotela por WhatsApp o guardándola en Google Drive).

Cada día busca en 3 ciudades distintas de tu lista y nunca repite un negocio.

## Crear la web de un negocio

Opción fácil: en claude.ai, pega el «Prompt para crear su web» de ese negocio. Claude te
devuelve la web completa. Guárdala como `index.html` y ábrela en el navegador para verla.

Opción avanzada: con Claude Code abierto en esta carpeta, escribe `/crear-web 3` (número del
negocio en la lista de hoy). Hace la web y la revisa en móvil y ordenador.

Para publicarla gratis: https://app.netlify.com/drop (arrastras la carpeta con el index.html).
El dominio (www.nombredelnegocio.com) lo compra el cliente a su nombre, unos 10-15 € al año.

## Precios

- Web sencilla (una página): 200 €
- Web completa (varias secciones, carta o catálogo): 250-500 €
- Mantenimiento opcional: 20 €/mes

Cobra la mitad al empezar y la otra mitad al entregar.

## Cambiar ajustes

Abre `config.json` con el Bloc de notas:
- `ciudades`: añade o quita ciudades (nombre oficial, como aparece en el mapa).
- `ciudades_por_dia`: en cuántas ciudades busca cada día.
- `leads_por_dia`: cuántos negocios quieres al día.
- `remitente`: tu nombre, marca y precios.

## Importante

- Un solo mensaje por negocio. Si no contesta, no insistas; si dice que no, márcalo y no
  vuelvas a escribir. Enviar muchos mensajes comerciales sin permiso puede acarrear multas
  (LSSI) y que WhatsApp o Instagram bloqueen tu cuenta. Más detalle en `docs/aspectos-legales.md`.
- Lo que mejor funciona: hacer la web de muestra antes y enseñársela en persona o mandarle
  una captura cuando conteste.
