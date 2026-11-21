"""Prueba real contra Overpass: cuántos negocios quedan tras cada filtro, por ciudad."""
import json, sys, time, urllib.parse, urllib.request, datetime as dt
sys.path.insert(0, "prospeccion")
import buscar_negocios as b

cfg = json.load(open("config.json"))
ciudades = [c for c in cfg["ciudades"] if (c if isinstance(c, str) else c["etiqueta"]) in
            ("Gavà", "Castelldefels", "Sabadell", "Sarrià-Sant Gervasi", "El Prat de Llobregat", "Girona")]
for srv in b.SERVIDORES_OVERPASS[:2]:  # prueba de velocidad con búsqueda por nombre exacto
    for c in ciudades[:2]:
        z = b.zona(c)
        q = b.construir_consulta(c, "8")
        t0 = time.time()
        try:
            req = urllib.request.Request(srv, data=urllib.parse.urlencode({"data": q}).encode(),
                                         headers={"User-Agent": "diagnostico-leads/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                osm = json.loads(r.read())
            print(f"{srv} {z['etiqueta']}: OK {time.time()-t0:.0f}s, {len(osm.get('elements', []))} elementos, remark={osm.get('remark','')[:200]}")
        except Exception as e:
            print(f"{srv} {z['etiqueta']}: ERROR {time.time()-t0:.0f}s {e!r}")
        time.sleep(3)

print("--- Detalle por ciudad (servidor principal) ---")
for c in ciudades:
    z = b.zona(c)
    try:
        osm = b.descargar_overpass(b.construir_consulta(c, "8"))
    except Exception as e:
        print(z["etiqueta"], "ERROR", e); continue
    els = osm.get("elements", [])
    con_cat = [e for e in els if b.categoria_de(e.get("tags", {}))]
    con_tel_any = [e for e in con_cat if any(k in e.get("tags", {}) for k in ("phone", "contact:phone", "mobile", "contact:mobile"))]
    b.SOLO_MOVIL = False
    con_tel_valido = [e for e in con_cat if b.normalizar_telefonos(e["tags"])]
    b.SOLO_MOVIL = True
    con_movil = [e for e in con_cat if b.normalizar_telefonos(e["tags"])]
    anio = dt.date.today().year
    recientes = [e for e in con_movil if (b.fecha_dato(e) or "0")[:4] >= str(anio - 5)]
    hasta10 = [e for e in con_movil if (b.fecha_dato(e) or "0")[:4] >= str(anio - 10)]
    ejemplos = [e["tags"].get("phone") or e["tags"].get("contact:phone") for e in con_tel_any[:6]]
    print(f"{z['etiqueta']}: total={len(els)} categoria={len(con_cat)} con_tel={len(con_tel_any)} tel_valido={len(con_tel_valido)} "
          f"movil={len(con_movil)} movil<=5a={len(recientes)} movil<=10a={len(hasta10)} ejemplos_tel={ejemplos}")
    time.sleep(3)
