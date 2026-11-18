#!/bin/bash
cd "$(dirname "$0")"
if python3 prospeccion/buscar_negocios.py; then
  open "leads/$(date +%F).html"
else
  echo "No se ha podido generar la lista. Comprueba que tienes internet."
  read -p "Pulsa Intro para cerrar"
fi
