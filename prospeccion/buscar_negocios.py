#!/usr/bin/env python3
"""
Genera la lista diaria de negocios sin web a partir de OpenStreetMap (Overpass API).

Para cada negocio produce: datos de contacto, enlace directo de WhatsApp con el
mensaje ya escrito, búsqueda de su Instagram, mensaje para Instagram y el prompt
para generar su web con Claude.

Uso:
    python3 prospeccion/buscar_negocios.py                # lista de hoy
    python3 prospeccion/buscar_negocios.py --ciudad Terrassa --cantidad 30
    python3 prospeccion/buscar_negocios.py --desde-json datos.json   # pruebas sin red

Solo usa la biblioteca estándar de Python 3.9+.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import random
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
HISTORIAL = RAIZ / "data" / "historial.csv"
CARPETA_LEADS = RAIZ / "leads"
PLANTILLA_PROMPT = RAIZ / "plantillas" / "prompt_web.md"

SERVIDORES_OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

# (clave OSM, valor OSM) -> (nombre legible, grupo comercial)
CATEGORIAS: dict[tuple[str, str], tuple[str, str]] = {
    ("amenity", "restaurant"): ("Restaurante", "hosteleria"),
    ("amenity", "cafe"): ("Cafetería", "hosteleria"),
    ("amenity", "bar"): ("Bar", "hosteleria"),
    ("amenity", "fast_food"): ("Comida para llevar", "hosteleria"),
    ("amenity", "ice_cream"): ("Heladería", "hosteleria"),
    ("shop", "bakery"): ("Panadería", "alimentacion"),
    ("shop", "pastry"): ("Pastelería", "alimentacion"),
    ("shop", "confectionery"): ("Pastelería / dulces", "alimentacion"),
    ("shop", "butcher"): ("Carnicería", "alimentacion"),
    ("shop", "seafood"): ("Pescadería", "alimentacion"),
    ("shop", "greengrocer"): ("Frutería", "alimentacion"),
    ("shop", "deli"): ("Charcutería / delicatessen", "alimentacion"),
    ("shop", "hairdresser"): ("Peluquería", "belleza"),
    ("shop", "beauty"): ("Centro de estética", "belleza"),
    ("shop", "cosmetics"): ("Perfumería / cosmética", "belleza"),
    ("shop", "tattoo"): ("Estudio de tatuajes", "belleza"),
    ("shop", "massage"): ("Masajes", "belleza"),
    ("shop", "clothes"): ("Tienda de ropa", "comercio"),
    ("shop", "shoes"): ("Zapatería", "comercio"),
    ("shop", "jewelry"): ("Joyería", "comercio"),
    ("shop", "florist"): ("Floristería", "comercio"),
    ("shop", "gift"): ("Tienda de regalos", "comercio"),
    ("shop", "toys"): ("Juguetería", "comercio"),
    ("shop", "books"): ("Librería", "comercio"),
    ("shop", "pet"): ("Tienda de animales", "comercio"),
    ("shop", "hardware"): ("Ferretería", "comercio"),
    ("shop", "furniture"): ("Tienda de muebles", "comercio"),
    ("shop", "interior_decoration"): ("Decoración", "comercio"),
    ("shop", "mobile_phone"): ("Telefonía / reparación móviles", "comercio"),
    ("shop", "computer"): ("Informática", "comercio"),
    ("shop", "optician"): ("Óptica", "salud"),
    ("shop", "bicycle"): ("Tienda / taller de bicicletas", "oficios"),
    ("shop", "car_repair"): ("Taller mecánico", "oficios"),
    ("shop", "tyres"): ("Neumáticos", "oficios"),
    ("shop", "laundry"): ("Lavandería", "servicios"),
    ("shop", "dry_cleaning"): ("Tintorería", "servicios"),
    ("shop", "locksmith"): ("Cerrajería", "oficios"),
    ("craft", "electrician"): ("Electricista", "oficios"),
    ("craft", "plumber"): ("Fontanero", "oficios"),
    ("craft", "carpenter"): ("Carpintería", "oficios"),
    ("craft", "painter"): ("Pintor", "oficios"),
    ("craft", "locksmith"): ("Cerrajería", "oficios"),
    ("craft", "tailor"): ("Sastrería / arreglos", "oficios"),
    ("craft", "shoemaker"): ("Zapatero / reparación calzado", "oficios"),
    ("craft", "photographer"): ("Fotógrafo", "servicios"),
    ("craft", "hvac"): ("Climatización", "oficios"),
    ("amenity", "dentist"): ("Clínica dental", "salud"),
    ("amenity", "veterinary"): ("Veterinario", "salud"),
    ("amenity", "driving_school"): ("Autoescuela", "servicios"),
    ("healthcare", "physiotherapist"): ("Fisioterapia", "salud"),
    ("healthcare", "podiatrist"): ("Podología", "salud"),
    ("healthcare", "psychotherapist"): ("Psicología", "salud"),
    ("leisure", "fitness_centre"): ("Gimnasio", "servicios"),
    ("office", "accountant"): ("Gestoría / asesoría", "servicios"),
    ("office", "estate_agent"): ("Inmobiliaria", "servicios"),
    ("office", "insurance"): ("Seguros", "servicios"),
    ("tourism", "guest_house"): ("Alojamiento / pensión", "hosteleria"),
}

# Argumento de venta y secciones sugeridas por grupo.
GRUPOS = {
    "hosteleria": {
        "gancho": "que los clientes que le buscan en Google vean la carta, el horario y puedan reservar o pedir por WhatsApp",
        "secciones": "Inicio con foto destacada, Carta/Menú (por categorías, con precios a confirmar), Horario, Reservas por WhatsApp, Galería, Cómo llegar (mapa), Contacto",
        "estilo": "cálido y apetecible, fotografía protagonista, tipografía con carácter",
    },
    "alimentacion": {
        "gancho": "que la gente del barrio encuentre sus productos, el horario y pueda hacer encargos por WhatsApp",
        "secciones": "Inicio, Productos destacados, Encargos por WhatsApp, Horario, Sobre nosotros (tradición/oficio), Cómo llegar, Contacto",
        "estilo": "artesanal y cercano, colores naturales, sensación de producto fresco",
    },
    "belleza": {
        "gancho": "que las clientas y clientes vean sus servicios y precios y pidan cita directamente por WhatsApp",
        "secciones": "Inicio, Servicios con precios orientativos, Pedir cita (WhatsApp), Galería de trabajos, Equipo, Opiniones (solo si el cliente las aporta), Cómo llegar, Contacto",
        "estilo": "elegante y limpio, mucho espacio en blanco, paleta suave",
    },
    "comercio": {
        "gancho": "aparecer en Google cuando alguien de la zona busca lo que usted vende y que le escriban por WhatsApp",
        "secciones": "Inicio, Productos/Marcas, Novedades, Horario, Sobre la tienda, Cómo llegar, Contacto por WhatsApp",
        "estilo": "moderno y comercial, imágenes de producto grandes, llamadas a la acción claras",
    },
    "oficios": {
        "gancho": "que cuando alguien busque un profesional de su sector en la zona le encuentre a usted y le pida presupuesto por WhatsApp",
        "secciones": "Inicio con botón 'Pedir presupuesto', Servicios, Zonas de trabajo, Trabajos realizados (fotos), Por qué elegirnos, Contacto/WhatsApp",
        "estilo": "profesional y de confianza, colores sólidos, iconos claros, botón de llamada siempre visible en móvil",
    },
    "salud": {
        "gancho": "transmitir confianza, explicar sus tratamientos y facilitar que los pacientes pidan cita",
        "secciones": "Inicio, Tratamientos/Servicios, Equipo profesional (con nº de colegiado si procede), Pedir cita, Instalaciones, Cómo llegar, Contacto",
        "estilo": "sanitario, limpio y sereno, azules/verdes suaves, mucha claridad",
    },
    "servicios": {
        "gancho": "explicar bien sus servicios, generar confianza y recibir consultas por WhatsApp",
        "secciones": "Inicio, Servicios, Cómo trabajamos, Tarifas o 'pida presupuesto', Sobre nosotros, Preguntas frecuentes, Contacto",
        "estilo": "profesional y ordenado, sobrio, enfocado a generar confianza",
    },
}


# --------------------------------------------------------------------------- #
# Obtención de datos
# --------------------------------------------------------------------------- #
def zona(c, admin_level: str = "8") -> dict:
    """Una zona de config.json: texto («Gavà») u objeto {nombre, regex, nivel, etiqueta}."""
    if isinstance(c, str):
        c = {"nombre": c}
    nombres = [c["nombre"], *c.get("otros_nombres", [])]
    var = []
    for n in nombres:
        for v in (n, n[0].lower() + n[1:], n[0].upper() + n[1:]):
            v = v.replace('"', '\\"')
            if v not in var:
                var.append(v)
    if False:
        return {"nombre": c, "regex": re.escape(c).replace("\\ ", " "), "nivel": admin_level, "etiqueta": c}
    return {"nombre": c["nombre"], "variantes": var, "regex": "",
            "nivel": str(c.get("nivel", admin_level)), "etiqueta": c.get("etiqueta", c["nombre"])}


def construir_consulta(ciudad, admin_level: str) -> str:
    z = zona(ciudad, admin_level)
    por_clave: dict[str, list[str]] = {}
    for clave, valor in CATEGORIAS:
        por_clave.setdefault(clave, []).append(valor)
    sin_web = '[!"website"][!"contact:website"][!"url"][!"brand"]'
    bloques = []
    for clave, valores in por_clave.items():
        regex = "|".join(sorted(set(valores)))
        bloques.append(f'  nwr(area.a)["{clave}"~"^({regex})$"]["name"]{sin_web};')
    ciudad_escapada = z["regex"].replace("\\", "\\\\").replace('"', '\\"')
    return (
        "[out:json][timeout:180];\n"
        "(" + "".join(f'area["name"="{n}"]["boundary"="administrative"]["admin_level"="{z["nivel"]}"];' for n in z["variantes"]) + ")->.a;\n"
        "(\n" + "\n".join(bloques) + "\n);\n"
        "out center meta;"
    )


def descargar_overpass(consulta: str) -> dict:
    datos = urllib.parse.urlencode({"data": consulta}).encode()
    ultimo_error = None
    for url in SERVIDORES_OVERPASS:
        for intento in range(2):
            try:
                req = urllib.request.Request(url, data=datos, headers={"User-Agent": "leads-web-locales/1.0"})
                with urllib.request.urlopen(req, timeout=200) as r:
                    return json.loads(r.read().decode("utf-8"))
            except Exception as e:  # noqa: BLE001
                ultimo_error = e
                time.sleep(5 * (intento + 1))
    raise RuntimeError(f"No se pudo consultar Overpass: {ultimo_error}")


# --------------------------------------------------------------------------- #
# Tratamiento
# --------------------------------------------------------------------------- #
def normalizar_telefonos(tags: dict) -> list[str]:
    crudos = []
    for k in ("contact:mobile", "mobile", "phone", "contact:phone", "contact:whatsapp"):
        if tags.get(k):
            crudos += re.split(r"[;,/]", tags[k])
    resultado = []
    for t in crudos:
        d = re.sub(r"\D", "", t)
        if d.startswith("0034"):
            d = d[4:]
        elif d.startswith("34") and len(d) == 11:
            d = d[2:]
        if (MOVIL.match(d) or (not SOLO_MOVIL and FIJO.match(d))) and d not in resultado:
            resultado.append(d)
    # móviles primero
    return sorted(resultado, key=lambda x: not MOVIL.match(x))


# Móviles: 6xx y 71x-74x. Fijos geográficos: 81x-88x y 91x-98x. Se descartan 70x, 80x y 90x.
MOVIL = re.compile(r"^(6\d{8}|7[1-4]\d{7})$")
FIJO = re.compile(r"^(8[1-8]|9[1-8])\d{7}$")
SOLO_MOVIL = True
ANTIGUEDAD_MAX = 5


def cerrado(t: dict) -> bool:
    return (t.get("opening_hours") in ("closed", "off") or t.get("disused") == "yes" or t.get("abandoned") == "yes"
            or bool(t.get("end_date") or t.get("disused:shop") or t.get("was:shop")))


def fecha_dato(el: dict) -> str:
    t = el.get("tags", {})
    c = t.get("check_date") or t.get("survey:date") or ""
    ts = (el.get("timestamp") or "")[:10]
    return max(c, ts)


def es_movil(tel: str) -> bool:
    return bool(MOVIL.match(tel))


def formatear_tel(tel: str) -> str:
    return f"+34 {tel[:3]} {tel[3:6]} {tel[6:]}"


def direccion(tags: dict) -> str:
    calle = tags.get("addr:street", "")
    num = tags.get("addr:housenumber", "")
    cp = tags.get("addr:postcode", "")
    ciudad = tags.get("addr:city", "")
    partes = [f"{calle} {num}".strip(), f"{cp} {ciudad}".strip()]
    return ", ".join(p for p in partes if p) or "(sin dirección en OSM: verificar)"


def instagram(tags: dict) -> str:
    v = tags.get("contact:instagram") or tags.get("instagram") or ""
    if not v:
        return ""
    v = v.strip().rstrip("/")
    if v.startswith("http"):
        return v
    return "https://www.instagram.com/" + v.lstrip("@")


def categoria_de(tags: dict) -> tuple[str, str] | None:
    for (k, v), info in CATEGORIAS.items():
        if tags.get(k) == v:
            return info
    return None


def extraer_negocios(osm: dict, ciudad: str) -> list[dict]:
    negocios = []
    for el in osm.get("elements", []):
        tags = el.get("tags", {})
        cat = categoria_de(tags)
        if not cat or cerrado(tags):
            continue
        tels = normalizar_telefonos(tags)
        if not tels:
            continue
        fd = fecha_dato(el)
        if fd and int(fd[:4]) < dt.date.today().year - ANTIGUEDAD_MAX:
            continue
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        negocios.append({
            "id": f"{el['type']}/{el['id']}",
            "nombre": tags["name"].strip(),
            "categoria": cat[0],
            "grupo": cat[1],
            "ciudad": ciudad,
            "direccion": direccion(tags),
            "telefono": tels[0],
            "movil": es_movil(tels[0]),
            "otros_telefonos": tels[1:],
            "instagram": instagram(tags),
            "facebook": tags.get("contact:facebook", ""),
            "horario": tags.get("opening_hours", ""),
            "lat": lat,
            "lon": lon,
        })
    return negocios


def cargar_historial() -> set[str]:
    if not HISTORIAL.exists():
        return set()
    with HISTORIAL.open(encoding="utf-8") as f:
        return {fila["id"] for fila in csv.DictReader(f)}


def guardar_historial(seleccion: list[dict], fecha: str) -> None:
    HISTORIAL.parent.mkdir(parents=True, exist_ok=True)
    nuevo = not HISTORIAL.exists()
    with HISTORIAL.open("a", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        if nuevo:
            w.writerow(["id", "fecha", "nombre", "categoria", "ciudad", "telefono", "estado", "notas"])
        for n in seleccion:
            w.writerow([n["id"], fecha, n["nombre"], n["categoria"], n["ciudad"], n["telefono"], "pendiente", ""])


def seleccionar(negocios: list[dict], ya_vistos: set[str], cantidad: int, max_cat: int,
                solo_movil: bool, semilla: str) -> list[dict]:
    """Reparto por turnos entre categorías para que cada día haya variedad."""
    rnd = random.Random(semilla)
    candidatos = [n for n in negocios if n["id"] not in ya_vistos and (n["movil"] or not solo_movil)]
    por_cat: dict[str, list[dict]] = {}
    for n in candidatos:
        por_cat.setdefault(n["categoria"], []).append(n)
    for lista in por_cat.values():
        rnd.shuffle(lista)
        lista.sort(key=lambda n: not n["movil"])  # con WhatsApp primero
    orden = list(por_cat)
    rnd.shuffle(orden)
    seleccion: list[dict] = []
    ronda = 0
    while len(seleccion) < cantidad and ronda < max_cat:
        for cat in orden:
            if len(por_cat[cat]) > ronda and len(seleccion) < cantidad:
                seleccion.append(por_cat[cat][ronda])
        ronda += 1
    return seleccion


# --------------------------------------------------------------------------- #
# Textos
# --------------------------------------------------------------------------- #
def mensaje_whatsapp(n: dict, r: dict) -> str:
    g = GRUPOS[n["grupo"]]
    return (
        f"Hola, buenos días. Soy {r['nombre']}{', de ' + r['marca'] if r.get('marca') else ''}; hago páginas web para negocios de {n['ciudad']}. "
        f"He visto {n['nombre']} en el mapa y no he encontrado su web. "
        f"Le escribo por si le interesa tener una sencilla y profesional para {g['gancho']}. "
        f"Si quiere, le preparo un boceto sin compromiso para que lo vea antes de decidir nada. "
        f"Si no le interesa, dígamelo y no le vuelvo a escribir. Gracias y disculpe la molestia."
    )


def mensaje_instagram(n: dict, r: dict) -> str:
    return (
        f"Hola, soy {r['nombre']}{' (' + r['marca'] + ')' if r.get('marca') else ''}. Hago webs para negocios de {n['ciudad']} y he visto que "
        f"{n['nombre']} no tiene página web. ¿Le preparo un boceto gratuito y sin compromiso para que lo vea? "
        f"Si no le interesa, no le escribo más. ¡Gracias!"
    )


def prompt_web(n: dict, r: dict, plantilla: str) -> str:
    g = GRUPOS[n["grupo"]]
    tel = formatear_tel(n["telefono"])
    wa = f"https://wa.me/34{n['telefono']}" if n["movil"] else "(no consta móvil: usar botón de llamada)"
    valores = {
        "NOMBRE": n["nombre"],
        "CATEGORIA": n["categoria"],
        "CIUDAD": n["ciudad"],
        "DIRECCION": n["direccion"],
        "TELEFONO": tel,
        "WHATSAPP": wa,
        "HORARIO": n["horario"] or "(pendiente de confirmar con el cliente)",
        "INSTAGRAM": n["instagram"] or "(no consta)",
        "SECCIONES": g["secciones"],
        "ESTILO": g["estilo"],
        "OBJETIVO": g["gancho"],
        "COORDENADAS": f"{n['lat']},{n['lon']}" if n["lat"] else "(no constan)",
        "MARCA": r.get("marca") or r["nombre"],
    }
    texto = plantilla
    for k, v in valores.items():
        texto = texto.replace("{{" + k + "}}", str(v))
    return texto


def q(s: str) -> str:
    return urllib.parse.quote(s)


def escribir_salida(seleccion: list[dict], r: dict, fecha: str) -> tuple[Path, Path]:
    CARPETA_LEADS.mkdir(exist_ok=True)
    plantilla = PLANTILLA_PROMPT.read_text(encoding="utf-8").split("<!-- INICIO PROMPT -->", 1)[-1].strip()
    md, csv_path = CARPETA_LEADS / f"{fecha}.md", CARPETA_LEADS / f"{fecha}.csv"

    lineas = [
        f"# Negocios sin web — {fecha}",
        "",
        f"{len(seleccion)} negocios. Antes de contactar: abra «Verificar en Google» y confirme que de verdad no tienen web.",
        "Lea docs/aspectos-legales.md antes de enviar mensajes. Anote el resultado en data/historial.csv.",
        "",
        "| # | Negocio | Tipo | Teléfono | WhatsApp |",
        "|---|---|---|---|---|",
    ]
    for i, n in enumerate(seleccion, 1):
        lineas.append(f"| {i} | {n['nombre']} | {n['categoria']} | {formatear_tel(n['telefono'])} | {'sí' if n['movil'] else 'no (fijo)'} |")
    lineas.append("")

    filas_csv = []
    for i, n in enumerate(seleccion, 1):
        msg_wa = mensaje_whatsapp(n, r)
        msg_ig = mensaje_instagram(n, r)
        enlace_wa = f"https://wa.me/34{n['telefono']}?text={q(msg_wa)}" if n["movil"] else ""
        busca_ig = n["instagram"] or f"https://www.google.com/search?q={q('site:instagram.com ' + n['nombre'] + ' ' + n['ciudad'])}"
        verificar = f"https://www.google.com/search?q={q(n['nombre'] + ' ' + n['ciudad'])}"
        mapa = f"https://www.google.com/maps/search/?api=1&query={q(n['nombre'] + ' ' + n['ciudad'])}"
        otros = ", ".join(formatear_tel(t) for t in n["otros_telefonos"])

        lineas += [
            "---",
            "",
            f"## {i}. {n['nombre']} — {n['categoria']}",
            "",
            f"- Dirección: {n['direccion']}",
            f"- Teléfono: {formatear_tel(n['telefono'])} ({'móvil' if n['movil'] else 'fijo'})" + (f" · Otros: {otros}" if otros else ""),
            f"- Llamar: tel:+34{n['telefono']}",
            f"- WhatsApp (mensaje ya escrito): {enlace_wa or 'no disponible (número fijo); mejor llamada o visita'}",
            f"- Instagram: {busca_ig}" + ("" if n["instagram"] else " (búsqueda: confirme que la cuenta es la suya)"),
            *( [f"- Facebook: {n['facebook']}"] if n["facebook"] else [] ),
            f"- Verificar en Google: {verificar}",
            f"- Google Maps: {mapa}",
            *( [f"- Horario (OSM): {n['horario']}"] if n["horario"] else [] ),
            "",
            "Mensaje WhatsApp:",
            "",
            "```text",
            msg_wa,
            "```",
            "",
            "Mensaje Instagram:",
            "",
            "```text",
            msg_ig,
            "```",
            "",
            "<details><summary>Prompt para crear su web con Claude</summary>",
            "",
            "```text",
            prompt_web(n, r, plantilla),
            "```",
            "",
            "</details>",
            "",
        ]
        filas_csv.append([i, n["nombre"], n["categoria"], n["direccion"], formatear_tel(n["telefono"]),
                          "sí" if n["movil"] else "no", enlace_wa, busca_ig, verificar, n["id"]])

    md.write_text("\n".join(lineas), encoding="utf-8")
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["n", "nombre", "categoria", "direccion", "telefono", "movil", "whatsapp", "instagram", "verificar", "osm_id"])
        w.writerows(filas_csv)
    return md, csv_path


def escribir_html(seleccion: list[dict], r: dict, fecha: str) -> Path:
    """Página visual para el móvil y el ordenador: resumen, filtros, botones y textos para copiar."""
    import html as H
    plantilla = PLANTILLA_PROMPT.read_text(encoding="utf-8").split("<!-- INICIO PROMPT -->", 1)[-1].strip()
    estilo_grupo = {  # icono, nombre, color claro, color oscuro
        "hosteleria": ("🍽️", "Hostelería", "#e4572e", "#ff8a65"),
        "alimentacion": ("🥖", "Alimentación", "#d9a21b", "#f2c14e"),
        "belleza": ("💇", "Belleza", "#c23b8e", "#f07cc4"),
        "comercio": ("🛍️", "Comercio", "#3a6ea5", "#7fb0e6"),
        "oficios": ("🔧", "Oficios", "#5b6b2f", "#a9c25a"),
        "salud": ("🩺", "Salud", "#1b998b", "#4fd1c1"),
        "servicios": ("💼", "Servicios", "#6a4c93", "#a98bd6"),
    }
    dias = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
             "septiembre", "octubre", "noviembre", "diciembre"]
    d = dt.date.fromisoformat(fecha)
    fecha_txt = f"{dias[d.weekday()]}, {d.day} de {meses[d.month - 1]}"
    ciudades = sorted({n["ciudad"] for n in seleccion})
    con_wa = sum(1 for n in seleccion if n["movil"])
    grupos_presentes = [g for g in estilo_grupo if any(n["grupo"] == g for n in seleccion)]

    filtros = ['<button class="f on" data-f="todos">Todos</button>']
    for g in grupos_presentes:
        ic, nom, _, _ = estilo_grupo[g]
        cnt = sum(1 for n in seleccion if n["grupo"] == g)
        filtros.append(f'<button class="f" data-f="{g}">{ic} {nom} <span>{cnt}</span></button>')
    if len(ciudades) > 1:
        for c in ciudades:
            filtros.append(f'<button class="f" data-f="c:{H.escape(c)}">📍 {H.escape(c)}</button>')

    tarjetas = []
    for i, n in enumerate(seleccion, 1):
        ic, nom, col, col_osc = estilo_grupo[n["grupo"]]
        msg_wa, msg_ig = mensaje_whatsapp(n, r), mensaje_instagram(n, r)
        prompt = prompt_web(n, r, plantilla)
        busca_ig = n["instagram"] or f"https://www.google.com/search?q={q('site:instagram.com ' + n['nombre'] + ' ' + n['ciudad'])}"
        verificar = f"https://www.google.com/search?q={q(n['nombre'] + ' ' + n['ciudad'])}"
        mapa = f"https://www.google.com/maps/search/?api=1&query={q(n['nombre'] + ' ' + n['direccion'] + ' ' + n['ciudad'])}"
        if n["movil"]:
            principal = (f'<a class="wa" href="https://wa.me/34{n["telefono"]}?text={q(msg_wa)}" target="_blank" rel="noopener">'
                         f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>'
                         f'Enviar WhatsApp</a>')
        else:
            principal = f'<a class="wa tel" href="tel:+34{n["telefono"]}">📞 Llamar (fijo)</a>'
        extra_ig = "" if n["instagram"] else ' title="Búsqueda: confirma que la cuenta es la suya"'
        def bloque(titulo, icono, texto, idx):
            return (f'<details><summary><span>{icono} {titulo}</span><i>›</i></summary>'
                    f'<div class="txt"><pre id="t{i}_{idx}">{H.escape(texto)}</pre>'
                    f'<button class="copy" onclick="copiar(\'t{i}_{idx}\', this)">Copiar</button></div></details>')
        horario = f'<li>🕒 {H.escape(n["horario"])}</li>' if n["horario"] else ""
        tarjetas.append(f"""
<article data-id="{H.escape(n['id'])}" data-g="{n['grupo']}" data-c="c:{H.escape(n['ciudad'])}" style="--c:{col};--cd:{col_osc}">
  <div class="top">
    <div class="ico">{ic}</div>
    <div class="tit"><span class="tag">{H.escape(n['categoria'])}</span><h2>{H.escape(n['nombre'])}</h2></div>
    <span class="n">#{i}</span>
  </div>
  <ul class="datos">
    <li>📍 {H.escape(n['direccion'])} · <b>{H.escape(n['ciudad'])}</b></li>
    <li>📱 {formatear_tel(n['telefono'])} <em>{'móvil' if n['movil'] else 'fijo'}</em></li>
    {horario}
  </ul>
  {principal}
  <div class="mini">
    <a href="tel:+34{n['telefono']}">📞<span>Llamar</span></a>
    <a href="{H.escape(busca_ig)}" target="_blank" rel="noopener"{extra_ig}>📸<span>Instagram</span></a>
    <a href="{H.escape(verificar)}" target="_blank" rel="noopener">🔎<span>¿Web?</span></a>
    <a href="{H.escape(mapa)}" target="_blank" rel="noopener">🗺️<span>Mapa</span></a>
  </div>
  {bloque('Mensaje de WhatsApp', '💬', msg_wa, 'wa')}
  {bloque('Mensaje de Instagram', '✉️', msg_ig, 'ig')}
  {bloque('Prompt para crear su web', '✨', prompt, 'web')}
  <label class="hecho"><input type="checkbox" onchange="marcar(this)"><span>Marcar como contactado</span></label>
</article>""")

    pagina = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Negocios de hoy · {fecha}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{{--bg:#f4efe8;--card:#fffdf9;--tx:#1f1b16;--mu:#776e64;--ln:#e7dfd3;--soft:#f6f1ea;--ac:#14532d;--wa:#1faa59;--hd1:#14532d;--hd2:#1f7a4d;--sh:0 1px 2px rgba(60,40,20,.06),0 8px 24px rgba(60,40,20,.07)}}
@media (prefers-color-scheme:dark){{:root{{--bg:#12110f;--card:#1c1a17;--tx:#f3eee7;--mu:#a59c90;--ln:#2e2a25;--soft:#24211d;--ac:#5fd39a;--hd1:#0f3a22;--hd2:#185c3a;--sh:0 1px 2px rgba(0,0,0,.4)}}article{{--c:var(--cd)!important}}}}
*{{box-sizing:border-box}}html{{-webkit-text-size-adjust:100%}}
body{{margin:0;background:var(--bg);color:var(--tx);font:16px/1.5 Inter,system-ui,-apple-system,sans-serif}}
.hero{{background:radial-gradient(120% 140% at 100% 0,var(--hd2),var(--hd1));color:#fff;padding:28px 16px 64px}}
.wrap{{max-width:1080px;margin:0 auto}}
.hero small{{opacity:.8;text-transform:uppercase;letter-spacing:.12em;font-size:.75rem}}
.hero h1{{font-family:Fraunces,Georgia,serif;font-size:clamp(1.9rem,6vw,3rem);line-height:1.05;margin:.25em 0 .2em}}
.hero p{{margin:0;opacity:.88;max-width:52ch}}
.stats{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:-44px}}
.st{{background:var(--card);border-radius:16px;padding:14px;box-shadow:var(--sh);border:1px solid var(--ln)}}
.st b{{display:block;font-family:Fraunces,Georgia,serif;font-size:1.8rem;line-height:1}}
.st span{{color:var(--mu);font-size:.8rem}}
.bar{{height:6px;background:var(--soft);border-radius:9px;margin-top:8px;overflow:hidden}}.bar i{{display:block;height:100%;width:0;background:var(--ac);transition:width .3s}}
.filtros{{display:flex;gap:8px;overflow-x:auto;padding:18px 0 6px;scrollbar-width:none}}.filtros::-webkit-scrollbar{{display:none}}
.f{{flex:none;border:1px solid var(--ln);background:var(--card);color:var(--tx);border-radius:999px;padding:8px 14px;font:500 .88rem Inter,sans-serif;cursor:pointer}}
.f span{{color:var(--mu);margin-left:2px}}.f.on{{background:var(--tx);color:var(--bg);border-color:var(--tx)}}.f.on span{{color:inherit;opacity:.7}}
.aviso{{font-size:.85rem;color:var(--mu);background:var(--soft);border:1px dashed var(--ln);border-radius:12px;padding:10px 14px;margin:10px 0 4px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px;padding:12px 0 40px}}
article{{background:var(--card);border:1px solid var(--ln);border-radius:20px;padding:18px;box-shadow:var(--sh);position:relative;overflow:hidden;transition:opacity .25s}}
article::before{{content:"";position:absolute;inset:0 0 auto 0;height:5px;background:var(--c)}}
article.ok{{opacity:.55}}article.ok .hecho span::after{{content:" ✓"}}article.oculto{{display:none}}
.top{{display:flex;gap:12px;align-items:center}}
.ico{{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:1.5rem;background:color-mix(in srgb,var(--c) 15%,transparent);flex:none}}
.tit{{flex:1;min-width:0}}.tag{{color:var(--c);font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}}
h2{{font-family:Fraunces,Georgia,serif;font-size:1.25rem;line-height:1.2;margin:2px 0 0;overflow-wrap:anywhere}}
.n{{color:var(--mu);font-size:.8rem;align-self:flex-start}}
.datos{{list-style:none;padding:0;margin:14px 0;font-size:.92rem;display:grid;gap:4px}}
.datos em{{font-style:normal;font-size:.75rem;background:var(--soft);border:1px solid var(--ln);border-radius:6px;padding:1px 6px;margin-left:4px;color:var(--mu)}}
.wa{{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--wa);color:#fff;text-decoration:none;font-weight:600;border-radius:14px;padding:13px;font-size:1rem}}
.wa svg{{width:20px;height:20px;fill:currentColor}}.wa.tel{{background:var(--tx);color:var(--bg)}}
.mini{{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 6px}}
.mini a{{display:flex;flex-direction:column;align-items:center;gap:2px;text-decoration:none;color:var(--tx);background:var(--soft);border:1px solid var(--ln);border-radius:12px;padding:8px 2px;font-size:1.1rem}}
.mini span{{font-size:.7rem;color:var(--mu)}}
details{{border-top:1px solid var(--ln)}}details:first-of-type{{margin-top:8px}}
summary{{list-style:none;display:flex;justify-content:space-between;align-items:center;padding:11px 2px;cursor:pointer;font-weight:500;font-size:.95rem}}
summary::-webkit-details-marker{{display:none}}summary i{{font-style:normal;color:var(--mu);transition:transform .2s;font-size:1.3rem}}
details[open] summary i{{transform:rotate(90deg)}}
.txt{{padding-bottom:12px}}
pre{{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 Inter,system-ui,sans-serif;background:var(--soft);border:1px solid var(--ln);padding:12px;border-radius:12px;margin:0 0 8px;max-height:320px;overflow:auto}}
.copy{{background:var(--ac);color:#fff;border:0;border-radius:10px;padding:9px 16px;font:600 .88rem Inter,sans-serif;cursor:pointer}}
@media (prefers-color-scheme:dark){{.copy{{color:#0b2416}}}}
.hecho{{display:flex;align-items:center;gap:8px;border-top:1px solid var(--ln);padding-top:12px;margin-top:2px;font-size:.88rem;color:var(--mu);cursor:pointer}}
.hecho input{{width:18px;height:18px;accent-color:var(--ac)}}
footer{{text-align:center;color:var(--mu);font-size:.8rem;padding:0 16px 32px}}
@media (max-width:640px){{.stats{{grid-template-columns:repeat(2,1fr)}}.grid{{grid-template-columns:1fr}}.wrap{{padding:0 16px}}.hero .wrap{{padding:0}}}}
@media (min-width:641px){{.wrap{{padding:0 24px}}.hero{{padding:40px 0 72px}}}}
</style></head><body>
<header class="hero"><div class="wrap">
  <small>{fecha_txt}</small>
  <h1>Tus {len(seleccion)} negocios de hoy</h1>
  <p>Negocios sin página web en {H.escape(', '.join(ciudades))}. Cada tarjeta trae el mensaje listo para enviar y el prompt para crear su web.</p>
</div></header>
<main class="wrap">
  <section class="stats">
    <div class="st"><b>{len(seleccion)}</b><span>negocios</span></div>
    <div class="st"><b>{con_wa}</b><span>con WhatsApp</span></div>
    <div class="st"><b>{len(grupos_presentes)}</b><span>sectores</span></div>
    <div class="st"><b id="hechos">0</b><span>contactados</span><div class="bar"><i id="prog"></i></div></div>
  </section>
  <nav class="filtros">{''.join(filtros)}</nav>
  <p class="aviso">Antes de escribir, pulsa 🔎 «¿Web?» para comprobar que no tiene. Un solo mensaje por negocio; si no contesta, no insistas.</p>
  <section class="grid">{''.join(tarjetas)}</section>
</main>
<footer>{H.escape(r.get('marca') or r['nombre'])} · datos © colaboradores de OpenStreetMap</footer>
<script>
const total={len(seleccion)};
function progreso(){{const h=document.querySelectorAll('article.ok').length;document.getElementById('hechos').textContent=h;document.getElementById('prog').style.width=(h/total*100)+'%'}}
function copiar(id,b){{const t=document.getElementById(id).innerText;const ok=()=>{{b.textContent='¡Copiado!';setTimeout(()=>b.textContent='Copiar',1500)}};
 if(navigator.clipboard){{navigator.clipboard.writeText(t).then(ok,()=>sel(id,ok))}}else sel(id,ok)}}
function sel(id,ok){{const r=document.createRange();r.selectNodeContents(document.getElementById(id));const s=getSelection();s.removeAllRanges();s.addRange(r);try{{document.execCommand('copy');ok()}}catch(e){{}}}}
function marcar(c){{const a=c.closest('article');a.classList.toggle('ok',c.checked);try{{localStorage.setItem(a.dataset.id,c.checked?'1':'')}}catch(e){{}};progreso()}}
document.querySelectorAll('article').forEach(a=>{{try{{if(localStorage.getItem(a.dataset.id)){{a.classList.add('ok');a.querySelector('.hecho input').checked=true}}}}catch(e){{}}}});progreso();
document.querySelectorAll('.f').forEach(b=>b.onclick=()=>{{document.querySelectorAll('.f').forEach(x=>x.classList.remove('on'));b.classList.add('on');const f=b.dataset.f;
 document.querySelectorAll('article').forEach(a=>a.classList.toggle('oculto',!(f==='todos'||a.dataset.g===f||a.dataset.c===f)))}});
</script></body></html>"""
    ruta = CARPETA_LEADS / f"{fecha}.html"
    ruta.write_text(pagina, encoding="utf-8")
    return ruta

def exportar_json(seleccion: list[dict], r: dict, fecha: str, carpeta: Path) -> list[Path]:
    """Un JSON por negocio con el formato que lee la app del iPad (colección «leads»)."""
    plantilla = PLANTILLA_PROMPT.read_text(encoding="utf-8").split("<!-- INICIO PROMPT -->", 1)[-1].strip()
    carpeta.mkdir(parents=True, exist_ok=True)
    rutas = []
    for i, n in enumerate(seleccion, 1):
        msg_wa = mensaje_whatsapp(n, r)
        doc = {
            "fecha": fecha, "n": i, "nombre": n["nombre"], "categoria": n["categoria"], "grupo": n["grupo"],
            "ciudad": n["ciudad"], "direccion": n["direccion"], "telefono": formatear_tel(n["telefono"]),
            "tel": "+34" + n["telefono"], "movil": n["movil"], "horario": n["horario"],
            "whatsapp": f"https://wa.me/34{n['telefono']}?text={q(msg_wa)}" if n["movil"] else "",
            "instagram": n["instagram"] or f"https://www.google.com/search?q={q('site:instagram.com ' + n['nombre'] + ' ' + n['ciudad'])}",
            "instagram_confirmado": bool(n["instagram"]),
            "verificar": f"https://www.google.com/search?q={q(n['nombre'] + ' ' + n['ciudad'])}",
            "mapa": f"https://www.google.com/maps/search/?api=1&query={q(n['nombre'] + ' ' + n['direccion'] + ' ' + n['ciudad'])}",
            "msg_wa": msg_wa, "msg_ig": mensaje_instagram(n, r), "prompt": prompt_web(n, r, plantilla),
            "estado": "pendiente", "osm_id": n["id"],
        }
        ruta = carpeta / (n["id"].replace("/", "-") + ".json")
        ruta.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        rutas.append(ruta)
    return rutas


# --------------------------------------------------------------------------- #
def main() -> int:
    global SOLO_MOVIL, ANTIGUEDAD_MAX
    cfg = json.loads((RAIZ / "config.json").read_text(encoding="utf-8"))
    SOLO_MOVIL = cfg.get("solo_con_movil", True)
    ANTIGUEDAD_MAX = cfg.get("antiguedad_max_anos", 5)
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ciudad", action="append", help="Ciudad (puede repetirse). Por defecto, las de config.json")
    ap.add_argument("--cantidad", type=int, default=cfg.get("leads_por_dia", 20))
    ap.add_argument("--fecha", default=dt.date.today().isoformat())
    ap.add_argument("--desde-json", help="Usar un JSON de Overpass guardado (pruebas sin red)")
    ap.add_argument("--no-historial", action="store_true", help="No marcar los negocios como ya entregados")
    ap.add_argument("--exportar-json", metavar="CARPETA", help="Guardar también un JSON por negocio para la app del iPad")
    ap.add_argument("--historial-desde", metavar="CARPETA", help="Excluir los negocios ya guardados en la app (JSON con campo osm_id)")
    a = ap.parse_args()

    if a.ciudad:
        ciudades = a.ciudad
    else:
        # Rotación: cada día se consultan unas pocas ciudades distintas de la lista.
        todas = cfg["ciudades"]
        n = min(cfg.get("ciudades_por_dia", 3), len(todas))
        inicio = (dt.date.fromisoformat(a.fecha).toordinal() * n) % len(todas)
        ciudades = [todas[(inicio + i) % len(todas)] for i in range(n)]
    print(f"Ciudades de hoy: {', '.join(zona(c)['etiqueta'] for c in ciudades)}", file=sys.stderr)
    negocios: list[dict] = []
    for ciudad in ciudades:
        if a.desde_json:
            osm = json.loads(Path(a.desde_json).read_text(encoding="utf-8"))
        else:
            print(f"Consultando OpenStreetMap: {ciudad}...", file=sys.stderr)
            try:
                osm = descargar_overpass(construir_consulta(ciudad, cfg.get("admin_level", "8")))
            except RuntimeError as e:
                print(f"  Error en {ciudad}, se omite: {e}", file=sys.stderr)
                continue
        encontrados = extraer_negocios(osm, zona(ciudad)["etiqueta"])
        print(f"  {zona(ciudad)['etiqueta']}: {len(encontrados)} negocios con teléfono y sin web", file=sys.stderr)
        negocios += encontrados

    print(f"Negocios con teléfono y sin web en OSM: {len(negocios)}", file=sys.stderr)
    ya_vistos = cargar_historial()
    if a.historial_desde:
        for f in Path(a.historial_desde).rglob("*.json"):
            try:
                d = json.loads(f.read_text(encoding="utf-8"))
                ya_vistos.add(d.get("osm_id") or d.get("data", {}).get("osm_id", ""))
            except Exception:  # noqa: BLE001
                pass
        print(f"Negocios ya entregados (app + historial): {len(ya_vistos)}", file=sys.stderr)
    seleccion = seleccionar(negocios, ya_vistos, a.cantidad, cfg.get("max_por_categoria", 3),
                            cfg.get("solo_con_movil", False), a.fecha)
    if not seleccion:
        print("No quedan negocios nuevos. Añada otra ciudad en config.json.", file=sys.stderr)
        return 1
    md, csv_path = escribir_salida(seleccion, cfg["remitente"], a.fecha)
    html_path = escribir_html(seleccion, cfg["remitente"], a.fecha)
    if a.exportar_json:
        rutas = exportar_json(seleccion, cfg["remitente"], a.fecha, Path(a.exportar_json))
        print(f"JSON para la app: {len(rutas)} archivos en {a.exportar_json}", file=sys.stderr)
    if not a.no_historial:
        guardar_historial(seleccion, a.fecha)
    print(f"{len(seleccion)} negocios -> {html_path.relative_to(RAIZ)}, {md.relative_to(RAIZ)} y {csv_path.relative_to(RAIZ)}", file=sys.stderr)
    if len(seleccion) < a.cantidad:
        print(f"Aviso: solo había {len(seleccion)} nuevos. Añada ciudades o suba max_por_categoria.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
