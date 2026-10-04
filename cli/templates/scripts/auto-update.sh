#!/usr/bin/env bash
# ==============================================================================
# CMS 1-Minute Auto-Update Cron Script with Safe Healthcheck & Rollback
# Performs automated pre-update backups, validates health, and rolls back on failure.
# ==============================================================================

set -eo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

LOG_FILE="${PROJECT_DIR}/logs/update.log"
mkdir -p "${PROJECT_DIR}/logs"
mkdir -p "${PROJECT_DIR}/backups"

log() {
	local timestamp
	timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
	echo "[$timestamp] $*" | tee -a "$LOG_FILE"
}

# 1. Load project environment
if [ -f ".env" ]; then
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
	true | 1 | yes | TRUE | YES) ;;

	*)
		# Auto-update disabled in .env; exit silently
		exit 0
		;;
	esac
fi

TAG="${CMS_TAG:-latest}"
API_IMAGE="kaan/cms-api:${TAG}"
ADMIN_IMAGE="kaan/cms-admin:${TAG}"

# 3. Capture current container image IDs
OLD_API_ID="$(docker compose images -q api 2>/dev/null || true)"
OLD_ADMIN_ID="$(docker compose images -q admin 2>/dev/null || true)"

# 4. Pull new image manifests for configured CMS_TAG
if ! docker compose pull -q api admin >/dev/null 2>&1; then
	log "WARNING: docker compose pull failed (network or registry unreachable)."
	exit 0
fi

# 5. Capture new image IDs
NEW_API_ID="$(docker compose images -q api 2>/dev/null || true)"
NEW_ADMIN_ID="$(docker compose images -q admin 2>/dev/null || true)"

# 6. Apply update if image IDs changed or update was forced
if [ "$FORCE_UPDATE" -eq 1 ] || [ "$OLD_API_ID" != "$NEW_API_ID" ] || [ "$OLD_ADMIN_ID" != "$NEW_ADMIN_ID" ]; then
	log "Update detected for tag ${TAG} (API: $OLD_API_ID -> $NEW_API_ID, Admin: $OLD_ADMIN_ID -> $NEW_ADMIN_ID)."

	# 6a. Take automated database backup before applying update
	BACKUP_TS="$(date +%Y%m%d-%H%M%S)"
	BACKUP_FILE="${PROJECT_DIR}/backups/pre-upgrade-${BACKUP_TS}.archive"
	if docker compose ps -q mongo >/dev/null 2>&1 && [ -n "$(docker compose ps -q mongo 2>/dev/null)" ]; then
		log "Creating pre-upgrade database backup at $BACKUP_FILE..."
		if docker compose exec -T mongo mongodump --archive >"$BACKUP_FILE" 2>/dev/null; then
			cp "$BACKUP_FILE" "${PROJECT_DIR}/backups/backup-latest.archive" 2>/dev/null || true
			log "Database backup saved successfully."
		else
			log "WARNING: Database backup failed; proceeding with caution."
		fi
	fi

	# 6b. Restart services with new images
	log "Applying updates and restarting containers..."
	docker compose up -d --remove-orphans

	# 6c. Health check loop (30 seconds maximum)
	API_PORT="${API_PORT:-3001}"
	HEALTH_URL="http://127.0.0.1:${API_PORT}/health"
	HEALTHY=0
	MAX_RETRIES=15
	RETRY_INTERVAL=2

	log "Verifying service health at ${HEALTH_URL}..."
	for ((i = 1; i <= MAX_RETRIES; i++)); do
		sleep "$RETRY_INTERVAL"
		HTTP_STATUS="$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || true)"
		if [ "$HTTP_STATUS" = "200" ]; then
			HEALTHY=1
			break
		fi
		log "Health check attempt $i/$MAX_RETRIES returned HTTP $HTTP_STATUS, waiting..."
	done

	# 6d. Rollback if health check failed
	if [ "$HEALTHY" -ne 1 ]; then
		log "ERROR: Health check failed after 30 seconds! Initiating automatic rollback..."
		if [ -n "$OLD_API_ID" ] && [ -n "$OLD_ADMIN_ID" ]; then
			log "Re-tagging previous image digests (API: $OLD_API_ID, Admin: $OLD_ADMIN_ID)..."
			docker tag "$OLD_API_ID" "$API_IMAGE" 2>/dev/null || true
			docker tag "$OLD_ADMIN_ID" "$ADMIN_IMAGE" 2>/dev/null || true
			docker compose up -d --remove-orphans
			log "Rollback completed. Restored containers to previous image state."
		else
			log "ERROR: Previous image IDs unavailable; cannot rollback automatically."
		fi
		exit 1
	fi

	# 6e. Successful deployment hygiene
	docker image prune -f >/dev/null 2>&1 || true
	log "Services updated, verified healthy (HTTP 200), and running successfully."
fi
