#!/bin/bash
# Publica AR Incidencias en Netlify (producción). Ver docs/DESPLIEGUE.md.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_ID="${NETLIFY_SITE_ID:-c13ededb-8527-437c-9c33-a6cc541c4a9d}"
REF="${SUPABASE_PROJECT_REF:-zjuylyqqdtjaupzyqdvl}"
NETLIFY="${NETLIFY_BIN:-npx -y netlify-cli@27.20.1}"
ANON=$(curl -fsS -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:-proxy-injected}" "https://api.supabase.com/v1/projects/$REF/api-keys?reveal=true" \
  | python3 -c "import sys,json; print([k['api_key'] for k in json.load(sys.stdin) if k['name']=='anon'][0])")
# La configuración local (.env.local) no debe entrar en la compilación de producción
[ -f .env.local ] && mv .env.local .env.local.desplegando
trap '[ -f .env.local.desplegando ] && mv .env.local.desplegando .env.local' EXIT
rm -rf .next .netlify/static .netlify/functions-internal .netlify/edge-functions .netlify/edge-functions-dist
export NODE_USE_ENV_PROXY=1
NEXT_PUBLIC_SUPABASE_URL="https://$REF.supabase.co" NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON" \
NEXT_PUBLIC_SITE_URL="https://ar-incidencias.netlify.app" $NETLIFY build --offline --context production
if grep -rqs "127.0.0.1:54321" .next/static; then echo "La compilación contiene la URL local. Se cancela." >&2; exit 1; fi
NETLIFY_AUTH_TOKEN="${NETLIFY_AUTH_TOKEN:-proxy-injected}" $NETLIFY deploy --prod --no-build --dir .netlify/static \
  --site "$SITE_ID" --message "${1:-Actualización}"
