#!/usr/bin/env bash
# ==============================================================================
# CMS 1-Minute Auto-Update Cron Script
# Checks Docker image digests and applies updates with zero unnecessary downtime.
# ==============================================================================

set -eo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

LOG_FILE="${PROJECT_DIR}/logs/update.log"
mkdir -p "${PROJECT_DIR}/logs"

log() {
  local timestamp
  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$timestamp] $*" | tee -a "$LOG_FILE"
}

# 1. Load project environment
if [ -f ".env" ]; then
  # Safely export non-comment lines
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  log "ERROR: .env file not found in $PROJECT_DIR"
  exit 1
fi

FORCE_UPDATE=0
if [ "${1:-}" = "--force" ] || [ "${1:-}" = "-f" ]; then
  FORCE_UPDATE=1
fi

# 2. Check if auto-update is enabled
if [ "$FORCE_UPDATE" -eq 0 ]; then
  case "${AUTO_UPDATE:-true}" in
    true|1|yes|TRUE|YES)
      ;;
    *)
      # Auto-update disabled in .env; exit silently
      exit 0
      ;;
  esac
fi

# 3. Capture current container image IDs
OLD_API_ID="$(docker compose images -q api 2>/dev/null || true)"
OLD_ADMIN_ID="$(docker compose images -q admin 2>/dev/null || true)"

# 4. Pull latest image manifests
if ! docker compose pull -q api admin >/dev/null 2>&1; then
  log "WARNING: docker compose pull failed (network or registry unreachable)."
  exit 0
fi

# 5. Capture new image IDs
NEW_API_ID="$(docker compose images -q api 2>/dev/null || true)"
NEW_ADMIN_ID="$(docker compose images -q admin 2>/dev/null || true)"

# 6. Apply update if image IDs changed or update was forced
if [ "$FORCE_UPDATE" -eq 1 ] || [ "$OLD_API_ID" != "$NEW_API_ID" ] || [ "$OLD_ADMIN_ID" != "$NEW_ADMIN_ID" ]; then
  log "Update detected (API: $OLD_API_ID -> $NEW_API_ID, Admin: $OLD_ADMIN_ID -> $NEW_ADMIN_ID). Restarting..."
  docker compose up -d --remove-orphans
  docker image prune -f >/dev/null 2>&1 || true
  log "Services updated and restarted successfully."
fi
