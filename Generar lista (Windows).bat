@echo off
cd /d "%~dp0"
python prospeccion\buscar_negocios.py
if errorlevel 1 (
  echo.
  echo No se ha podido generar la lista. Comprueba que Python esta instalado y que tienes internet.
  pause
  exit /b
)
for /f %%i in ('python -c "import datetime;print(datetime.date.today())"') do set HOY=%%i
start "" "leads\%HOY%.html"
