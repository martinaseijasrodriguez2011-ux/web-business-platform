---
name: crear-web
description: Crea desde cero la web completa de un negocio local (boceto para enseñar o versión final para publicar) a partir de su ficha en leads/ o de los datos que aporte el usuario. Usar cuando pida hacer, diseñar o maquetar la web de un cliente o negocio.
---

# Crear la web de un negocio

## Entrada
- `/crear-web 3` → negocio nº 3 de la lista de hoy (`leads/<hoy>.md`). Con otra fecha: `/crear-web 2026-11-18 3`.
- O datos libres del cliente (nombre, actividad, dirección, teléfono, servicios, fotos).

## Proceso
1. Localiza la ficha y su bloque «Prompt para crear su web». Ese prompt es la especificación: síguelo íntegramente.
2. Si está instalada la skill `frontend-design`, aplícala. Si no, decide antes de escribir código: una dirección estética concreta para este negocio (tipografía de Google Fonts con carácter, paleta de 3-4 colores, un recurso visual distintivo). Evita el aspecto genérico (degradados morados, Inter por defecto, tarjetas idénticas).
3. Escribe `clientes/<slug-del-negocio>/index.html` (un único archivo autocontenido).
4. Verifica con Playwright (Chromium está preinstalado): captura a 390px y a 1440px, comprueba que no hay errores de consola, desbordamiento horizontal ni enlaces vacíos. Corrige y repite.
5. No inventes precios, opiniones, años de experiencia ni premios: deja `[PENDIENTE: ...]` visible.
6. Entrega: ruta del archivo, capturas, y lista de datos que hay que pedir al cliente.

## Publicación (cuando el cliente acepte)
- Netlify Drop, Cloudflare Pages o GitHub Pages. Dominio registrado a nombre del cliente.
- Completa aviso legal, privacidad y cookies con los datos reales del titular antes de publicar.
