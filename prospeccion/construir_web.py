#!/usr/bin/env python3
"""Genera index.html (la web del iPad) a partir de web/app.html, config.json y la plantilla del prompt."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
import buscar_negocios as b

raiz = b.RAIZ
datos = {
    "config": json.loads((raiz / "config.json").read_text(encoding="utf-8")),
    "categorias": [[k, v, nom, g] for (k, v), (nom, g) in b.CATEGORIAS.items()],
    "grupos": b.GRUPOS,
    "plantilla": b.PLANTILLA_PROMPT.read_text(encoding="utf-8").split("<!-- INICIO PROMPT -->", 1)[-1].strip(),
}
html = (raiz / "web" / "app.html").read_text(encoding="utf-8")
html = html.replace("/*__DATOS__*/null", json.dumps(datos, ensure_ascii=False).replace("</", "<\\/"))
(raiz / "index.html").write_text(html, encoding="utf-8")
(raiz / ".nojekyll").write_text("")
print("index.html generado")
