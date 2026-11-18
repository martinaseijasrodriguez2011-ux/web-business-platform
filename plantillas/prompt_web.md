# Plantilla del prompt para crear la web

El script rellena automáticamente las variables `{{...}}` para cada negocio. Puede editar
el texto a partir de la marca de inicio; los cambios se aplicarán a las listas siguientes.

<!-- INICIO PROMPT -->
Actúa como diseñador web y desarrollador front-end sénior especializado en negocios locales de España.

Crea la web de este negocio:

- Nombre: {{NOMBRE}}
- Actividad: {{CATEGORIA}}
- Ciudad: {{CIUDAD}}
- Dirección: {{DIRECCION}}
- Coordenadas: {{COORDENADAS}}
- Teléfono: {{TELEFONO}}
- WhatsApp: {{WHATSAPP}}
- Horario: {{HORARIO}}
- Instagram: {{INSTAGRAM}}

Objetivo de la web: {{OBJETIVO}}.

Secciones: {{SECCIONES}}.
Estilo visual: {{ESTILO}}. Debe parecer hecha a medida para este negocio, no una plantilla genérica.

Requisitos técnicos:
1. Un único archivo index.html con CSS y JavaScript integrados, sin dependencias de pago. Solo Google Fonts como recurso externo.
2. Diseño mobile-first, 100 % adaptable. Botón flotante de WhatsApp y botón de llamada visibles siempre en móvil.
3. SEO local: etiqueta title y meta description con actividad + ciudad, un solo h1, datos estructurados JSON-LD de tipo LocalBusiness (o el subtipo adecuado) con nombre, dirección, teléfono, horario y coordenadas, y etiquetas Open Graph.
4. Mapa de Google Maps incrustado con la dirección y enlace «Cómo llegar».
5. Rendimiento: imágenes con loading="lazy", sin librerías pesadas, objetivo de 90+ en PageSpeed móvil.
6. Accesibilidad: contraste suficiente, textos alternativos, navegación por teclado.
7. Pie con enlaces a Aviso legal, Política de privacidad y Política de cookies (incluye las tres páginas como secciones o modales con texto base adaptado a la LSSI y al RGPD, con los datos del titular marcados como [PENDIENTE]).
8. Si no hay cookies de terceros salvo el mapa, carga el mapa solo tras aceptación o con un aviso.
9. Idioma: castellano. Añade un selector para versión en catalán con los textos traducidos.

Contenido:
- Redacta textos naturales, cercanos y orientados a que el visitante contacte.
- No inventes precios, opiniones de clientes, años de experiencia, premios ni datos que no figuren arriba. Donde falten, deja un marcador visible tipo [PENDIENTE: precio] para completarlo con el cliente.
- Usa imágenes de marcador de posición (por ejemplo, de Unsplash con temática coherente) indicando en un comentario HTML qué foto real debe sustituir a cada una.

Al terminar, entrega el código completo y una lista breve de los datos que hay que pedir al cliente para publicarla.

Pie de la web: «Web diseñada por {{MARCA}}».
