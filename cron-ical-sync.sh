#!/usr/bin/env bash
# ============================================================================
# cron-ical-sync.sh — Dispara la sincronización iCal (CU-27)
# CONSTRUESCALA Hospitality
# ----------------------------------------------------------------------------
# Pega a POST /api/v1/ical/sync con la cabecera x-cron-secret. Lee el secreto
# del .env del backend para NO exponerlo en la línea de comando del cron de
# Hostinger (que es visible en hPanel y en la lista de procesos).
#
# Uso en Hostinger (hPanel > Cron Jobs), comando a ejecutar:
#   /bin/bash /home/uXXXXXXXXX/domains/TU-DOMINIO/cron-ical-sync.sh
#
# Ajusta las dos rutas de abajo a tu instalación.
# ============================================================================
set -euo pipefail

# --- Configura estas dos rutas ---------------------------------------------
# Ruta al .env del backend (donde vive CRON_SECRET).
ENV_FILE="/home/uXXXXXXXXX/domains/TU-DOMINIO/backend/.env"
# URL base pública de la API.
BASE_URL="https://TU-DOMINIO"
# ---------------------------------------------------------------------------

LOG_FILE="${LOG_FILE:-/tmp/ical-sync.log}"
LOCK_FILE="${LOCK_FILE:-/tmp/ical-sync.lock}"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG_FILE"; }

# Evita solapamiento si un sync tarda más que el intervalo del cron.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Otra ejecución en curso; se omite."
  exit 0
fi

if [ ! -f "$ENV_FILE" ]; then
  log "ERROR: no existe $ENV_FILE"
  exit 1
fi

# Extrae CRON_SECRET del .env sin volcar el resto del archivo al entorno.
CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r\"'"'"' ')"
if [ -z "${CRON_SECRET:-}" ]; then
  log "ERROR: CRON_SECRET no está definido en $ENV_FILE"
  exit 1
fi

# -f: falla en HTTP >=400; -s: silencioso; --max-time: no colgarse.
HTTP_BODY="$(curl -fsS --max-time 120 -X POST "$BASE_URL/api/v1/ical/sync" \
  -H "x-cron-secret: $CRON_SECRET" 2>>"$LOG_FILE")" || {
    log "ERROR: la petición a /ical/sync falló (ver arriba)."
    exit 1
  }

log "OK: $HTTP_BODY"
exit 0
