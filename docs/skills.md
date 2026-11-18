# Skills recomendadas para crear webs desde cero con Claude

Una skill es un paquete de instrucciones que Claude carga cuando la tarea lo requiere. Hay dos
tipos útiles para este negocio: las públicas de Anthropic y las propias de este repositorio.

## Skills propias incluidas en este repositorio (.claude/skills)

| Skill | Para qué sirve | Cómo se usa en Claude Code |
|---|---|---|
| leads-diarios | Genera la lista del día con los 20 negocios, mensajes y prompts | `/leads-diarios` |
| crear-web | Construye la web completa de un cliente a partir de su ficha, la revisa y la deja lista para publicar | `/crear-web 3` (número del negocio en la lista de hoy) |
| propuesta-cliente | Redacta presupuesto, condiciones y seguimiento para un negocio interesado | `/propuesta-cliente Peluquería Ana` |

Se cargan solas al abrir este repositorio en Claude Code.

## Skills públicas de Anthropic recomendadas

Repositorio oficial: github.com/anthropics/skills (comprobar nombres vigentes, pueden cambiar).

| Skill | Utilidad |
|---|---|
| frontend-design | La más importante: evita el aspecto de «web hecha por IA» y fuerza decisiones de diseño con personalidad (tipografía, color, composición). |
| webapp-testing | Prueba la web con Playwright: capturas en móvil y escritorio, enlaces rotos, errores de consola. |
| web-artifacts-builder | Para webs más complejas con React y Tailwind. |
| theme-factory | Genera paletas y temas coherentes; útil para presentar 2-3 estilos al cliente. |
| brand-guidelines (adaptada) | Le sirve de modelo para crear una guía de marca de su propio negocio. |

Instalación en Claude Code: `/plugin marketplace add anthropics/skills` y después instalar las
que necesite desde `/plugin`.

## Flujo de trabajo recomendado

1. Cada mañana la lista se genera sola (GitHub Actions) en la carpeta `leads/`.
2. Verifica en Google que el negocio no tiene web (OpenStreetMap no siempre está al día).
3. Antes de contactar, crea el boceto con `/crear-web N`: tarda minutos y es lo que convence.
4. Contacta (preferiblemente en persona, ver aspectos-legales.md) enseñando el boceto.
5. Si le interesa, `/propuesta-cliente` y anota el estado en `data/historial.csv`.
6. Publicación: Netlify, Cloudflare Pages o GitHub Pages (gratis) + dominio del cliente a su
   nombre (unos 10-15 €/año).

## Precios orientativos de mercado (España, a verificar en su zona)

- Web de una página para comercio local: 250-500 €.
- Web de varias secciones con catálogo o carta: 500-1.200 €.
- Mantenimiento (cambios, hosting, dominio): 15-40 €/mes. Es lo que da ingresos recurrentes.
